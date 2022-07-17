// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  preset: '@vue/cli-plugin-unit-jest',
  verbose: true,
  transformIgnorePatterns: ['\\.pnp\\.[^\\/]+$'],
  snapshotSerializers: [require.resolve('jest-serializer-vue')],
  coverageThreshold: {
    global: {
      branches: 42,
      functions: 27,
      lines: 39,
      statements: 39
    }
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ]
}
