//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0

import {
  mkdirSync,
  unlinkSync,
} from 'node:fs'
import { join } from 'node:path'

import {
  BACKEND_CONFIG,
  STATE_VERSION,
  YARN_RUNTIME,
  assertReusableFrontendCertificates,
  assertSafeDirectory,
  assertSafeFile,
  assertSafeManagedRoot,
  assertSetupTargetsAvailable,
  backendEnvironment,
  ensureManagedChildDirectory,
  fail,
  frontendEnvironment,
  isolatedSetupGitEnvironment,
  parseOptions,
  pathEntryExists,
  resolveConfiguration,
  sanitizedGardenerlessEnvironment,
} from './configuration.mjs'
import {
  convergeSetupPrerequisites,
  existingTrackedStackForSetup,
  inspectPrerequisites,
  resetManagedPrerequisites,
} from './prerequisites.mjs'
import {
  assessTrackedState,
  assertPortsAvailable,
  formatElapsedTime,
  portIsAvailable,
  readState,
  reconcileScenario,
  runForeground,
  runTimedPhase,
  serviceDefinitions,
  startReadyService,
  stopTrackedProcesses,
  writeState,
} from './runtime.mjs'

function printCommits (commits) {
  console.log(`GARDENERLESS_COMMIT=${commits.gardenerless}`)
  console.log(`KCP_COMMIT=${commits.kcp}`)
  console.log(`KCP_RELEASE=${commits.kcpRelease}`)
}

function requirePrerequisites (configuration, inspect) {
  try {
    return inspect(configuration)
  } catch (error) {
    fail(`prerequisites missing; run 'node hack/local-dashboard.mjs setup'\n${error.message}`)
  }
}

async function occupiedPortLabels (configuration, probe = portIsAvailable) {
  const occupied = []
  for (const [name, port] of Object.entries(configuration.ports)) {
    if (!await probe(port)) {
      occupied.push(`${name}:${port}`)
    }
  }
  return occupied
}

export async function commandSetup (configuration, {
  reset = false,
  inspect = inspectPrerequisites,
  existing = existingTrackedStackForSetup,
  converge = convergeSetupPrerequisites,
} = {}) {
  assertSetupTargetsAvailable(configuration, { reset })
  const tracked = await existing(configuration, { reset })
  if (tracked) {
    const commits = inspect(configuration)
    console.log('ready: healthy tracked stack unchanged')
    printCommits(commits)
    return
  }
  await assertPortsAvailable(configuration.ports)
  assertSafeManagedRoot(configuration.managedRoot)
  if (reset) {
    resetManagedPrerequisites(configuration)
  }
  const result = await converge(configuration, isolatedSetupGitEnvironment())
  let mode = 'current'
  if (reset) {
    mode = 'reset'
  } else if (result.changed || result.rebuilt) {
    mode = 'updated'
  }
  console.log(`ready: managed prerequisites ${mode}`)
  console.log(`CHECKOUT_DIR=${configuration.checkoutDir}`)
  console.log(`RUNTIME_DIR=${configuration.runtimeDir}`)
  printCommits(result.commits)
}

