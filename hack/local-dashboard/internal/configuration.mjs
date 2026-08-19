//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  X509Certificate,
  randomBytes,
} from 'node:crypto'
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
} from 'node:fs'
import { homedir } from 'node:os'
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path'
import { createSecureContext } from 'node:tls'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

export const GARDENERLESS_REPOSITORY = 'https://github.com/grolu/gardenerless-local-setup.git'
export const GARDENERLESS_COMMIT = '28ab775a8320ac4bf9a708c692f0918a56b06167'
export const SCENARIOS = ['healthy-shoot', 'failing-shoot', 'many-shoots', 'operation-in-progress']

export const REPOSITORY_ROOT = realpathSync(resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
))
export const MANAGED_ROOT = join(REPOSITORY_ROOT, '.local-dashboard')
export const BACKEND_CONFIG = join(
  REPOSITORY_ROOT,
  'hack',
  'local-dashboard',
  'backend-config.yaml',
)
export const FRONTEND_SSL_DIRECTORY = join(homedir(), '.gardener', 'dashboard', 'ssl')
export const STATE_VERSION = 3
export const MAX_STATE_BYTES = 64 * 1024
export const COMMIT_PATTERN = /^[0-9a-f]{40}$/

const BACKEND_ENVIRONMENT_KEYS = [
  'GARDENER_CONFIG',
  'KUBECONFIG',
  'NODE_ENV',
  'NODE_OPTIONS',
  'NODE_PATH',
  'VUE_APP_VERSION',
  'SESSION_SECRET',
  'SESSION_SECRET_PREVIOUS',
  'API_SERVER_URL',
  'OIDC_ISSUER',
  'OIDC_CA',
  'OIDC_CLIENT_ID',
  'OIDC_CLIENT_SECRET',
  'GITHUB_AUTHENTICATION_APP_ID',
  'GITHUB_AUTHENTICATION_CLIENT_ID',
  'GITHUB_AUTHENTICATION_CLIENT_SECRET',
  'GITHUB_AUTHENTICATION_INSTALLATION_ID',
  'GITHUB_AUTHENTICATION_PRIVATE_KEY',
  'GITHUB_AUTHENTICATION_TOKEN',
  'GITHUB_WEBHOOK_SECRET',
  'LOG_LEVEL',
  'LOG_HTTP_REQUEST_BODY',
  'PORT',
  'BIND_HOST',
  'METRICS_PORT',
  'METRICS_BIND_HOST',
  'WEBSOCKET_ALLOWED_ORIGINS',
  'POD_NAMESPACE',
  'POD_NAME',
  'BACKEND_PORT',
  'BACKEND_METRICS_PORT',
  'GARDEN_PORT',
  'KCP_PORT',
  'SCENARIO',
  'GARDENERLESS_CHECKOUT_DIR',
  'GARDENERLESS_KCP_DIR',
  'VITE_PROXY_TARGET',
  'VITE_DEV_PORT',
]

const GIT_LOCAL_ENVIRONMENT_KEYS = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CONFIG',
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_SYSTEM',
  'GIT_OBJECT_DIRECTORY',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_GRAFT_FILE',
  'GIT_INDEX_FILE',
  'GIT_REPLACE_REF_BASE',
  'GIT_PREFIX',
  'GIT_SHALLOW_FILE',
  'GIT_COMMON_DIR',
]

const SUBPROCESS_CODE_LOADING_ENVIRONMENT_KEYS = [
  'BASH_ENV',
  'GIT_EXEC_PATH',
  'GIT_TEMPLATE_DIR',
  'MAKEFILES',
  'MAKEFLAGS',
  'GNUMAKEFLAGS',
  'MFLAGS',
]

export function fail (message) {
  throw new Error(message)
}

export function pathEntryExists (filename) {
  return Boolean(lstatSync(filename, { throwIfNoEntry: false }))
}

function yamlScalar (value, label) {
  const trimmed = value.trim()
  if (trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      fail(`${label} is not a valid quoted YAML scalar`)
    }
  }
  if (trimmed.startsWith("'")) {
    if (!trimmed.endsWith("'")) {
      fail(`${label} is not a valid quoted YAML scalar`)
    }
    return trimmed.slice(1, -1).replaceAll("''", "'")
  }
  return trimmed.replace(/\s+#.*$/, '').trim()
}

export function yarnRuntimeFromConfiguration (repositoryRoot = REPOSITORY_ROOT) {
  const configurationFile = join(repositoryRoot, '.yarnrc.yml')
  assertSafeFile(configurationFile, 'Yarn configuration')
  const matches = [...readFileSync(configurationFile, 'utf8').matchAll(/^yarnPath:\s*(.+)$/gm)]
  if (matches.length !== 1) {
    fail(`Yarn configuration must define exactly one yarnPath: ${configurationFile}`)
  }
  const yarnPath = yamlScalar(matches[0][1], 'yarnPath')
  if (!yarnPath) {
    fail(`Yarn configuration has an empty yarnPath: ${configurationFile}`)
  }
  const runtime = resolve(repositoryRoot, yarnPath)
  const relativeRuntime = relative(repositoryRoot, runtime)
  if (relativeRuntime.startsWith('..') || isAbsolute(relativeRuntime)) {
    fail(`yarnPath must resolve inside the repository: ${yarnPath}`)
  }
  return runtime
}

