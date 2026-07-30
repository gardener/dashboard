//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import {
  delimiter,
  join,
} from 'node:path'

import {
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest'

import {
  commandDown,
  commandSetup,
  commandStatus,
  commandToken,
  commandUp,
  main,
} from '../internal/commands.mjs'
import {
  COMMIT_PATTERN,
  GARDENERLESS_COMMIT,
  SCENARIOS,
  STATE_VERSION,
  YARN_RUNTIME,
  assertReusableFrontendCertificates,
  assertSetupTargetsAvailable,
  backendEnvironment,
  frontendEnvironment,
  gitEnvironment,
  isolatedSetupGitEnvironment,
  parseOptions,
  resolveConfiguration,
  sanitizedGardenerlessEnvironment,
  yarnRuntimeFromConfiguration,
} from '../internal/configuration.mjs'
import {
  clonePinnedCheckout,
  convergeSetupPrerequisites,
  inspectGardenerlessCheckout,
  inspectPrerequisites,
  parseKcpVerification,
  resetManagedPrerequisites,
  setupKcpRuntime,
  verifyKcp,
} from '../internal/prerequisites.mjs'
import {
  assessTrackedState,
  assertPortsAvailable,
  formatElapsedTime,
  inspectListeningPids,
  inspectProcessCwd,
  parseState,
  processMatches,
  reconcileScenario,
  runTimedPhase,
  serializeState,
  serviceDefinitions,
  stopTrackedProcesses,
  waitUntilReady,
} from '../internal/runtime.mjs'

const repositoryRoot = '/work/dashboard'
const gardenerlessCommit = 'a'.repeat(40)
const kcpCommit = 'b'.repeat(40)
const commits = {
  gardenerless: gardenerlessCommit,
  kcp: kcpCommit,
  kcpRelease: 'v1.2.3',
}
const codeLoadingEnvironment = Object.fromEntries([
  'BASH_ENV',
  'GIT_EXEC_PATH',
  'GIT_TEMPLATE_DIR',
  'MAKEFILES',
  'MAKEFLAGS',
  'GNUMAKEFLAGS',
  'MFLAGS',
].map(key => [key, `/ambient/${key}`]))
const fixtureGitEnvironment = {
  ...isolatedSetupGitEnvironment(),
  GIT_ALLOW_PROTOCOL: 'file:https',
}

function temporaryDirectory (prefix = 'local-dashboard-') {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), prefix)))
  onTestFinished(() => rmSync(directory, { force: true, recursive: true }))
  return directory
}

function silenceConsole (method = 'log') {
  const spy = vi.spyOn(console, method).mockImplementation(() => {})
  onTestFinished(() => spy.mockRestore())
  return spy
}

function configuration (root = repositoryRoot, options = {}) {
  return resolveConfiguration({ repositoryRoot: root, options })
}

