//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const util = require('util')
const path = require('path')
const assert = require('assert/strict')
const childProcess = require('child_process')
const exec = util.promisify(childProcess.exec)
const yaml = require('js-yaml')
const { flatMap, defaultsDeep } = require('lodash')
const { randomNumber } = require('./helper')

async function renderChartTemplates (chart, templates, values) {
  let name
  try {
    const { defaults, releaseName } = require('./' + chart)
    name = releaseName
    defaultsDeep(values, defaults)
  } catch (err) {
    assert.fail(`Invalid chart "${chart}"`)
  }
  const dirname = process.env.HELM_VALUES_DIRNAME
  assert.ok(fs.statSync(dirname).isDirectory(), `Invalid helm values directory "${dirname}"`)
  const filename = path.join(dirname, `values-${randomNumber()}.yaml`)
  try {
    fs.writeFileSync(filename, yaml.safeDump(values, { skipInvalid: true }))
    const cmd = [
      '/usr/local/bin/helm',
      'template',
      name,
      '-n',
      'garden',
      ...flatMap(templates, template => ['-s', `templates/${template}.yaml`]),
      '.',
      '-f',
      filename
    ]
    const cwd = path.resolve(__dirname, '..', chart)
    const { stdout } = await exec(cmd.join(' '), { cwd })
    return yaml.safeLoadAll(stdout)
  } finally {
    fs.unlinkSync(filename)
  }
}

module.exports = {
  renderChartTemplates
}
