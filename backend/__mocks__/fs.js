//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fixtures = require('../__fixtures__')

const fs = jest.createMockFromModule('../utils')

const mockFiles = new Map()

__setMockFiles(fixtures.mockFiles)

function __setMockFiles (files) {
  mockFiles.clear()
  const entries = Object.entries({
    ...fixtures.mockFiles,
    ...files
  })
  for (const args of entries) {
    mockFiles.set(...args)
  }
}

fs.readFileSync = jest.fn(path => {
  if (!mockFiles.has(path)) {
    const code = 'ENOENT'
    throw Object.assign(new Error(`${code}: no such file or directory, open '${path}'`), {
      code,
      path
    })
  }
  return mockFiles.get(path)
})

fs.existsSync = jest.fn(path => {
  return mockFiles.has(path)
})

fs.__setMockFiles = __setMockFiles

module.exports = fs
