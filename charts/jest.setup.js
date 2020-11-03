//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const path = require('path')
const util = require('util')
const childProcess = require('child_process')
const exec = util.promisify(childProcess.exec)
const yaml = require('js-yaml')

async function helmTemplate (template, pathToValues) {
  const cwd = path.resolve(__dirname, template)
  const cmd = [
    '/usr/local/bin/helm',
    'template',
    template,
    '.',
    '--values',
    pathToValues
  ]
  const { stdout } = await exec(cmd.join(' '), { cwd })
  return yaml.safeLoadAll(stdout)
}
global.helmTemplate = helmTemplate
