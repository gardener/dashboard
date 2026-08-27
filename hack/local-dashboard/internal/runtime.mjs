//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  spawn,
  spawnSync,
} from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
  closeSync,
  constants as fsConstants,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { createServer } from 'node:net'
import {
  isAbsolute,
  join,
  relative,
} from 'node:path'

import {
  COMMIT_PATTERN,
  FRONTEND_SSL_DIRECTORY,
  MANAGED_ROOT,
  MAX_STATE_BYTES,
  REPOSITORY_ROOT,
  SCENARIOS,
  STATE_VERSION,
  YARN_RUNTIME,
  assertSafeDirectory,
  assertSafeFile,
  assertSafeManagedRoot,
  fail,
  pathEntryExists,
  sanitizedGardenerlessEnvironment,
} from './configuration.mjs'

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

export async function runForeground (
  command,
  arguments_,
  { cwd, env, stdio = 'inherit' } = {},
) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, { cwd, env, stdio })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}`))
      }
    })
  })
}

export function tailFile (filename) {
  try {
    const stat = lstatSync(filename)
    if (!stat.isFile() || stat.isSymbolicLink()) {
      return '(log unavailable)'
    }
    return readFileSync(filename, 'utf8').slice(-4096).split('\n').slice(-20).join('\n')
  } catch {
    return '(log unavailable)'
  }
}

export function openLogFile (filename, { truncate = false } = {}) {
  if (pathEntryExists(filename)) {
    assertSafeFile(filename, 'log')
  }
  return openSync(
    filename,
    fsConstants.O_WRONLY |
      fsConstants.O_CREAT |
      (truncate ? fsConstants.O_TRUNC : fsConstants.O_APPEND) |
      fsConstants.O_NOFOLLOW,
    0o600,
  )
}

export async function runGardenerless (configuration, arguments_, logPath) {
  const setup = join(configuration.checkoutDir, 'gardenerless-setup.sh')
  const descriptor = openLogFile(logPath)
  try {
    await runForeground(setup, arguments_, {
      cwd: configuration.checkoutDir,
      env: sanitizedGardenerlessEnvironment(configuration),
      stdio: ['ignore', descriptor, descriptor],
    })
  } catch (error) {
    fail(`${error.message}; log: ${logPath}\n${tailFile(logPath)}`)
  } finally {
    closeSync(descriptor)
  }
}

export function formatElapsedTime (milliseconds) {
  const totalSeconds = Math.round(Math.max(0, milliseconds) / 1000)
  if (milliseconds < 10_000) {
    return `${(Math.max(0, milliseconds) / 1000).toFixed(1)}s`
  }
  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`
}

export async function runTimedPhase ({
  command,
  index,
  total,
  label,
  completeLabel,
  action,
  now = Date.now,
  log = message => console.error(message),
  progressIntervalMs = 30_000,
  schedule = setInterval,
  cancel = clearInterval,
}) {
  const prefix = `${command}: [${index}/${total}]`
  const startedAt = now()
  log(`${prefix} ${label}`)
  const progress = schedule(() => {
    log(`${prefix} ${label} (${formatElapsedTime(now() - startedAt)} elapsed)`)
  }, progressIntervalMs)
  progress.unref?.()
  try {
    const result = await action()
    log(`${prefix} ${completeLabel} (${formatElapsedTime(now() - startedAt)})`)
    return result
  } finally {
    cancel(progress)
  }
}

export async function reconcileScenario (configuration, logPath, {
  run = runGardenerless,
} = {}) {
  await run(configuration, ['scenario', configuration.scenario], logPath)
}

export function inspectProcess (pid) {
  if (!Number.isInteger(pid) || pid < 1) {
    return undefined
  }
  const result = spawnSync('/bin/ps', ['-ww', '-o', 'pgid=,lstart=,command=', '-p', String(pid)], {
    encoding: 'utf8',
  })
  const match = result.status === 0
    ? /^\s*(\d+)\s+(\S+\s+\S+\s+\d+\s+\S+\s+\d+)\s+(.+)$/.exec(result.stdout.trim())
    : undefined
  return match
    ? { pgid: Number(match[1]), startSignature: match[2], command: match[3] }
    : undefined
}

export function inspectListeningPids (port, execute = spawnSync) {
  const result = execute('lsof', [
    '-nP',
    '-a',
    `-iTCP:${port}`,
    '-sTCP:LISTEN',
    '-Fp',
  ], { encoding: 'utf8' })
  if (result.status !== 0) {
    return []
  }
  return result.stdout
    .split('\n')
    .map(line => /^p(\d+)$/.exec(line)?.[1])
    .filter(Boolean)
    .map(Number)
}

