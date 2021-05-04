// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  preset: '@vue/cli-plugin-unit-jest',
  verbose: true,
  transformIgnorePatterns: ['\\.pnp\\.[^\\/]+$'],
  snapshotSerializers: [require.resolve('jest-serializer-vue')],
  testEnvironment: require.resolve('jest-environment-jsdom-fifteen'),
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 30,
      lines: 42,
      statements: 42
    }
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ]
}
