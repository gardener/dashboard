#!/usr/bin/env node
//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const path = require('path')
const { getWorkspaces } = require('./helper.cjs')
const { spawn } = require('child_process')

const workspaces = getWorkspaces()

const repodir = path.dirname(__dirname)
const args =  process.argv.slice(2)
const testfile = path.resolve(args[0])
const testfileLocation = testfile.substring(repodir.length+1)
const workspace = workspaces.find(({ location }) => testfileLocation.startsWith(location))
if (workspace) {
  process.argv.push('--config', path.join(repodir, workspace.location, 'package.json'))
}

const cmd = spawn('yarn',  ['workspace', workspace.name, 'run', 'test', ...args], { 
  stdio: 'inherit' 
})
cmd.on('error', err => {
  console.error('Error: %s', err.message)
})
cmd.on('exit', code => process.exit(code))