export function inspectProcessCwd (pid, execute = spawnSync) {
  const result = execute('lsof', [
    '-nP',
    '-a',
    '-p',
    String(pid),
    '-d',
    'cwd',
    '-Fn',
  ], { encoding: 'utf8' })
  if (result.status !== 0) {
    return undefined
  }
  return result.stdout
    .split('\n')
    .find(line => line.startsWith('n'))
    ?.slice(1)
}

export function processMatches (record, configuration, inspector = inspectProcess, {
  listeningPids = inspectListeningPids,
  processCwd = inspectProcessCwd,
} = {}) {
  const actual = inspector(record.pid)
  const definition = serviceDefinition(configuration, record.name)
  const exactMatch = Boolean(
    definition?.commandMarker &&
    actual &&
    actual.pgid === record.pgid &&
    actual.startSignature === record.startSignature &&
    actual.command === record.command &&
    actual.command.includes(definition.commandMarker),
  )
  if (exactMatch) {
    return true
  }

  const candidatePids = [record.pid, ...(definition ? listeningPids(definition.ownershipPort) : [])]
  return Boolean(
    definition &&
    [...new Set(candidatePids)].some(pid => {
      const listener = inspector(pid)
      return listener &&
        listener.pgid === record.pgid &&
        (pid !== record.pid || listener.startSignature === record.startSignature) &&
        definition.runtimeCwds.includes(processCwd(pid)) &&
        definition.runtimeCommandMarkers.every(marker => listener.command.includes(marker))
    }),
  )
}

async function captureProcess (pid, commandMarker, inspector = inspectProcess) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const actual = inspector(pid)
    if (actual?.pgid === pid && actual.command.includes(commandMarker)) {
      return {
        pid,
        pgid: actual.pgid,
        startSignature: actual.startSignature,
        command: actual.command,
      }
    }
    await delay(50)
  }
  fail(`child ${pid} exited before its process identity could be validated`)
}

export async function portIsAvailable (port, host = '127.0.0.1') {
  return await new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.once('error', error => {
      if (['EADDRINUSE', 'EACCES'].includes(error.code)) {
        resolve(false)
      } else {
        reject(error)
      }
    })
    server.listen({ port, host, exclusive: true }, () => {
      server.close(() => resolve(true))
    })
  })
}

export async function assertPortsAvailable (ports, probe = portIsAvailable) {
  for (const [name, port] of Object.entries(ports)) {
    if (!await probe(port)) {
      fail(`port ${port} (${name}) has an unknown listener; it will not be stopped or replaced`)
    }
  }
}

export function requestReady (
  url,
  caPath,
  client = url.startsWith('https:') ? https : http,
) {
  return new Promise(resolve => {
    let ca
    try {
      if (caPath) {
        assertSafeFile(caPath, 'readiness certificate')
        ca = readFileSync(caPath)
      }
    } catch {
      resolve(false)
      return
    }
    const request = client.get(url, {
      ca,
      timeout: 1500,
    }, response => {
      response.resume()
      resolve(response.statusCode >= 200 && response.statusCode < 400)
    })
    request.once('timeout', () => {
      resolve(false)
      request.destroy()
    })
    request.once('error', () => resolve(false))
    request.once('close', () => resolve(false))
  })
}

export async function waitUntilReady ({
  label,
  record,
  configuration,
  health,
  logPath,
  timeoutMs = 20_000,
  intervalMs = 200,
  inspector = inspectProcess,
}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!processMatches(record, configuration, inspector)) {
      fail(`${label} exited during startup; log: ${logPath}\n${tailFile(logPath)}`)
    }
    if (await health()) {
      return
    }
    await delay(intervalMs)
  }
  fail(`${label} readiness timed out; log: ${logPath}\n${tailFile(logPath)}`)
}

export function serviceDefinitions (configuration) {
  return [
    {
      name: 'garden',
      command: join(configuration.checkoutDir, 'gardenerless-setup.sh'),
      arguments: ['start-kcp'],
      commandMarker: `${join(configuration.runtimeDir, 'bin', 'kcp')} start --bind-address=127.0.0.1`,
      cwd: configuration.checkoutDir,
      ownershipPort: configuration.ports.garden,
      ports: [configuration.ports.garden],
      caPath: join(configuration.runtimeDir, '.kcp', 'apiserver.crt'),
      runtimeCwds: [configuration.checkoutDir, configuration.runtimeDir],
      runtimeCommandMarkers: [
        join(configuration.runtimeDir, 'bin', 'kcp'),
        'start',
        '--bind-address=127.0.0.1',
      ],
    },
    {
      name: 'backend',
      command: process.execPath,
      arguments: [YARN_RUNTIME, 'workspace', '@gardener-dashboard/backend', 'serve'],
      commandMarker: `${YARN_RUNTIME} workspace @gardener-dashboard/backend serve`,
      cwd: configuration.repositoryRoot,
      ownershipPort: configuration.ports.backend,
      ports: [configuration.ports.backend, configuration.ports.metrics],
      runtimeCwds: [join(configuration.repositoryRoot, 'backend')],
      runtimeCommandMarkers: ['node', 'server.js'],
    },
    {
      name: 'frontend',
      command: process.execPath,
      arguments: [
        YARN_RUNTIME,
        'workspace',
        '@gardener-dashboard/frontend',
        'serve',
        '--port',
        String(configuration.ports.frontend),
        '--host',
        '127.0.0.1',
      ],
      commandMarker: `${YARN_RUNTIME} workspace @gardener-dashboard/frontend serve --port ${configuration.ports.frontend} --host 127.0.0.1`,
      cwd: configuration.repositoryRoot,
      ownershipPort: configuration.ports.frontend,
      ports: [configuration.ports.frontend],
      caPath: join(FRONTEND_SSL_DIRECTORY, 'ca.pem'),
      runtimeCwds: [join(configuration.repositoryRoot, 'frontend')],
      runtimeCommandMarkers: [
        'vite',
        `--port ${configuration.ports.frontend}`,
        '--host 127.0.0.1',
      ],
    },
  ]
}

