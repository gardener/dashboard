//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const fixtures = require('./__fixtures__')

beforeAll(function () {
  process.env.HELM_VALUES_DIRNAME = fs.mkdtempSync(path.join(os.tmpdir(), 'helm-'))
})

afterAll(function () {
  const dirname = process.env.HELM_VALUES_DIRNAME
  fs.rmSync(dirname, {
    maxRetries: 100,
    recursive: true,
  })
})

global.fixtures = fixtures