export const YARN_RUNTIME = yarnRuntimeFromConfiguration()

export function parseOptions (command, arguments_) {
  const options = { help: { type: 'boolean', short: 'h' } }
  if (command === 'setup') {
    options.reset = { type: 'boolean' }
  } else if (command === 'up') {
    options.scenario = { type: 'string' }
  } else if (command === 'token') {
    options.namespace = { type: 'string' }
    options.name = { type: 'string' }
  }
  try {
    return { ...parseArgs({ args: arguments_, options, strict: true }).values }
  } catch (error) {
    fail(error.message)
  }
}

export function resolveConfiguration ({
  options = {},
  repositoryRoot = REPOSITORY_ROOT,
} = {}) {
  const managedRoot = join(repositoryRoot, '.local-dashboard')
  const checkoutDir = join(managedRoot, 'gardenerless')
  const runtimeDir = join(managedRoot, 'runtime')
  const goModCacheDir = join(managedRoot, 'gomodcache')
  const scenario = options.scenario ?? 'healthy-shoot'
  if (!SCENARIOS.includes(scenario)) {
    fail(`unknown scenario '${scenario}'; choose ${SCENARIOS.join(', ')}`)
  }
  return {
    repositoryRoot,
    managedRoot,
    stateFile: join(managedRoot, 'state.json'),
    setupLogFile: join(managedRoot, 'setup.log'),
    checkoutDir,
    runtimeDir,
    goModCacheDir,
    scenario,
    ports: { frontend: 8444, backend: 3031, metrics: 9051, garden: 6443 },
    urls: {
      frontend: 'https://127.0.0.1:8444',
      backend: 'http://127.0.0.1:3031',
      garden: 'https://127.0.0.1:6443',
      proxy: 'http://127.0.0.1:3031',
    },
  }
}

export function assertSafeDirectory (directory, label) {
  const stat = lstatSync(directory, { throwIfNoEntry: false })
  if (!stat || !stat.isDirectory() || stat.isSymbolicLink() ||
      realpathSync(directory) !== directory) {
    fail(`${label} is not a real non-symlink directory: ${directory}`)
  }
}

export function assertSafeManagedRoot (managedRoot) {
  if (pathEntryExists(managedRoot)) {
    assertSafeDirectory(managedRoot, 'managed directory')
  } else {
    mkdirSync(managedRoot, { recursive: true, mode: 0o700 })
  }
}

export function assertSafeFile (filename, label) {
  const stat = lstatSync(filename)
  if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(filename) !== filename) {
    fail(`${label} is not a regular non-symlink file: ${filename}`)
  }
}

export function assertReusableFrontendCertificates (sslDirectory = FRONTEND_SSL_DIRECTORY) {
  if (!pathEntryExists(sslDirectory)) {
    fail(`trusted frontend certificates are missing at ${sslDirectory}; run 'yarn workspace @gardener-dashboard/frontend setup' deliberately before starting the local Dashboard`)
  }
  assertSafeDirectory(sslDirectory, 'frontend certificate directory')
  for (const filename of ['ca.pem', 'key.pem', 'cert.pem']) {
    assertSafeFile(join(sslDirectory, filename), `frontend certificate ${filename}`)
  }
  const caPath = join(sslDirectory, 'ca.pem')
  const certificatePath = join(sslDirectory, 'cert.pem')
  const caPem = readFileSync(caPath)
  const key = readFileSync(join(sslDirectory, 'key.pem'))
  const certificatePem = readFileSync(certificatePath)
  let caCertificate
  let certificate
  try {
    caCertificate = new X509Certificate(caPem)
  } catch {
    fail(`frontend TLS CA certificate is invalid: ${caPath}`)
  }
  try {
    certificate = new X509Certificate(certificatePem)
  } catch {
    fail(`frontend TLS server certificate is invalid: ${certificatePath}`)
  }
  const now = new Date()
  for (const [currentCertificate, label, filename] of [
    [caCertificate, 'CA certificate', caPath],
    [certificate, 'server certificate', certificatePath],
  ]) {
    if (now < currentCertificate.validFromDate || now >= currentCertificate.validToDate) {
      fail(`frontend TLS ${label} is not currently valid: ${filename}`)
    }
  }
  try {
    createSecureContext({ ca: caPem, key, cert: certificatePem })
  } catch {
    fail(`frontend TLS key and certificate material are invalid or mismatched: ${sslDirectory}`)
  }
  if (!certificate.checkIssued(caCertificate) ||
      !certificate.verify(caCertificate.publicKey)) {
    fail(`frontend TLS server certificate was not issued and signed by the CA certificate: ${certificatePath}`)
  }
  return sslDirectory
}

