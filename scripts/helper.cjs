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
const { workspaces } = require('../package.json')

const hash = crypto.createHash('md5').update(JSON.stringify(workspaces)).digest('hex')
const filename = path.join(os.tmpdir(), 'gardener-dashboard', `workspaces.${hash}.json`)

function getWorkspaces () {
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

module.exports = {
  getWorkspaces
}
