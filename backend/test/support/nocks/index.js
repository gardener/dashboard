//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const nock = require('nock')

exports = module.exports = setup
exports.auth = require('./auth')
exports.k8s = require('./k8s')
exports.oidc = require('./oidc')
exports.github = require('./github')

function setup () {
  nock.disableNetConnect()
  nock.enableNetConnect('127.0.0.1')
}
exports.setup = setup

function teardown () {
  nock.cleanAll()
  nock.enableNetConnect()
}
exports.teardown = teardown

function verifyAndCleanAll () {
  try {
    // eslint-disable-next-line no-unused-expressions
    expect(nock.isDone()).to.be.true
  } catch (err) {
    console.error('pending mocks:', nock.pendingMocks())
    throw err
  } finally {
    nock.cleanAll()
  }
}
exports.verifyAndCleanAll = verifyAndCleanAll
