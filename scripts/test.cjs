#!/usr/bin/env node
//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const assert = require('assert').strict
const { spawn } = require('child_process')
const { findYarnWorkspace } = require('./helper.cjs')

const args =  process.argv.slice(2)
const workspace = findYarnWorkspace(args[0])
assert(workspace, 'yarn workspace not found')

const cmd = spawn('yarn', ['workspace', workspace.name, 'run', 'test', ...args], {
  stdio: 'inherit'
})
cmd.once('error', err => process.stderr.write(err.message + '\n'))
cmd.once('exit', code => process.exit(code))
