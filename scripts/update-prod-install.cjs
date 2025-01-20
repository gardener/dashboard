#!/usr/bin/env node
//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const fullYear = new Date().getFullYear()
const commit = 'master'
const baseUrl = `https://gitlab.com/Larry1123/yarn-contrib/`

const pluginFiles = [
  ['yarn-utils/lib/dependenciesUtils.js', [
    './dependenciesUtils',
  ]],
  ['yarn-utils/lib/index.js', [
    '@larry1123/yarn-utils',
  ]],
  ['plugin-production-install/lib/util.js', [
    '../util',
  ]],
  ['plugin-production-install/lib/ProductionInstallFetcher.js', [
    '../ProductionInstallFetcher',
  ]],
  ['plugin-production-install/lib/ProductionInstallResolver.js', [
    '../ProductionInstallResolver',
  ]],
  ['plugin-production-install/lib/commands/productionInstall.js', [
    './ProductionInstallCommand',
  ]],
]

function rawURL (url) {
  return new URL(url, `${baseUrl}-/raw/${commit}/packages/`)
}

function blobURL(url) {
  return new URL(url, `${baseUrl}-/blob/${commit}/packages/`)
}

function md5 (data) {
  return crypto.createHash('md5').update(data).digest('hex')
}

function functionName (url) {
  return '$' + md5(url)
}

function moduleName (url) {
  const [packageName] = url.split('/')
  const name = path.basename(url, '.js')
  return name === 'index'
    ? packageName
    : name
}

function createRegistryEntriesCode () {
  return pluginFiles
    .flatMap(([url, ids]) => ids.map(id => {
      return `  registry.set('${id}', createModule(${functionName(url)}))`
    }))
    .join('\n')
}

async function fetchCode (url, indent = '') {
  const response = await fetch(rawURL(url))
  const text = await response.text()
  return text
    .replace(/(^\n+|\n+$)/g, '')
    .split('\n')
    .map(line => indent + line)
    .join('\n')
}

async function createModulesCodes () {
  const urls = pluginFiles.map(([url]) => url)
  const moduleEntries = await Promise.all(urls.map(async url => [url, await fetchCode(url, '  ')]))
  return moduleEntries
    .map(([url, body]) => {
      return `/**
 * Wrapper function for the \`${moduleName(url)}\` implementation from the
 * Yarn plugin by Larry1123. The original source code remains unmodified and can be found here:
 * ${blobURL(url).toString()}
 */
const ${functionName(url)} = (require, exports) => {
${body}
}
`
    })
    .join('\n')
}

const template = `//
// SPDX-FileCopyrightText: ${fullYear} SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const factory = originalRequire => {
  const registry = new Map([])

  function createModule(moduleFactory) {
    const exports = {}
    moduleFactory(require, exports)
    return exports
  }

  function require (id) {
    return registry.has(id)
      ? registry.get(id)
      : originalRequire(id)
  }

  const MultiResolver = require('@yarnpkg/core').Configuration.prototype.makeResolver.call({ plugins: new Map() }).constructor
  registry.set('../MultiResolver', { MultiResolver })

  const { ProdInstall } = require('./ProductionInstallCommand')

  return {
    commands: [
      ProdInstall,
    ],
  }
}

module.exports = {
  name: 'plugin-prod-install',
  factory,
}
`

async function main () {
  const filename = path.join(__dirname, '..', '.yarn', 'plugins', 'plugin-prod-install.cjs')
  const lines = template.split('\n')
  const registryIndex = lines.findIndex(line => /^\s+registry\.set/.test(line))
  lines.splice(registryIndex + 1, 0, createRegistryEntriesCode())
  const modulesIndex = lines.findIndex(line => /^module\.exports/.test(line))
  lines.splice(modulesIndex, 0, await createModulesCodes())
  fs.writeFileSync(filename, lines.join('\n'), 'utf8')
  console.log('Updated %s', filename)
}

main()
