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
  }
}
