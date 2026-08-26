//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from 'node:child_process'
import {
  accessSync,
  chmodSync,
  closeSync,
  constants as fsConstants,
  lstatSync,
  readdirSync,
  realpathSync,
  rmSync,
  unlinkSync,
} from 'node:fs'

import {
  COMMIT_PATTERN,
  GARDENERLESS_COMMIT,
  GARDENERLESS_REPOSITORY,
  assertManagedPrerequisiteDirectories,
  assertSafeDirectory,
  assertSafeFile,
  assertSafeManagedRoot,
  assertSetupTargetsAvailable,
  ensureManagedChildDirectory,
  fail,
  gitEnvironment,
  isolatedSetupGitEnvironment,
  pathEntryExists,
  sanitizedGardenerlessEnvironment,
} from './configuration.mjs'
import {
  assessTrackedState,
  openLogFile,
  readState,
  runForeground,
  runTimedPhase,
  tailFile,
} from './runtime.mjs'

const GARDENERLESS_PIN_REF = 'refs/local-dashboard/gardenerless-pin'
const KCP_RELEASE_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+$/
const MAX_VERIFY_OUTPUT = 64 * 1024
const MAX_DIAGNOSTIC_LENGTH = 4096

function boundedDiagnostic (value) {
  const text = typeof value === 'string' ? value.trimEnd() : ''
  return text.slice(-MAX_DIAGNOSTIC_LENGTH)
}

function commandOutput (command, arguments_, { cwd, env } = {}) {
  const result = spawnSync(command, arguments_, {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })
  if (result.error) {
    fail(`${command} could not be run: ${result.error.message}`)
  }
  if (result.status !== 0) {
    const detail = boundedDiagnostic(result.stderr) || boundedDiagnostic(result.stdout) ||
      `exit code ${result.status}`
    fail(`${command} ${arguments_.join(' ')} failed: ${detail}`)
  }
  return result.stdout.trim()
}

function gitOutput (checkoutDir, ...arguments_) {
  return commandOutput('git', ['-C', checkoutDir, ...arguments_], {
    env: gitEnvironment(),
  })
}

function inspectCheckout (directory, label) {
  assertSafeDirectory(directory, label)
  assertSafeDirectory(`${directory}/.git`, `${label} Git directory`)
  const worktreeRoot = gitOutput(directory, 'rev-parse', '--show-toplevel')
  if (realpathSync(worktreeRoot) !== directory) {
    fail(`${label} is not a Git worktree root: ${directory}`)
  }
  const unexpected = gitOutput(
    directory,
    'status',
    '--porcelain=v1',
    '--untracked-files=normal',
  ).split('\n').filter(Boolean)
  if (unexpected.length) {
    fail(`${label} is dirty or contains unknown files:\n${unexpected.join('\n')}`)
  }
  const head = gitOutput(directory, 'rev-parse', '--verify', 'HEAD^{commit}')
  if (!COMMIT_PATTERN.test(head)) {
    fail(`${label} did not resolve a valid Git commit`)
  }
  return { head }
}

function assertExpectedCommit (actual, expected, label) {
  if (actual !== expected) {
    fail(`${label} resolved unexpected commit ${actual}; expected pinned commit ${expected}`)
  }
}

export function inspectGardenerlessCheckout (configuration, { requireCurrent = true } = {}) {
  const details = inspectCheckout(configuration.checkoutDir, 'gardenerless checkout')
  const executable = `${configuration.checkoutDir}/gardenerless-setup.sh`
  assertSafeFile(executable, 'gardenerless executable')
  try {
    accessSync(executable, fsConstants.X_OK)
  } catch {
    fail(`gardenerless executable is not executable: ${executable}`)
  }
  if (requireCurrent) {
    assertExpectedCommit(details.head, GARDENERLESS_COMMIT, 'gardenerless checkout')
  }
  return details
}

export function parseKcpVerification (stdout) {
  if (typeof stdout !== 'string') {
    fail('gardenerless verify-kcp returned non-text output')
  }
  let result
  try {
    result = JSON.parse(stdout.replace(/\s+$/u, ''))
  } catch {
    fail('gardenerless verify-kcp returned malformed JSON')
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    fail('gardenerless verify-kcp returned an unexpected result shape')
  }
  const keys = Object.keys(result).sort()
  if (keys.join(',') !== 'commit,release,schemaVersion') {
    fail('gardenerless verify-kcp returned an unexpected result shape')
  }
  if (result.schemaVersion !== 1) {
    fail(`gardenerless verify-kcp returned unsupported schema version ${result.schemaVersion}`)
  }
  if (!KCP_RELEASE_PATTERN.test(result.release)) {
    fail(`gardenerless verify-kcp returned invalid release '${result.release}'`)
  }
  if (!COMMIT_PATTERN.test(result.commit)) {
    fail(`gardenerless verify-kcp returned invalid commit '${result.commit}'`)
  }
  return { release: result.release, commit: result.commit }
}

