//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { homedir } from 'os'
import { join } from 'path'
import fnv from 'fnv-plus'
import { v1 as uuidV1 } from 'uuid'
import {
  chain,
  reduce,
  set,
} from 'lodash-es'
import {
  dump as yamlDump,
  load as yamlLoad,
} from 'js-yaml'

function gardenerConfigPath () {
  return join(homedir(), '.gardener', 'config.yaml')
}

function setMetadataUid ({ metadata }, index) {
  if (metadata && !metadata.uid) {
    Object.defineProperty(metadata, 'uid', { value: index + 1 })
  }
}

function uuidv1 () {
  return uuidV1()
}

function cloneDeepAndSetUid (list) {
  return chain(list)
    .cloneDeep()
    .forEach(setMetadataUid)
    .value()
}

function hash (...args) {
  return fnv.hash(args.join('.'), 32).str()
}

function toHex (value) {
  return Buffer.from(value).toString('hex')
}

function fromHex (value) {
  return Buffer.from(value, 'hex').toString()
}

function toBase64 (value) {
  return Buffer.from(value).toString('base64')
}

function fromBase64 (value) {
  return Buffer.from(value, 'base64').toString()
}

function toYaml (value) {
  return yamlDump(value)
}

function fromYaml (value) {
  return yamlLoad(value)
}

function formatTime (time) {
  return new Date(time).toISOString().replace(/\.\d+Z/, 'Z')
}

function nextTick () {
  return new Promise(resolve => process.nextTick(resolve))
}

function delay (milliseconds) {
  return typeof milliseconds === 'number'
    ? new Promise(resolve => setTimeout(resolve, milliseconds))
    : nextTick()
}

function createUrl (headers) {
  const {
    ':path': path,
    ':scheme': scheme = 'https',
    ':authority': authority = 'localhost',
  } = headers
  return new URL(path, scheme + '://' + authority)
}

function parseSelector (name) {
  return obj => {
    let selector
    if (typeof obj === 'string') {
      selector = obj
    } else {
      if (obj && obj[':path']) {
        obj = createUrl(obj)
      }
      if (obj instanceof URL) {
        obj = obj.searchParams
      }
      if (obj instanceof URLSearchParams) {
        selector = obj.get(name)
      }
    }

    if (!selector) {
      return {}
    }

    return chain(selector)
      .split(',')
      .map(value => value.split('='))
      .fromPairs()
      .value()
  }
}

const parseLabelSelector = parseSelector('labelSelector')

function parseFieldSelector (obj) {
  const fields = parseSelector('fieldSelector')(obj)
  const iteratee = (accumulator, value, key) => set(accumulator, key, value)
  return reduce(fields, iteratee, {})
}

function createTestKubeconfig (user = { token: 'token' }, cluster = { server: 'server' }) {
  return toBase64(JSON.stringify({
    'current-context': 'default',
    contexts: [{
      name: 'default',
      context: {
        user: 'user',
        cluster: 'cluster',
      },
    }],
    users: [{
      name: 'user',
      user,
    }],
    clusters: [{
      name: 'cluster',
      cluster,
    }],
  }))
}

export {
  gardenerConfigPath,
  uuidv1,
  cloneDeepAndSetUid,
  hash,
  toHex,
  fromHex,
  toBase64,
  fromBase64,
  toYaml,
  fromYaml,
  formatTime,
  nextTick,
  delay,
  createUrl,
  parseLabelSelector,
  parseFieldSelector,
  createTestKubeconfig,
}
