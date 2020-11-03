//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

process.env.NODE_ENV = 'test'

delete process.env.HTTP_PROXY
delete process.env.http_proxy
delete process.env.HTTPS_PROXY
delete process.env.https_proxy

/*!
 * Common modules
 */
global.sinon = require('sinon')

/*!
 * Attach chai to global
 */
global.chai = require('chai')
global.expect = global.chai.expect

/*!
 * Chai Plugins
 */
global.chai.use(require('sinon-chai'))
global.chai.use(require('chai-http'))

/*!
 * Test Agent
 */
global.TestAgent = require('./TestAgent')
global.createAgent = app => new global.TestAgent(app)