function git (directory, ...arguments_) {
  return execFileSync('git', ['-C', directory, ...arguments_], {
    env: fixtureGitEnvironment,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function createCheckout (directory, executable = 'gardenerless-setup.sh') {
  mkdirSync(directory, { recursive: true })
  execFileSync('git', ['init', '--initial-branch=main', directory], {
    env: fixtureGitEnvironment,
  })
  git(directory, 'config', 'user.email', 'local-dashboard@example.invalid')
  git(directory, 'config', 'user.name', 'Local Dashboard Test')
  git(directory, 'config', 'commit.gpgsign', 'false')
  git(directory, 'config', 'core.hooksPath', '/dev/null')
  const executablePath = join(directory, executable)
  mkdirSync(join(executablePath, '..'), { recursive: true })
  writeFileSync(executablePath, '#!/bin/sh\nexit 0\n')
  chmodSync(executablePath, 0o755)
  git(directory, 'add', executable)
  git(directory, 'commit', '-m', 'fixture')
  return git(directory, 'rev-parse', 'HEAD')
}

function processRecord (config, name, pid) {
  const definition = serviceDefinitions(config).find(item => item.name === name)
  return {
    name,
    pid,
    pgid: pid,
    startSignature: 'Fri Jul 24 10:00:00 2026',
    command: `node ${definition.commandMarker}`,
    logPath: join(config.managedRoot, 'logs', 'run', `${name}.log`),
  }
}

function trackedState (config = configuration(), overrides = {}) {
  return {
    version: STATE_VERSION,
    status: 'ready',
    scenario: config.scenario,
    commits,
    logDir: join(config.managedRoot, 'logs', 'run'),
    processes: [
      processRecord(config, 'garden', 101),
      processRecord(config, 'backend', 102),
      processRecord(config, 'frontend', 103),
    ],
    ...overrides,
  }
}

function matchingInspector (state) {
  return pid => {
    const record = state.processes.find(item => item.pid === pid)
    return record && {
      pgid: record.pgid,
      startSignature: record.startSignature,
      command: record.command,
    }
  }
}

describe('managed configuration and environments', () => {
  it('uses only fixed managed paths, loopback endpoints, and the reviewed pin', () => {
    const config = resolveConfiguration({
      repositoryRoot,
      env: {
        GARDENERLESS_CHECKOUT_DIR: '/ambient/checkout',
        GARDENERLESS_KCP_DIR: '/ambient/runtime',
        VITE_DEV_PORT: '443',
        SCENARIO: 'failing-shoot',
      },
    })
    expect(GARDENERLESS_COMMIT).toMatch(COMMIT_PATTERN)
    expect(config).toMatchObject({
      checkoutDir: '/work/dashboard/.local-dashboard/gardenerless',
      runtimeDir: '/work/dashboard/.local-dashboard/runtime',
      goModCacheDir: '/work/dashboard/.local-dashboard/gomodcache',
      scenario: 'healthy-shoot',
      ports: { frontend: 8444, backend: 3031, metrics: 9051, garden: 6443 },
      urls: {
        frontend: 'https://127.0.0.1:8444',
        backend: 'http://127.0.0.1:3031',
        garden: 'https://127.0.0.1:6443',
        proxy: 'http://127.0.0.1:3031',
      },
    })
  })

  it('parses only options supported by each command', () => {
    expect(parseOptions('setup', ['--reset'])).toEqual({ reset: true })
    expect(parseOptions('up', ['--scenario', 'many-shoots'])).toEqual({
      scenario: 'many-shoots',
    })
    expect(parseOptions('token', [
      '--namespace',
      'garden-foo',
      '--name',
      'viewer',
    ])).toEqual({ namespace: 'garden-foo', name: 'viewer' })
    expect(parseOptions('status', ['-h'])).toEqual({ help: true })
    for (const [command, option] of [
      ['down', '--reset'],
      ['status', '--scenario=healthy-shoot'],
      ['up', '--frontend-port=8445'],
      ['setup', '--checkout-dir=/tmp/checkout'],
    ]) {
      expect(() => parseOptions(command, [option])).toThrow('Unknown option')
    }
    expect(() => configuration(repositoryRoot, { scenario: 'production' }))
      .toThrow('unknown scenario')
  })

  it('derives the repository Yarn runtime without allowing path escape', () => {
    const directory = temporaryDirectory('local-dashboard-yarn-')
    mkdirSync(join(directory, '.yarn', 'releases'), { recursive: true })
    writeFileSync(join(directory, '.yarnrc.yml'), 'yarnPath: .yarn/releases/yarn.cjs\n')
    writeFileSync(join(directory, '.yarn', 'releases', 'yarn.cjs'), '')
    expect(yarnRuntimeFromConfiguration(directory))
      .toBe(join(directory, '.yarn', 'releases', 'yarn.cjs'))
    writeFileSync(join(directory, '.yarnrc.yml'), 'yarnPath: ../outside.cjs\n')
    expect(() => yarnRuntimeFromConfiguration(directory)).toThrow('inside the repository')
  })

  it('rejects symlinked managed roots and existing prerequisite directories', () => {
    const directory = temporaryDirectory()
    const config = configuration(directory)
    mkdirSync(config.managedRoot)
    expect(() => assertSetupTargetsAvailable(config)).not.toThrow()
    const external = join(directory, 'external')
    mkdirSync(external)
    symlinkSync(external, config.checkoutDir)
    expect(() => assertSetupTargetsAvailable(config)).toThrow('gardenerless checkout')
    rmSync(config.checkoutDir)
    symlinkSync(external, config.runtimeDir)
    expect(() => assertSetupTargetsAvailable(config)).toThrow('KCP runtime')
    expect(() => assertSetupTargetsAvailable(config, { reset: true })).not.toThrow()
    rmSync(config.runtimeDir)
    symlinkSync(external, config.goModCacheDir)
    expect(() => assertSetupTargetsAvailable(config)).toThrow('Go module cache')
    expect(() => assertSetupTargetsAvailable(config, { reset: true })).not.toThrow()
    rmSync(config.goModCacheDir)
    rmSync(config.managedRoot, { recursive: true })
    symlinkSync('/missing/local-dashboard-root', config.managedRoot)
    expect(() => assertSetupTargetsAvailable(config)).toThrow('non-symlink directory')
  })

  it('preserves trusted toolchain variables while removing routing and code-loading inputs', () => {
    const config = configuration()
    const env = sanitizedGardenerlessEnvironment(config, {
      PATH: '/trusted/tools:/usr/bin',
      HTTPS_PROXY: 'http://proxy.example.test',
      SSL_CERT_FILE: '/trusted/certificates.pem',
      GOPATH: '/go/path',
      KUBECONFIG: '/remote/kubeconfig',
      GIT_DIR: '/ambient/.git',
      GIT_NO_REPLACE_OBJECTS: '0',
      ...codeLoadingEnvironment,
    })
    expect(env).toMatchObject({
      PATH: '/trusted/tools:/usr/bin',
      HTTPS_PROXY: 'http://proxy.example.test',
      SSL_CERT_FILE: '/trusted/certificates.pem',
      GOPATH: '/go/path',
      GARDENERLESS_CHECKOUT_DIR: config.checkoutDir,
      GARDENERLESS_KCP_DIR: config.runtimeDir,
      GIT_NO_REPLACE_OBJECTS: '1',
    })
    expect(env.PATH.split(delimiter)).not.toContain(join(config.runtimeDir, 'bin'))
    expect(env.KUBECONFIG).toBeUndefined()
    expect(env.GIT_DIR).toBeUndefined()
    for (const key of Object.keys(codeLoadingEnvironment)) {
      expect(env[key]).toBeUndefined()
    }
    expect(gitEnvironment({ PATH: '/usr/bin', GIT_DIR: '/tmp/git', BASH_ENV: '/tmp/env' }))
      .toEqual({ PATH: '/usr/bin', GIT_NO_REPLACE_OBJECTS: '1' })
  })

  it('isolates backend settings and only reuses safe frontend certificates', () => {
    const directory = temporaryDirectory('local-dashboard-ssl-')
    const key = join(directory, 'key.pem')
    const certificate = join(directory, 'cert.pem')
    writeFileSync(key, 'key\n')
    writeFileSync(certificate, 'certificate\n')
    expect(assertReusableFrontendCertificates(directory)).toBe(directory)
    expect(frontendEnvironment(configuration(), directory, {
      VITE_PROXY_TARGET: 'https://remote.example.org',
      VITE_DEV_PORT: '443',
      GIT_DIR: '/ambient/.git',
      BASH_ENV: '/ambient/bash-env',
    })).toMatchObject({
      GARDENER_DASHBOARD_SSL_DIR: directory,
      VITE_PROXY_TARGET: 'http://127.0.0.1:3031',
    })
    const backend = backendEnvironment(configuration(), {
      KUBECONFIG: '/remote/kubeconfig',
      OIDC_ISSUER: 'https://remote.example.org',
      GITHUB_AUTHENTICATION_TOKEN: 'secret',
      GIT_DIR: '/ambient/.git',
      BASH_ENV: '/ambient/bash-env',
    })
    expect(backend).toMatchObject({
      KUBECONFIG: '/work/dashboard/.local-dashboard/runtime/.kcp/dashboard.kubeconfig',
      API_SERVER_URL: 'https://127.0.0.1:6443',
      BIND_HOST: '127.0.0.1',
      METRICS_BIND_HOST: '127.0.0.1',
      SESSION_SECRET: expect.stringMatching(/^[0-9a-f]{64}$/),
    })
    expect(backend.OIDC_ISSUER).toBeUndefined()
    expect(backend.GITHUB_AUTHENTICATION_TOKEN).toBeUndefined()
    expect(backend.GIT_DIR).toBeUndefined()
    expect(backend.BASH_ENV).toBeUndefined()
    rmSync(key)
    symlinkSync(certificate, key)
    expect(() => assertReusableFrontendCertificates(directory)).toThrow('non-symlink file')
  })
})

describe('Gardenerless prerequisite contract', () => {
  it('strictly parses a valid verify-kcp result', () => {
    expect(parseKcpVerification(`${JSON.stringify({
      schemaVersion: 1,
      release: 'v1.2.3',
      commit: kcpCommit,
    })}\n`)).toEqual({ release: 'v1.2.3', commit: kcpCommit })
  })

  it.each([
    ['malformed JSON', '{', 'malformed JSON'],
    ['array', '[]\n', 'unexpected result shape'],
    ['missing field', '{"schemaVersion":1,"release":"v1.2.3"}\n', 'unexpected result shape'],
    ['extra field', `{"schemaVersion":1,"release":"v1.2.3","commit":"${kcpCommit}","extra":true}\n`, 'unexpected result shape'],
    ['schema', `{"schemaVersion":2,"release":"v1.2.3","commit":"${kcpCommit}"}\n`, 'unsupported schema'],
    ['release', `{"schemaVersion":1,"release":"main","commit":"${kcpCommit}"}\n`, 'invalid release'],
    ['uppercase commit', `{"schemaVersion":1,"release":"v1.2.3","commit":"${'A'.repeat(40)}"}\n`, 'invalid commit'],
    ['long commit', `{"schemaVersion":1,"release":"v1.2.3","commit":"${'a'.repeat(64)}"}\n`, 'invalid commit'],
  ])('rejects %s', (_label, value, message) => {
    expect(() => parseKcpVerification(value)).toThrow(message)
  })

  it('invokes verify-kcp once with managed paths and separate output', () => {
    const config = configuration()
    const execute = vi.fn(() => ({
      status: 0,
      stdout: `{"schemaVersion":1,"release":"v1.2.3","commit":"${kcpCommit}"}\n`,
      stderr: '',
    }))
    expect(verifyKcp(config, { execute })).toEqual({ release: 'v1.2.3', commit: kcpCommit })
    expect(execute).toHaveBeenCalledExactlyOnceWith(
      join(config.checkoutDir, 'gardenerless-setup.sh'),
      ['verify-kcp', '--format=json'],
      expect.objectContaining({
        cwd: config.checkoutDir,
        encoding: 'utf8',
        env: expect.objectContaining({
          GARDENERLESS_CHECKOUT_DIR: config.checkoutDir,
          GARDENERLESS_KCP_DIR: config.runtimeDir,
        }),
      }),
    )
  })

  it('reports bounded stderr diagnostics on verification failure', () => {
    let error
    try {
      verifyKcp(configuration(), {
        execute: () => ({
          status: 42,
          stdout: '',
          stderr: `${'discarded diagnostic\n'.repeat(1000)}actionable failure\n`,
        }),
      })
    } catch (caught) {
      error = caught
    }
    expect(error.message).toContain('actionable failure')
    expect(error.message).not.toContain('discarded diagnostic'.repeat(100))
    expect(error.message.length).toBeLessThan(4200)
  })

  it('performs exactly one checkout and KCP inspection', () => {
    const directory = temporaryDirectory()
    const config = configuration(directory)
    mkdirSync(config.checkoutDir, { recursive: true })
    mkdirSync(config.runtimeDir)
    const inspect = vi.fn(() => ({ head: gardenerlessCommit }))
    const verify = vi.fn(() => ({ release: 'v1.2.3', commit: kcpCommit }))
    expect(inspectPrerequisites(config, { inspect, verify })).toEqual(commits)
    expect(inspect).toHaveBeenCalledOnce()
    expect(verify).toHaveBeenCalledOnce()

    for (const key of ['checkoutDir', 'runtimeDir']) {
      rmSync(config[key], { recursive: true })
      const external = join(directory, `external-${key}`)
      mkdirSync(external)
      symlinkSync(external, config[key])
      inspect.mockClear()
      verify.mockClear()
      expect(() => inspectPrerequisites(config, { inspect, verify })).toThrow('non-symlink directory')
      expect(inspect).not.toHaveBeenCalled()
      expect(verify).not.toHaveBeenCalled()
      rmSync(config[key])
      mkdirSync(config[key])
    }
  })

  it('keeps the module cache outside the KCP worktree and verifies its clean layout once', async () => {
    const directory = temporaryDirectory()
    const config = configuration(directory)
    const ambientModuleCache = join(directory, 'ambient-gomodcache')
    const events = []
    const gardenerless = { changed: true, head: gardenerlessCommit }
    const result = await setupKcpRuntime(
      config,
      {
        PATH: '/trusted/tools:/usr/bin',
        GOMODCACHE: ambientModuleCache,
        GOFLAGS: '-mod=vendor',
        KUBECONFIG: '/remote/kubeconfig',
        BUILDFLAGS: '-ambient',
        ...codeLoadingEnvironment,
      },
      'stdio',
      gardenerless,
      {
        run: async (_command, arguments_, options) => {
          events.push('setup-kcp')
          expect(arguments_).toEqual(['setup-kcp'])
          expect(options.env).toMatchObject({
            PATH: '/trusted/tools:/usr/bin',
            GOMODCACHE: config.goModCacheDir,
            GOFLAGS: '-modcacherw',
            GOWORK: 'off',
            GIT_ALLOW_PROTOCOL: 'https',
          })
          expect(options.env.KUBECONFIG).toBeUndefined()
          expect(options.env.BUILDFLAGS).toBeUndefined()
          expect(realpathSync(options.env.GOMODCACHE)).toBe(config.goModCacheDir)
          mkdirSync(join(config.runtimeDir, '.kcp'), { recursive: true })
          mkdirSync(join(config.runtimeDir, 'bin'))
        },
        inspect: (_configuration, { inspect }) => {
          events.push('verify-kcp')
          expect(inspect()).toBe(gardenerless)
          expect(readdirSync(config.runtimeDir).sort()).toEqual(['.kcp', 'bin'])
          return commits
        },
      },
    )
    expect(events).toEqual(['setup-kcp', 'verify-kcp'])
    expect(result).toEqual({ rebuilt: true, commits })
    expect(readdirSync(config.goModCacheDir)).toEqual([])
    expect(() => realpathSync(ambientModuleCache)).toThrow()
  })

  it('checks out only the requested commit and validates the trust anchor', async () => {
    const directory = temporaryDirectory('local-dashboard-clone-')
    const source = join(directory, 'source')
    const target = join(directory, 'target')
    const pinned = createCheckout(source)
    writeFileSync(join(source, 'gardenerless-setup.sh'), '#!/bin/sh\nexit 73\n')
    git(source, 'add', 'gardenerless-setup.sh')
    git(source, 'commit', '-m', 'newer head')
    await clonePinnedCheckout(source, pinned, target, {
      cwd: directory,
      env: fixtureGitEnvironment,
    })
    expect(git(target, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('HEAD')
    expect(git(target, 'rev-parse', 'HEAD')).toBe(pinned)
    expect(git(target, 'remote')).toBe('')
    expect(readFileSync(join(target, 'gardenerless-setup.sh'), 'utf8'))
      .toBe('#!/bin/sh\nexit 0\n')

    const config = configuration(directory)
    rmSync(config.checkoutDir, { recursive: true, force: true })
    mkdirSync(config.managedRoot)
    cpSync(target, config.checkoutDir, { recursive: true })
    expect(() => inspectGardenerlessCheckout(config)).toThrow(`expected pinned commit ${GARDENERLESS_COMMIT}`)
    writeFileSync(join(config.checkoutDir, 'unknown'), 'drift\n')
    expect(() => inspectGardenerlessCheckout(config, { requireCurrent: false }))
      .toThrow('dirty or contains unknown')
    rmSync(join(config.checkoutDir, 'unknown'))
    rmSync(join(config.checkoutDir, 'gardenerless-setup.sh'))
    symlinkSync('/bin/sh', join(config.checkoutDir, 'gardenerless-setup.sh'))
    git(config.checkoutDir, 'config', 'user.email', 'local-dashboard@example.invalid')
    git(config.checkoutDir, 'config', 'user.name', 'Local Dashboard Test')
    git(config.checkoutDir, 'add', 'gardenerless-setup.sh')
    git(config.checkoutDir, 'commit', '-m', 'unsafe executable')
    expect(() => inspectGardenerlessCheckout(config, { requireCurrent: false }))
      .toThrow('regular non-symlink file')
  })

  it.each(['external', 'linked', 'symlinked'])(
    'rejects a %s Gardenerless Git directory',
    kind => {
      const directory = temporaryDirectory(`local-dashboard-${kind}-git-`)
      const config = configuration(directory)
      mkdirSync(config.managedRoot)
      const externalGit = join(directory, 'external.git')
      if (kind === 'external') {
        execFileSync('git', ['init', `--separate-git-dir=${externalGit}`, config.checkoutDir], {
          env: fixtureGitEnvironment,
        })
      } else if (kind === 'linked') {
        const source = join(directory, 'source')
        createCheckout(source)
        git(source, 'worktree', 'add', '--detach', config.checkoutDir)
      } else {
        createCheckout(config.checkoutDir)
        renameSync(join(config.checkoutDir, '.git'), externalGit)
        symlinkSync(externalGit, join(config.checkoutDir, '.git'))
      }
      expect(() => inspectGardenerlessCheckout(config, { requireCurrent: false }))
        .toThrow('Git directory')
    },
  )

  it('runs two concise setup phases and returns the verified result directly', async () => {
    const directory = temporaryDirectory('local-dashboard-setup-')
    const config = configuration(directory)
    mkdirSync(config.managedRoot)
    const phases = []
    silenceConsole()
    const result = await convergeSetupPrerequisites(config, {}, {
      gardenerless: async () => ({ changed: true, head: gardenerlessCommit }),
      kcp: async (_configuration, _environment, _stdio, checkout) => {
        expect(checkout.head).toBe(gardenerlessCommit)
        return { rebuilt: true, commits }
      },
      phase: async options => {
        phases.push(options.completeLabel)
        return options.action()
      },
    })
    expect(result).toEqual({ changed: true, rebuilt: true, commits })
    expect(phases).toEqual([
      'pinned gardenerless checkout ready',
      'gardenerless kcp setup and verification complete',
    ])
  })

  it('resets only managed prerequisites and preserves logs', () => {
    const directory = temporaryDirectory('local-dashboard-reset-')
    const config = configuration(directory)
    const log = join(config.managedRoot, 'logs', 'run', 'frontend.log')
    mkdirSync(config.checkoutDir, { recursive: true })
    mkdirSync(config.runtimeDir)
    mkdirSync(config.goModCacheDir)
    mkdirSync(join(log, '..'), { recursive: true })
    writeFileSync(log, 'retained\n')
    resetManagedPrerequisites(config)
    expect(() => realpathSync(config.checkoutDir)).toThrow()
    expect(() => realpathSync(config.runtimeDir)).toThrow()
    expect(() => realpathSync(config.goModCacheDir)).toThrow()
    expect(readFileSync(log, 'utf8')).toBe('retained\n')

    const external = join(directory, 'external')
    mkdirSync(external)
    writeFileSync(join(external, 'sentinel'), 'retained\n')
    symlinkSync(external, config.checkoutDir)
    symlinkSync(external, config.runtimeDir)
    symlinkSync(external, config.goModCacheDir)
    resetManagedPrerequisites(config)
    expect(readFileSync(join(external, 'sentinel'), 'utf8')).toBe('retained\n')
  })
})

describe('compact state and process safety', () => {
  it('reads listener PIDs and process working directories from bounded lsof queries', () => {
    const listeners = vi.fn(() => ({ status: 0, stdout: 'p101\np202\n' }))
    expect(inspectListeningPids(8444, listeners)).toEqual([101, 202])
    expect(listeners).toHaveBeenCalledWith('lsof', [
      '-nP',
      '-a',
      '-iTCP:8444',
      '-sTCP:LISTEN',
      '-Fp',
    ], { encoding: 'utf8' })

    const cwd = vi.fn(() => ({ status: 0, stdout: 'p101\nfcwd\nn/work/dashboard/frontend\n' }))
    expect(inspectProcessCwd(101, cwd)).toBe('/work/dashboard/frontend')
    expect(inspectListeningPids(8444, () => ({ status: 1, stdout: '' }))).toEqual([])
    expect(inspectProcessCwd(101, () => ({ status: 1, stdout: '' }))).toBeUndefined()
  })

  it('serializes only compact managed state and validates every identity field', () => {
    const config = configuration()
    const state = trackedState(config)
    expect(parseState(serializeState(state), config)).toEqual(state)
    expect(serializeState(state)).not.toContain('checkoutDir')
    expect(serializeState(state)).not.toContain('commandMarker')

    const invalidStates = [
      { ...state, version: 2 },
      { ...state, extra: true },
      { ...state, logDir: '/tmp/escaped' },
      { ...state, commits: { ...commits, kcp: 'unknown' } },
      { ...state, commits: { ...commits, kcpRelease: 'main' } },
      { ...state, processes: [processRecord(config, 'garden', 101)] },
      {
        ...state,
        status: 'starting',
        processes: [{ ...processRecord(config, 'garden', 101), pgid: 999 }],
      },
      {
        ...state,
        status: 'starting',
        processes: [{ ...processRecord(config, 'backend', 102), command: '/unknown' }],
      },
    ]
    for (const invalid of invalidStates) {
      expect(() => parseState(serializeState(invalid), config)).toThrow()
    }
  })

  it('rejects impossible process prefixes, permutations, and duplicate PIDs', () => {
    const config = configuration()
    const state = trackedState(config)
    for (const names of [
      ['backend'],
      ['garden', 'frontend'],
      ['backend', 'garden', 'frontend'],
      ['garden', 'frontend', 'backend'],
    ]) {
      const processes = names.map((name, index) => processRecord(config, name, 201 + index))
      expect(() => parseState(serializeState({ ...state, status: 'starting', processes }), config))
        .toThrow('invalid process identity')
    }
    const processes = [processRecord(config, 'garden', 201), processRecord(config, 'backend', 201)]
    expect(() => parseState(serializeState({ ...state, status: 'starting', processes }), config))
      .toThrow('invalid process identity')
  })

  it('derives markers from the same definitions used to start services', () => {
    const definitions = serviceDefinitions(configuration())
    expect(definitions.map(({ name, commandMarker }) => [name, commandMarker])).toEqual([
      ['garden', '/work/dashboard/.local-dashboard/runtime/bin/kcp start --bind-address=127.0.0.1'],
      ['backend', `${YARN_RUNTIME} workspace @gardener-dashboard/backend serve`],
      ['frontend', `${YARN_RUNTIME} workspace @gardener-dashboard/frontend serve --port 8444 --host 127.0.0.1`],
    ])
  })

  it('assesses matching health and rejects stale or changed identities', async () => {
    const config = configuration()
    const state = trackedState(config)
    await expect(assessTrackedState(state, config, {
      inspector: matchingInspector(state),
      request: async () => true,
      commits,
    })).resolves.toBe('healthy')
    await expect(assessTrackedState(state, { ...config, scenario: 'many-shoots' }, {
      inspector: matchingInspector(state),
      request: async () => true,
      commits,
    })).resolves.toBe('configuration-mismatch')
    await expect(assessTrackedState(state, config, {
      inspector: () => undefined,
    })).resolves.toBe('stale')
  })

  it('recognizes a managed listener after a launcher hands off to its runtime child', () => {
    const config = configuration()
    const record = processRecord(config, 'backend', 101)
    const listener = {
      pgid: record.pgid,
      startSignature: 'Fri Jul 24 10:00:01 2026',
      command: '/usr/local/bin/node server.js',
    }
    const inspector = pid => pid === 202 ? listener : undefined
    const ownership = {
      listeningPids: () => [202],
      processCwd: () => join(config.repositoryRoot, 'backend'),
    }
    expect(processMatches(record, config, inspector, ownership)).toBe(true)
    expect(processMatches(record, config, inspector, {
      ...ownership,
      processCwd: () => config.repositoryRoot,
    })).toBe(false)
    expect(processMatches(record, config, () => ({ ...listener, pgid: 999 }), ownership))
      .toBe(false)
  })

  it('tears down validated groups in reverse order with SIGTERM', async () => {
    const config = configuration()
    const state = trackedState(config)
    const signals = []
    const result = await stopTrackedProcesses(state, config, {
      inspector: matchingInspector(state),
      signalGroup: (pgid, signal) => signals.push([pgid, signal]),
      waitGroup: async () => true,
    })
    expect(result).toEqual({ stopped: ['frontend', 'backend', 'garden'], preserved: [] })
    expect(signals).toEqual([
      [103, 'SIGTERM'],
      [102, 'SIGTERM'],
      [101, 'SIGTERM'],
    ])
  })

  it('preserves mismatches and revalidates identity before SIGKILL', async () => {
    const config = configuration()
    const record = processRecord(config, 'garden', 101)
    let inspections = 0
    const signals = []
    const result = await stopTrackedProcesses({ processes: [record] }, config, {
      inspector: () => ++inspections === 1
        ? { pgid: record.pgid, startSignature: record.startSignature, command: record.command }
        : { pgid: record.pgid, startSignature: 'reused', command: '/unknown' },
      signalGroup: (pgid, signal) => signals.push([pgid, signal]),
      waitGroup: async () => false,
    })
    expect(signals).toEqual([[101, 'SIGTERM']])
    expect(result.preserved).toEqual(['garden'])
  })

  it('treats a vanished group with free ports as stopped but preserves an unknown group', async () => {
    const config = configuration()
    const record = processRecord(config, 'garden', 101)
    const options = {
      matcher: () => false,
      probe: async () => true,
      signalGroup: vi.fn(),
      waitGroup: vi.fn(),
    }
    await expect(stopTrackedProcesses({ processes: [record] }, config, {
      ...options,
      groupPresent: () => false,
    })).resolves.toEqual({ stopped: ['garden'], preserved: [] })
    await expect(stopTrackedProcesses({ processes: [record] }, config, {
      ...options,
      groupPresent: () => true,
    })).resolves.toEqual({ stopped: [], preserved: ['garden'] })
  })

  it('uses bounded SIGTERM then SIGKILL when the exact group remains', async () => {
    const config = configuration()
    const record = processRecord(config, 'garden', 101)
    const signals = []
    let waits = 0
    await expect(stopTrackedProcesses({ processes: [record] }, config, {
      inspector: () => ({
        pgid: record.pgid,
        startSignature: record.startSignature,
        command: record.command,
      }),
      signalGroup: (pgid, signal) => signals.push([pgid, signal]),
      waitGroup: async () => ++waits === 2,
    })).resolves.toEqual({ stopped: ['garden'], preserved: [] })
    expect(signals).toEqual([[101, 'SIGTERM'], [101, 'SIGKILL']])
  })

  it('fails promptly with bounded logs when a child identity disappears', async () => {
    const directory = temporaryDirectory('local-dashboard-log-')
    const config = configuration()
    const logPath = join(directory, 'child.log')
    writeFileSync(logPath, `${'discarded\n'.repeat(1000)}intentional failure\n`)
    const started = Date.now()
    await expect(waitUntilReady({
      label: 'garden',
      record: processRecord(config, 'garden', 101),
      configuration: config,
      health: async () => false,
      logPath,
      timeoutMs: 5_000,
      inspector: () => undefined,
    })).rejects.toThrow('intentional failure')
    expect(Date.now() - started).toBeLessThan(500)
  })
})

describe('command workflow', () => {
  it('inspects once on setup reuse, up failure, status failure, and token success', async () => {
    const directory = temporaryDirectory('local-dashboard-commands-')
    const config = configuration(directory)
    mkdirSync(config.managedRoot)
    const setupInspect = vi.fn(() => commits)
    silenceConsole()
    await commandSetup(config, {
      existing: async () => trackedState(config),
      inspect: setupInspect,
    })
    expect(setupInspect).toHaveBeenCalledOnce()

    const upInspect = vi.fn(() => {
      throw new Error('missing runtime')
    })
    await expect(commandUp(config, { inspect: upInspect })).rejects.toThrow('run')
    expect(upInspect).toHaveBeenCalledOnce()

    const statusInspect = vi.fn(() => {
      throw new Error('missing runtime')
    })
    await commandStatus(config, { inspect: statusInspect, probe: async () => true })
    expect(statusInspect).toHaveBeenCalledOnce()

    const tokenInspect = vi.fn(() => commits)
    const run = vi.fn(async () => {})
    const error = silenceConsole('error')
    await commandToken(config, {
      namespace: 'garden-foo',
      name: 'viewer',
      inspect: tokenInspect,
      run,
    })
    expect(tokenInspect).toHaveBeenCalledOnce()
    expect(error).toHaveBeenCalledExactlyOnceWith(
      'system:serviceaccount:garden-foo:viewer\n',
    )
    expect(run).toHaveBeenCalledExactlyOnceWith(
      join(config.checkoutDir, 'gardenerless-setup.sh'),
      [
        'get-token',
        '--namespace',
        'garden-foo',
        '--service-account',
        'viewer',
      ], {
        cwd: config.checkoutDir,
        env: sanitizedGardenerlessEnvironment(config),
        stdio: 'inherit',
      },
    )
  })

  it('uses the default operator service account without writing to stdout', async () => {
    const config = configuration()
    const output = silenceConsole()
    const error = silenceConsole('error')
    const run = vi.fn(async () => {})
    await commandToken(config, { inspect: () => commits, run })
    expect(output).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledExactlyOnceWith(
      'system:serviceaccount:garden:dashboard-user\n',
    )
    expect(run).toHaveBeenCalledExactlyOnceWith(
      join(config.checkoutDir, 'gardenerless-setup.sh'),
      [
        'get-token',
        '--namespace',
        'garden',
        '--service-account',
        'dashboard-user',
      ], {
        cwd: config.checkoutDir,
        env: sanitizedGardenerlessEnvironment(config),
        stdio: 'inherit',
      },
    )
  })

  it('down removes malformed state without inspecting or signalling a process', async () => {
    const directory = temporaryDirectory('local-dashboard-down-')
    const config = configuration(directory)
    mkdirSync(config.managedRoot)
    writeFileSync(config.stateFile, '{"version":2}\n')
    silenceConsole()
    await commandDown(config, { probe: async () => true })
    expect(() => realpathSync(config.stateFile)).toThrow()
  })

  it('down retains tracked state and fails when ownership or listener cleanup is unproven', async () => {
    const directory = temporaryDirectory('local-dashboard-down-incomplete-')
    const config = configuration(directory)
    mkdirSync(config.managedRoot)
    writeFileSync(config.stateFile, serializeState(trackedState(config)))
    silenceConsole()
    await expect(commandDown(config, {
      stop: async () => ({ stopped: ['backend', 'garden'], preserved: ['frontend'] }),
      probe: async () => true,
    })).rejects.toThrow('tracked state retained')
    expect(readFileSync(config.stateFile, 'utf8')).toContain('frontend')

    await expect(commandDown(config, {
      stop: async () => ({ stopped: ['frontend', 'backend', 'garden'], preserved: [] }),
      probe: async port => port !== config.ports.frontend,
    })).rejects.toThrow('frontend:8444')
    expect(readFileSync(config.stateFile, 'utf8')).toContain('frontend')
  })

  it('down refuses unknown listeners when no tracked state exists', async () => {
    const directory = temporaryDirectory('local-dashboard-down-untracked-')
    const config = configuration(directory)
    await expect(commandDown(config, {
      probe: async port => port !== config.ports.frontend,
    })).rejects.toThrow('unknown listeners remain on frontend:8444')
  })

  it('down refuses state reached through a symlinked managed root', async () => {
    const directory = temporaryDirectory('local-dashboard-down-symlink-')
    const config = configuration(directory)
    const external = join(directory, 'external')
    mkdirSync(external)
    writeFileSync(join(external, 'state.json'), '{}\n')
    symlinkSync(external, config.managedRoot)
    await expect(commandDown(config)).rejects.toThrow('non-symlink directory')
    expect(readFileSync(join(external, 'state.json'), 'utf8')).toBe('{}\n')
  })

  it('rejects unsupported command options before executing commands', async () => {
    await expect(main(['down', '--runtime-dir=/tmp/runtime'])).rejects.toThrow('Unknown option')
    await expect(main(['status', '--reset'])).rejects.toThrow('Unknown option')
  })

  it('reconciles every scenario with exactly one managed gardenerless command', async () => {
    for (const scenario of SCENARIOS) {
      const config = configuration(repositoryRoot, { scenario })
      const run = vi.fn(async () => {})
      await reconcileScenario(config, '/work/dashboard/.local-dashboard/logs/run/setup.log', { run })
      expect(run).toHaveBeenCalledExactlyOnceWith(
        config,
        ['scenario', scenario],
        '/work/dashboard/.local-dashboard/logs/run/setup.log',
      )
    }
  })

  it('reports timed phase progress and preserves unknown occupied ports', async () => {
    let now = 0
    let progress
    const output = []
    const timer = { unref: vi.fn() }
    const result = runTimedPhase({
      command: 'up',
      index: 1,
      total: 4,
      label: 'starting garden',
      completeLabel: 'garden ready',
      action: async () => 'ready',
      now: () => now,
      log: message => output.push(message),
      schedule: callback => {
        progress = callback
        return timer
      },
      cancel: vi.fn(),
    })
    now = 30_000
    progress()
    await expect(result).resolves.toBe('ready')
    expect(output).toContain('up: [1/4] starting garden (30s elapsed)')
    expect(formatElapsedTime(320_000)).toBe('5m 20s')
    await expect(assertPortsAvailable({ frontend: 8444 }, async () => false))
      .rejects.toThrow('unknown listener')
  })
})
