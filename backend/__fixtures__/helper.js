//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { homedir } = require('os')
const { join } = require('path')
const fnv = require('fnv-plus')
const uuid = require('uuid')
const _ = require('lodash')
const yaml = require('js-yaml')

function gardenerConfigPath () {
  return join(homedir(), '.gardener', 'config.yaml')
}

function setMetadataUid ({ metadata }, index) {
  if (metadata && !metadata.uid) {
    Object.defineProperty(metadata, 'uid', { value: index + 1 })
  }
}

function uuidv1 () {
  return uuid.v1()
}

function cloneDeepAndSetUid (list) {
  return _
    .chain(list)
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
  return yaml.safeDump(value)
}

function fromYaml (value) {
  return yaml.safeLoad(value)
}

function formatTime (time) {
  return new Date(time).toISOString().replace(/\.\d+Z/, 'Z')
}

function nextTick () {
  return new Promise(resolve => process.nextTick(resolve))
}

function createUrl (headers) {
  const {
    ':path': path,
    ':scheme': scheme = 'https',
    ':authority': authority = 'localhost'
  } = headers
  return new URL(path, scheme + '://' + authority)
}

function parseLabelSelector (obj) {
  let labelSelector
  if (typeof obj === 'string') {
    labelSelector = obj
  } else {
    if (obj && obj[':path']) {
      obj = createUrl(obj)
    }
    if (obj instanceof URL) {
      obj = obj.searchParams
    }
    if (obj instanceof URLSearchParams) {
      labelSelector = obj.get('labelSelector')
    }
  }
  return _
    .chain(labelSelector)
    .split(',')
    .map(value => value.split('='))
    .fromPairs()
    .value()
}

module.exports = {
  createUrl,
  parseLabelSelector,
  gardenerConfigPath,
  cloneDeepAndSetUid,
  uuidv1,
  hash,
  fromBase64,
  toBase64,
  fromYaml,
  toYaml,
  fromHex,
  toHex,
  formatTime,
  nextTick
}
