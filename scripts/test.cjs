#!/usr/bin/env node
//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
const path = require('path')

const assert = require('assert').strict
const { spawn } = require('child_process')
const { findYarnWorkspace } = require('./helper.cjs')

const runnerArg = process.argv.find(a => a.startsWith('--runner='))
const runner = runnerArg?.split('=')[1]
assert(runner === 'jest' || runner === 'vitest', 'Use --runner=jest|vitest')

// remove it so it doesn't get passed to the test runner
process.argv = process.argv.filter(a => !a.startsWith('--runner='))

const isDebug = process.env.VS_DEBUG === '1'

// vitest has additional run parameters, so we need to adjust the arguments accordingly
const start = process.argv[2] === 'run' ? 3 : 2;
const baseArgs = process.argv.slice(start);
let testFile = baseArgs[0]

assert(testFile, 'Missing test file argument')

const workspace = findYarnWorkspace(testFile)
assert(workspace, 'yarn workspace not found')

const args = [...baseArgs]

// Runner-specific behavior (no external flags expected)
if (runner === 'vitest') {
  if (isDebug) {
    args.push('--testTimeout=0')
    args.push('--pool=forks', '--poolOptions.forks.singleFork')
  }
} else {
  if (isDebug) {
    args.push('--runInBand')
    args.push('--testTimeout=99999999')
  }
}

const cmd = spawn('yarn', ['workspace', workspace.name, 'run', 'test', ...args], {
  stdio: 'inherit',
  env: process.env
})

cmd.once('error', err => process.stderr.write(err.message + '\n'))
cmd.once('exit', code => process.exit(code ?? 1))
