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

export function gardenerConfigPath () {
  return join(homedir(), '.gardener', 'config.yaml')
}

function setMetadataUid ({ metadata }, index) {
  if (metadata && !metadata.uid) {
    Object.defineProperty(metadata, 'uid', { value: index + 1 })
  }
}

export function uuidv1 () {
  return uuidV1()
}

export function cloneDeepAndSetUid (list) {
  return chain(list)
    .cloneDeep()
    .forEach(setMetadataUid)
    .value()
}

export function hash (...args) {
  return fnv.hash(args.join('.'), 32).str()
}

export function toHex (value) {
  return Buffer.from(value).toString('hex')
}

export function fromHex (value) {
  return Buffer.from(value, 'hex').toString()
}

export function toBase64 (value) {
  return Buffer.from(value).toString('base64')
}

export function fromBase64 (value) {
  return Buffer.from(value, 'base64').toString()
}

export function toYaml (value) {
  return yamlDump(value)
}

export function fromYaml (value) {
  return yamlLoad(value)
}

export function formatTime (time) {
  return new Date(time).toISOString().replace(/\.\d+Z/, 'Z')
}

export function nextTick () {
  return new Promise(resolve => process.nextTick(resolve))
}

export function delay (milliseconds) {
  return typeof milliseconds === 'number'
    ? new Promise(resolve => setTimeout(resolve, milliseconds))
    : nextTick()
}

export function createUrl (headers) {
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

export const parseLabelSelector = parseSelector('labelSelector')

export function parseFieldSelector (obj) {
  const fields = parseSelector('fieldSelector')(obj)
  const iteratee = (accumulator, value, key) => set(accumulator, key, value)
  return reduce(fields, iteratee, {})
}

export function createTestKubeconfig (user = { token: 'token' }, cluster = { server: 'server' }) {
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
