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
      branches: 41.5,
      functions: 26.5,
      lines: 38.5,
      statements: 38.5
    }
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ]
}
