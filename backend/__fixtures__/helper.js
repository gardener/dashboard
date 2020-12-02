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

function toBase64 (value) {
  return Buffer.from(value).toString('base64')
}

function formatTime (time) {
  return new Date(time).toISOString().replace(/\.\d+Z/, 'Z')
}

function nextTick () {
  return new Promise(resolve => process.nextTick(resolve))
}

module.exports = {
  gardenerConfigPath,
  cloneDeepAndSetUid,
  uuidv1,
  hash,
  toBase64,
  toHex,
  formatTime,
  nextTick
}
