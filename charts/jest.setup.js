//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const path = require('path')
const util = require('util')
const childProcess = require('child_process')
const exec = util.promisify(childProcess.exec)
const yaml = require('js-yaml')
const { flatMap } = require('lodash')

async function helmTemplate (chart, templates, pathToValues) {
  const cwd = path.resolve(__dirname, chart)
  const cmd = [
    '/usr/local/bin/helm',
    'template',
    ...flatMap(templates, template => ['-s', `templates/${template}.yaml`]),
    '.',
    '--values',
    pathToValues
  ]
  const { stdout } = await exec(cmd.join(' '), { cwd })
  return yaml.safeLoadAll(stdout)
}
global.helmTemplate = helmTemplate