export async function commandUp (configuration, { inspect = inspectPrerequisites } = {}) {
  const commits = requirePrerequisites(configuration, inspect)
  assertSafeManagedRoot(configuration.managedRoot)
  assertSafeFile(BACKEND_CONFIG, 'backend isolation configuration')
  assertSafeFile(YARN_RUNTIME, 'repository Yarn runtime')
  const frontendSslDirectory = assertReusableFrontendCertificates()
  if (pathEntryExists(configuration.stateFile)) {
    const tracked = readState(configuration)
    const assessment = await assessTrackedState(tracked, configuration, { commits })
    if (assessment === 'healthy') {
      console.log('READY (healthy tracked stack)')
      console.log(`FRONTEND_URL=${configuration.urls.frontend}`)
      console.log(`LOG_DIR=${tracked.logDir}`)
      printCommits(tracked.commits)
      return
    }
    fail(assessment === 'configuration-mismatch'
      ? 'the tracked stack has different configuration; run \'node hack/local-dashboard.mjs down\' first'
      : 'stale tracked state found; run \'node hack/local-dashboard.mjs down\' before starting')
  }
  await assertPortsAvailable(configuration.ports)
  const logsRoot = join(configuration.managedRoot, 'logs')
  ensureManagedChildDirectory(logsRoot, configuration.managedRoot)
  const logDir = join(logsRoot, `${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${process.pid}`)
  mkdirSync(logDir, { mode: 0o700 })
  const state = {
    version: STATE_VERSION,
    status: 'starting',
    scenario: configuration.scenario,
    commits,
    logDir,
    processes: [],
  }
  writeState(state, configuration)
  const setupLog = join(logDir, 'setup.log')
  const [garden, backend, frontend] = serviceDefinitions(configuration)
  const phases = [
    {
      label: 'starting garden',
      completeLabel: 'garden ready',
      action: () => startReadyService(state, configuration, {
        ...garden,
        env: sanitizedGardenerlessEnvironment(configuration),
        logPath: join(logDir, 'garden.log'),
        healthUrl: `${configuration.urls.garden}/readyz`,
        timeoutMs: 60_000,
      }),
    },
    {
      label: `reconciling demo fixture, CRDs, and scenario '${configuration.scenario}'`,
      completeLabel: 'demo fixture and scenario ready',
      action: async () => {
        await reconcileScenario(configuration, setupLog)
        assertSafeFile(
          join(configuration.runtimeDir, '.kcp', 'dashboard.kubeconfig'),
          'gardenerless dashboard kubeconfig',
        )
      },
    },
    {
      label: 'starting backend',
      completeLabel: 'backend ready',
      action: () => startReadyService(state, configuration, {
        ...backend,
        env: backendEnvironment(configuration),
        logPath: join(logDir, 'backend.log'),
        healthUrl: `${configuration.urls.backend}/healthz`,
      }),
    },
    {
      label: 'starting frontend',
      completeLabel: 'frontend ready',
      action: () => startReadyService(state, configuration, {
        ...frontend,
        env: frontendEnvironment(configuration, frontendSslDirectory),
        logPath: join(logDir, 'frontend.log'),
        healthUrl: `${configuration.urls.frontend}/`,
      }),
    },
  ]
  const startupStartedAt = Date.now()
  try {
    for (const [index, phase] of phases.entries()) {
      await runTimedPhase({ command: 'up', index: index + 1, total: phases.length, ...phase })
    }
    state.status = 'ready'
    writeState(state, configuration)
    console.error(`up: startup complete (${formatElapsedTime(Date.now() - startupStartedAt)} total)`)
    console.log('READY (started)')
    console.log(`FRONTEND_URL=${configuration.urls.frontend}`)
    console.log(`LOG_DIR=${logDir}`)
    printCommits(commits)
  } catch (error) {
    const cleanup = await stopTrackedProcesses(state, configuration)
    const occupied = await occupiedPortLabels(configuration)
    if (!cleanup.preserved.length && !occupied.length && pathEntryExists(configuration.stateFile)) {
      unlinkSync(configuration.stateFile)
    }
    if (cleanup.preserved.length || occupied.length) {
      fail([
        error.message,
        'startup cleanup incomplete; tracked state retained',
        cleanup.preserved.length && `identity mismatches: ${cleanup.preserved.join(', ')}`,
        occupied.length && `listeners: ${occupied.join(', ')}`,
      ].filter(Boolean).join('; '))
    }
    throw error
  }
}