export function verifyKcp (configuration, { execute = spawnSync } = {}) {
  const executable = `${configuration.checkoutDir}/gardenerless-setup.sh`
  const result = execute(executable, ['verify-kcp', '--format=json'], {
    cwd: configuration.checkoutDir,
    env: sanitizedGardenerlessEnvironment(configuration),
    encoding: 'utf8',
    maxBuffer: MAX_VERIFY_OUTPUT,
  })
  if (result.error || result.status !== 0) {
    const detail = boundedDiagnostic(result.stderr) || result.error?.message ||
      `exit code ${result.status}`
    fail(`gardenerless verify-kcp failed: ${detail}`)
  }
  return parseKcpVerification(result.stdout)
}

export function inspectPrerequisites (configuration, {
  inspect = inspectGardenerlessCheckout,
  verify = verifyKcp,
} = {}) {
  assertManagedPrerequisiteDirectories(configuration)
  const gardenerless = inspect(configuration)
  const kcp = verify(configuration)
  return {
    gardenerless: gardenerless.head,
    kcp: kcp.commit,
    kcpRelease: kcp.release,
  }
}

function makeManagedTreeRemovable (directory) {
  const stat = lstatSync(directory)
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    return
  }
  chmodSync(directory, stat.mode | 0o700)
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      makeManagedTreeRemovable(`${directory}/${entry.name}`)
    }
  }
}

function removeManagedPrerequisite (configuration, target, remove) {
  if (![configuration.checkoutDir, configuration.runtimeDir, configuration.goModCacheDir]
    .includes(target)) {
    fail(`refusing to reset path outside managed prerequisites: ${target}`)
  }
  if (!pathEntryExists(target)) {
    return
  }
  const stat = lstatSync(target)
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    unlinkSync(target)
    return
  }
  if (realpathSync(target) !== target) {
    fail(`refusing to reset non-canonical managed prerequisite: ${target}`)
  }
  try {
    makeManagedTreeRemovable(target)
    remove(target, { force: true, maxRetries: 5, recursive: true, retryDelay: 100 })
  } catch (error) {
    fail(`could not reset managed prerequisite at ${target}: ${error.message}`)
  }
}

export function resetManagedPrerequisites (configuration, { remove = rmSync } = {}) {
  assertSetupTargetsAvailable(configuration, { reset: true })
  assertSafeManagedRoot(configuration.managedRoot)
  removeManagedPrerequisite(configuration, configuration.checkoutDir, remove)
  removeManagedPrerequisite(configuration, configuration.runtimeDir, remove)
  removeManagedPrerequisite(configuration, configuration.goModCacheDir, remove)
}

async function fetchPinnedCommit (directory, repository, commit, environment, stdio) {
  await runForeground('git', [
    '-C', directory, 'fetch', '--no-tags', repository, `+${commit}:${GARDENERLESS_PIN_REF}`,
  ], { env: environment, stdio })
}

export async function clonePinnedCheckout (repository, commit, target, {
  cwd,
  env = process.env,
  stdio,
} = {}) {
  const environment = gitEnvironment(env)
  await runForeground('git', ['init', '--initial-branch', 'main', target], {
    cwd,
    env: environment,
    stdio,
  })
  await fetchPinnedCommit(target, repository, commit, environment, stdio)
  await runForeground('git', ['-C', target, 'checkout', '--detach', GARDENERLESS_PIN_REF], {
    env: environment,
    stdio,
  })
}