export function ensureManagedChildDirectory (directory, managedRoot) {
  assertSafeManagedRoot(managedRoot)
  const child = relative(managedRoot, directory)
  if (!child || child.startsWith('..') || isAbsolute(child)) {
    fail(`managed child directory escapes ${managedRoot}: ${directory}`)
  }
  if (pathEntryExists(directory)) {
    assertSafeDirectory(directory, 'managed child')
  } else {
    mkdirSync(directory, { mode: 0o700 })
  }
}

function assertManagedPrerequisitePaths (configuration) {
  if (configuration.checkoutDir !== join(configuration.managedRoot, 'gardenerless') ||
      configuration.runtimeDir !== join(configuration.managedRoot, 'runtime') ||
      configuration.goModCacheDir !== join(configuration.managedRoot, 'gomodcache')) {
    fail('setup only manages repository-owned prerequisites')
  }
}

export function assertManagedPrerequisiteDirectories (configuration) {
  assertManagedPrerequisitePaths(configuration)
  assertSafeDirectory(configuration.managedRoot, 'managed directory')
  assertSafeDirectory(configuration.checkoutDir, 'gardenerless checkout')
  assertSafeDirectory(configuration.runtimeDir, 'KCP runtime')
}

export function assertSetupTargetsAvailable (configuration, { reset = false } = {}) {
  assertManagedPrerequisitePaths(configuration)
  if (pathEntryExists(configuration.managedRoot)) {
    assertSafeDirectory(configuration.managedRoot, 'managed directory')
  }
  if (!reset) {
    for (const [directory, label] of [
      [configuration.checkoutDir, 'gardenerless checkout'],
      [configuration.runtimeDir, 'KCP runtime'],
      [configuration.goModCacheDir, 'Go module cache'],
    ]) {
      if (pathEntryExists(directory)) {
        assertSafeDirectory(directory, label)
      }
    }
  }
}

function environmentWithout (env, keys) {
  const environment = { ...env }
  for (const key of keys) {
    delete environment[key]
  }
  return environment
}

export function gitEnvironment (env = process.env) {
  const environment = environmentWithout(
    env,
    [...GIT_LOCAL_ENVIRONMENT_KEYS, ...SUBPROCESS_CODE_LOADING_ENVIRONMENT_KEYS],
  )
  environment.GIT_NO_REPLACE_OBJECTS = '1'
  environment.GIT_CONFIG_GLOBAL = '/dev/null'
  environment.GIT_CONFIG_NOSYSTEM = '1'
  return environment
}

export function sanitizedGardenerlessEnvironment (configuration, env = process.env) {
  const environment = gitEnvironment(environmentWithout(env, BACKEND_ENVIRONMENT_KEYS))
  environment.GARDENERLESS_CHECKOUT_DIR = configuration.checkoutDir
  environment.GARDENERLESS_KCP_DIR = configuration.runtimeDir
  environment.GIT_TERMINAL_PROMPT = '0'
  return environment
}

export function backendEnvironment (configuration, env = process.env) {
  const environment = gitEnvironment(environmentWithout(env, BACKEND_ENVIRONMENT_KEYS))
  return Object.assign(environment, {
    NODE_ENV: 'development',
    GARDENER_CONFIG: BACKEND_CONFIG,
    KUBECONFIG: join(configuration.runtimeDir, '.kcp', 'dashboard.kubeconfig'),
    API_SERVER_URL: configuration.urls.garden,
    WEBSOCKET_ALLOWED_ORIGINS: configuration.urls.frontend,
    SESSION_SECRET: randomBytes(32).toString('hex'),
    SESSION_SECRET_PREVIOUS: randomBytes(32).toString('hex'),
    PORT: String(configuration.ports.backend),
    BIND_HOST: '127.0.0.1',
    METRICS_PORT: String(configuration.ports.metrics),
    METRICS_BIND_HOST: '127.0.0.1',
  })
}

export function isolatedSetupGitEnvironment (env = process.env) {
  const environment = Object.fromEntries(
    Object.entries(gitEnvironment(env)).filter(([key]) => !key.startsWith('GIT_CONFIG_')),
  )
  return Object.assign(environment, {
    GIT_ALLOW_PROTOCOL: 'https',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
  })
}

export function frontendEnvironment (
  configuration,
  sslDirectory = FRONTEND_SSL_DIRECTORY,
  env = process.env,
) {
  return Object.assign(
    gitEnvironment(environmentWithout(env, [
      ...BACKEND_ENVIRONMENT_KEYS,
      'VITE_PROXY_TARGET',
      'GARDENER_DASHBOARD_SSL_DIR',
      'VITE_DEV_PORT',
    ])),
    {
      VITE_PROXY_TARGET: configuration.urls.proxy,
      GARDENER_DASHBOARD_SSL_DIR: sslDirectory,
    },
  )
}