export async function commandDown (configuration, {
  probe = portIsAvailable,
  stop = stopTrackedProcesses,
} = {}) {
  if (!pathEntryExists(configuration.stateFile)) {
    const occupied = await occupiedPortLabels(configuration, probe)
    if (occupied.length) {
      fail(`no tracked stack; unknown listeners remain on ${occupied.join(', ')}`)
    }
    console.log('stopped')
    return
  }
  let state
  try {
    state = readState(configuration)
  } catch (error) {
    assertSafeDirectory(configuration.managedRoot, 'managed directory')
    assertSafeFile(configuration.stateFile, 'tracked state')
    const occupied = await occupiedPortLabels(configuration, probe)
    if (occupied.length) {
      fail(`invalid tracked state retained because listeners remain on ${occupied.join(', ')} (${error.message})`)
    }
    unlinkSync(configuration.stateFile)
    console.log(`stale tracked state removed; no process was signalled (${error.message})`)
    return
  }
  const result = await stop(state, configuration)
  console.log(`stopped groups: ${result.stopped.join(', ') || 'none'}`)
  const occupied = await occupiedPortLabels(configuration, probe)
  if (result.preserved.length || occupied.length) {
    fail([
      'cleanup incomplete; tracked state retained',
      result.preserved.length && `identity mismatches: ${result.preserved.join(', ')}`,
      occupied.length && `listeners: ${occupied.join(', ')}`,
    ].filter(Boolean).join('; '))
  }
  unlinkSync(configuration.stateFile)
  console.log(`logs retained: ${state.logDir}`)
  printCommits(state.commits)
}

export async function commandStatus (configuration, {
  assess = assessTrackedState,
  inspect = inspectPrerequisites,
  probe = portIsAvailable,
} = {}) {
  let commits
  let prerequisiteError
  try {
    commits = inspect(configuration)
  } catch (error) {
    prerequisiteError = error
  }
  if (pathEntryExists(configuration.stateFile)) {
    try {
      const state = readState(configuration)
      const assessment = await assess(state, configuration, {
        commits,
        compareScenario: false,
      })
      console.log({
        healthy: `healthy managed stack (${state.scenario})`,
        'configuration-mismatch': 'tracked stack has different managed configuration',
        stale: 'stale tracked state',
      }[assessment])
      printCommits(state.commits)
    } catch (error) {
      console.log(`stale tracked state (${error.message})`)
    }
  } else {
    const blocked = []
    for (const [name, port] of Object.entries(configuration.ports)) {
      if (!await probe(port)) {
        blocked.push(`${name}:${port}`)
      }
    }
    console.log(blocked.length
      ? `blocked by unknown listener (${blocked.join(', ')})`
      : 'stopped')
    if (commits) {
      printCommits(commits)
    }
  }
  if (prerequisiteError) {
    console.log('prerequisites missing or mismatched')
    console.log(`- ${prerequisiteError.message}`)
  }
}

export async function commandToken (configuration, {
  namespace = 'garden',
  name = 'dashboard-user',
  inspect = inspectPrerequisites,
  run = runForeground,
} = {}) {
  if (!namespace || !name) {
    fail('token namespace and name must not be empty')
  }
  requirePrerequisites(configuration, inspect)
  console.error(`system:serviceaccount:${namespace}:${name}\n`)
  await run(join(configuration.checkoutDir, 'gardenerless-setup.sh'), [
    'get-token',
    '--namespace',
    namespace,
    '--service-account',
    name,
  ], {
    cwd: configuration.checkoutDir,
    env: sanitizedGardenerlessEnvironment(configuration),
    stdio: 'inherit',
  })
}

function usage () {
  return `usage: node hack/local-dashboard.mjs <command> [options]

commands:
  setup [--reset]
  up [--scenario NAME]
  down
  status
  token [--namespace NAMESPACE] [--name NAME]`
}

export async function main (arguments_ = process.argv.slice(2)) {
  const [command, ...rest] = arguments_
  if (!command || command === '--help' || command === '-h') {
    console.log(usage())
    return
  }
  if (!['setup', 'up', 'down', 'status', 'token'].includes(command)) {
    fail(`unknown command: ${command}\n${usage()}`)
  }
  const options = parseOptions(command, rest)
  if (options.help) {
    console.log(usage())
    return
  }
  const configuration = resolveConfiguration({ options })
  await {
    setup: config => commandSetup(config, { reset: Boolean(options.reset) }),
    up: commandUp,
    down: commandDown,
    status: commandStatus,
    token: config => commandToken(config, {
      namespace: options.namespace,
      name: options.name,
    }),
  }[command](configuration)
}