async function convergeGardenerlessCheckout (configuration, environment, stdio) {
  const existed = pathEntryExists(configuration.checkoutDir)
  const previous = existed
    ? inspectCheckout(configuration.checkoutDir, 'gardenerless checkout')
    : undefined
  if (existed) {
    await fetchPinnedCommit(
      configuration.checkoutDir,
      GARDENERLESS_REPOSITORY,
      GARDENERLESS_COMMIT,
      environment,
      stdio,
    )
  } else {
    await clonePinnedCheckout(
      GARDENERLESS_REPOSITORY,
      GARDENERLESS_COMMIT,
      configuration.checkoutDir,
      { cwd: configuration.repositoryRoot, env: environment, stdio },
    )
  }
  const fetchedCommit = gitOutput(
    configuration.checkoutDir,
    'rev-parse',
    '--verify',
    `${GARDENERLESS_PIN_REF}^{commit}`,
  )
  assertExpectedCommit(fetchedCommit, GARDENERLESS_COMMIT, 'gardenerless fetched ref')
  await runForeground('git', [
    '-C', configuration.checkoutDir, 'checkout', '--detach', GARDENERLESS_PIN_REF,
  ], { env: environment, stdio })
  const current = inspectGardenerlessCheckout(configuration)
  return { changed: !existed || previous.head !== current.head, ...current }
}

export async function setupKcpRuntime (configuration, environment, stdio, gardenerless, {
  run = runForeground,
  inspect = inspectPrerequisites,
} = {}) {
  const setupEnvironment = isolatedSetupGitEnvironment(
    sanitizedGardenerlessEnvironment(configuration, environment),
  )
  ensureManagedChildDirectory(configuration.goModCacheDir, configuration.managedRoot)
  for (const key of [
    'BUILDFLAGS',
    'GO111MODULE',
    'GOAUTH',
    'GOCACHE',
    'GOENV',
    'GOINSECURE',
    'GONOPROXY',
    'GONOSUMDB',
    'GOPATH',
    'GOPRIVATE',
    'GOPROXY',
    'GOSUMDB',
    'GOTOOLCHAIN',
    'GOVCS',
  ]) {
    delete setupEnvironment[key]
  }
  Object.assign(setupEnvironment, {
    GOAUTH: 'off',
    GOENV: 'off',
    GOFLAGS: '-modcacherw',
    GOMODCACHE: configuration.goModCacheDir,
    GOPROXY: 'https://proxy.golang.org,direct',
    GOSUMDB: 'sum.golang.org',
    GOTOOLCHAIN: 'auto',
    GOWORK: 'off',
  })
  await run(`${configuration.checkoutDir}/gardenerless-setup.sh`, ['setup-kcp'], {
    cwd: configuration.checkoutDir,
    env: setupEnvironment,
    stdio,
  })
  const commits = inspect(configuration, { inspect: () => gardenerless })
  return { rebuilt: true, commits }
}

export async function convergeSetupPrerequisites (configuration, environment, {
  gardenerless = convergeGardenerlessCheckout,
  kcp = setupKcpRuntime,
  phase = runTimedPhase,
} = {}) {
  const descriptor = openLogFile(configuration.setupLogFile, { truncate: true })
  console.log(`setup: converging managed prerequisites; log: ${configuration.setupLogFile}`)
  try {
    const stdio = ['ignore', descriptor, descriptor]
    const checkout = await phase({
      command: 'setup',
      index: 1,
      total: 2,
      label: 'fetching and verifying pinned gardenerless commit',
      completeLabel: 'pinned gardenerless checkout ready',
      action: () => gardenerless(configuration, environment, stdio),
    })
    const runtime = await phase({
      command: 'setup',
      index: 2,
      total: 2,
      label: 'delegating pinned kcp setup to gardenerless',
      completeLabel: 'gardenerless kcp setup and verification complete',
      action: () => kcp(configuration, environment, stdio, checkout),
    })
    return { changed: checkout.changed, ...runtime }
  } catch (error) {
    fail(`${error.message}; log: ${configuration.setupLogFile}\n${tailFile(configuration.setupLogFile)}`)
  } finally {
    closeSync(descriptor)
  }
}

export async function existingTrackedStackForSetup (configuration, {
  reset = false,
  read = readState,
  assess = assessTrackedState,
} = {}) {
  if (!pathEntryExists(configuration.stateFile)) {
    return undefined
  }
  let state
  try {
    state = read(configuration)
  } catch (error) {
    fail(`stale tracked state blocks setup (${error.message}); run 'node hack/local-dashboard.mjs down'`)
  }
  if (await assess(state, configuration) !== 'healthy') {
    fail('stale tracked state blocks setup; run \'node hack/local-dashboard.mjs down\'')
  }
  if (reset) {
    fail('setup --reset refuses while the tracked stack is running; run \'node hack/local-dashboard.mjs down\' first')
  }
  return state
}