function serviceDefinition (configuration, name) {
  return serviceDefinitions(configuration).find(definition => definition.name === name)
}

export function serializeState (state) {
  return `${JSON.stringify(state, null, 2)}\n`
}

function hasExactKeys (value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...keys].sort().join(',')
}

export function validateState (state, configuration = {
  repositoryRoot: REPOSITORY_ROOT,
  managedRoot: MANAGED_ROOT,
  checkoutDir: join(MANAGED_ROOT, 'gardenerless'),
  runtimeDir: join(MANAGED_ROOT, 'runtime'),
  ports: { frontend: 8444 },
}) {
  const stateKeys = ['version', 'status', 'scenario', 'commits', 'logDir', 'processes']
  if (!state || state.version !== STATE_VERSION ||
      !['starting', 'ready'].includes(state.status) ||
      !hasExactKeys(state, stateKeys) ||
      !SCENARIOS.includes(state.scenario) ||
      !hasExactKeys(state.commits, ['gardenerless', 'kcp', 'kcpRelease']) ||
      !COMMIT_PATTERN.test(state.commits.gardenerless) ||
      !COMMIT_PATTERN.test(state.commits.kcp) ||
      !/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(state.commits.kcpRelease) ||
      !Array.isArray(state.processes) ||
      state.processes.length > 3) {
    fail('tracked state has an invalid structure')
  }
  const relativeLogDir = relative(configuration.managedRoot, state.logDir || '')
  if (!state.logDir || relativeLogDir.startsWith('..') || isAbsolute(relativeLogDir)) {
    fail('tracked state contains an unsafe log directory')
  }
  const expectedNames = ['garden', 'backend', 'frontend']
  const seenPids = new Set()
  const seenPgids = new Set()
  for (const [index, record] of state.processes.entries()) {
    const definition = serviceDefinition(configuration, record.name)
    const expectedMarker = definition?.commandMarker
    const relativeLog = relative(state.logDir, record.logPath || '')
    if (!hasExactKeys(record, ['name', 'pid', 'pgid', 'startSignature', 'command', 'logPath']) ||
        !definition || record.name !== expectedNames[index] ||
        !Number.isInteger(record.pid) || !Number.isInteger(record.pgid) ||
        record.pid !== record.pgid || seenPids.has(record.pid) || seenPgids.has(record.pgid) ||
        typeof record.startSignature !== 'string' ||
        !record.startSignature || typeof record.command !== 'string' ||
        !record.command.includes(expectedMarker) ||
        relativeLog.startsWith('..') || isAbsolute(relativeLog)) {
      fail('tracked state contains an invalid process identity')
    }
    seenPids.add(record.pid)
    seenPgids.add(record.pgid)
  }
  if (state.status === 'ready' && state.processes.length !== 3) {
    fail('ready state must describe exactly three processes')
  }
  return state
}

export function parseState (text, configuration) {
  if (Buffer.byteLength(text) > MAX_STATE_BYTES) {
    fail('tracked state is too large')
  }
  let state
  try {
    state = JSON.parse(text)
  } catch {
    fail('tracked state is not valid JSON')
  }
  return validateState(state, configuration)
}

