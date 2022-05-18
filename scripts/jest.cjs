#!/usr/bin/env node
//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const assert = require('assert').strict
const { spawn } = require('child_process')
const { findYarnWorkspace, findJestConfig } = require('./helper.cjs')

const args =  process.argv.slice(2)
const workspace = findYarnWorkspace(args[0])
assert(workspace, 'yarn workspace not found')

const jestConfig = findJestConfig(workspace)
assert(jestConfig, 'jest configuration not found')
process.argv.push('--config', jestConfig)

const cmd = spawn('yarn',  ['workspace', workspace.name, 'run', 'test', ...args], { 
  stdio: 'inherit' 
})
cmd.on('error', err => {
  console.error(err.message)
})
cmd.on('exit', code => process.exit(code))
