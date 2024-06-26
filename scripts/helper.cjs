//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { execSync  } = require('child_process')
const packageJson = require('../package.json')

const repodir = path.dirname(__dirname)

function getWorkspaces () {
  const today = new Date().toISOString().substring(0, 10)
  const hash = crypto.createHash('md5').update(JSON.stringify(packageJson.workspaces)).digest('hex')
  const filename = path.join(os.tmpdir(), `gardener-dashboard-${today}`, `workspaces.${hash}.json`)

  try {
    return JSON.parse(fs.readFileSync(filename,'utf8'))
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err
    }
  }

  const workspaces = execSync('yarn workspaces list --json')
    .toString('utf8')
    .split('\n')
    .filter(val => val.startsWith('{') && val.endsWith('}') )
    .map(val => JSON.parse(val))

  fs.mkdirSync(path.dirname(filename), { recursive: true })
  fs.writeFileSync(filename, JSON.stringify(workspaces), 'utf8')

  return workspaces
}

function findYarnWorkspace (filename) {
  const testfile = path.resolve(filename)
  const testfileLocation = testfile.substring(repodir.length+1)
  const workspaces = getWorkspaces()
  return workspaces.find(({ location }) => testfileLocation.startsWith(location))
}

module.exports = {
  findYarnWorkspace,
}