export function writeState (state, configuration) {
  assertSafeManagedRoot(configuration.managedRoot)
  if (pathEntryExists(configuration.stateFile)) {
    assertSafeFile(configuration.stateFile, 'tracked state')
  }
  const temporary = `${configuration.stateFile}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  writeFileSync(temporary, serializeState(state), { mode: 0o600, flag: 'wx' })
  renameSync(temporary, configuration.stateFile)
}

export function readState (configuration) {
  assertSafeDirectory(configuration.managedRoot, 'managed directory')
  assertSafeFile(configuration.stateFile, 'tracked state')
  return parseState(
    readFileSync(configuration.stateFile, 'utf8'),
    configuration,
  )
}

export async function assessTrackedState (state, configuration, {
  inspector = inspectProcess,
  request = requestReady,
  commits,
  compareScenario = true,
} = {}) {
  if (state.status !== 'ready' ||
      state.processes.some(record => !processMatches(record, configuration, inspector))) {
    return 'stale'
  }
  if (commits && ((compareScenario && state.scenario !== configuration.scenario) ||
      state.commits.gardenerless !== commits.gardenerless ||
      state.commits.kcp !== commits.kcp ||
      state.commits.kcpRelease !== commits.kcpRelease)) {
    return 'configuration-mismatch'
  }
  const [garden, , frontend] = serviceDefinitions(configuration)
  const [gardenReady, backendReady, frontendReady] = await Promise.all([
    request(`${configuration.urls.garden}/readyz`, garden.caPath),
    request(`${configuration.urls.backend}/healthz`),
    request(`${configuration.urls.frontend}/`, frontend.caPath),
  ])
  return gardenReady && backendReady && frontendReady ? 'healthy' : 'stale'
}

function groupExists (pgid) {
  try {
    process.kill(-pgid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

async function waitForGroupExit (pgid, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!groupExists(pgid)) {
      return true
    }
    await delay(100)
  }
  return !groupExists(pgid)
}

function signalTrackedGroup (signalGroup, pgid, signal) {
  try {
    signalGroup(pgid, signal)
  } catch (error) {
    if (error.code !== 'ESRCH') {
      throw error
    }
  }
}

export async function stopTrackedProcesses (state, configuration, {
  inspector = inspectProcess,
  matcher = processMatches,
  probe = portIsAvailable,
  groupPresent = groupExists,
  signalGroup = (pgid, signal) => process.kill(-pgid, signal),
  waitGroup = waitForGroupExit,
} = {}) {
  const stopped = []
  const preserved = []
  for (const record of [...state.processes].reverse()) {
    if (!matcher(record, configuration, inspector)) {
      const definition = serviceDefinition(configuration, record.name)
      const portsAreFree = (await Promise.all(definition.ports.map(port => probe(port))))
        .every(Boolean)
      if (!groupPresent(record.pgid) && portsAreFree) {
        stopped.push(record.name)
        continue
      }
      preserved.push(record.name)
      continue
    }
    signalTrackedGroup(signalGroup, record.pgid, 'SIGTERM')
    if (!await waitGroup(record.pgid, 5_000)) {
      if (!matcher(record, configuration, inspector)) {
        preserved.push(record.name)
        continue
      }
      signalTrackedGroup(signalGroup, record.pgid, 'SIGKILL')
      if (!await waitGroup(record.pgid, 2_000)) {
        fail(`${record.name} process group ${record.pgid} did not stop`)
      }
    }
    stopped.push(record.name)
  }
  return { stopped, preserved }
}

function detachedService (name, command, arguments_, { cwd, env, logPath }) {
  const descriptor = openLogFile(logPath)
  try {
    const child = spawn(command, arguments_, {
      cwd,
      env,
      detached: true,
      stdio: ['ignore', descriptor, descriptor],
    })
    child.on('error', () => {})
    child.unref()
    return { name, pid: child.pid }
  } finally {
    closeSync(descriptor)
  }
}

async function stopSpawnedGroup (pgid) {
  const signalGroup = (pgid, signal) => process.kill(-pgid, signal)
  signalTrackedGroup(signalGroup, pgid, 'SIGTERM')
  if (!await waitForGroupExit(pgid, 5_000)) {
    signalTrackedGroup(signalGroup, pgid, 'SIGKILL')
    if (!await waitForGroupExit(pgid, 2_000)) {
      fail(`spawned process group ${pgid} did not stop`)
    }
  }
}

export async function startAndRecord (state, configuration, definition, {
  spawnService = detachedService,
  capture = captureProcess,
  stop = stopSpawnedGroup,
} = {}) {
  const child = spawnService(
    definition.name,
    definition.command,
    definition.arguments,
    definition,
  )
  let identity
  try {
    identity = await capture(child.pid, definition.commandMarker)
  } catch (error) {
    if (Number.isInteger(child.pid)) {
      await stop(child.pid)
    }
    throw error
  }
  const record = { name: definition.name, ...identity, logPath: definition.logPath }
  state.processes.push(record)
  writeState(state, configuration)
  return record
}

export async function startReadyService (state, configuration, definition) {
  const record = await startAndRecord(state, configuration, definition)
  await waitUntilReady({
    label: definition.name,
    record,
    configuration,
    health: () => requestReady(definition.healthUrl, definition.caPath),
    logPath: definition.logPath,
    timeoutMs: definition.timeoutMs,
  })
  return record
}
