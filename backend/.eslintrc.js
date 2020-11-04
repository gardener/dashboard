// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

// http://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  // https://github.com/feross/standard/blob/master/RULES.md#javascript-standard-style
  extends: 'standard',
  // add your custom rules here
  rules: {
    // allow paren-less arrow functions
    'arrow-parens': 'off',
    // allow async-await
    'generator-star-spacing': 'off',
    // disallow the use of console
    'no-console': 'error',
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
  },
  globals: {
    describe: true,
    it: true,
    before: true,
    after: true,
    beforeEach: true,
    afterEach: true,
    chai: true,
    expect: true,
    sinon: true,
    support: true
  }
}
