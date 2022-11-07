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

function renderTemplatesFn (...paths) {
  const cwd = path.resolve(__dirname, '..', ...paths)
  let name, defaults
  try {
    defaults = require('./' + paths[0])
    const data = fs.readFileSync(path.join(cwd, 'Chart.yaml'), 'utf8')
    name = yaml.load(data).name
  } catch (err) {
    assert.fail(`Invalid chart "${path.join(paths)}"`)
  }
  return async (templates, values) => {
    defaultsDeep(values, defaults)
    const dirname = process.env.HELM_VALUES_DIRNAME
    assert.ok(fs.statSync(dirname).isDirectory(), `Invalid helm values directory "${dirname}"`)
    const filename = path.join(dirname, `values-${randomNumber()}.yaml`)
    try {
      fs.writeFileSync(filename, yaml.dump(values, { skipInvalid: true }))
      const cmd = [
        'helm',
        'template',
        name,
        '-n',
        'garden',
        ...flatMap(templates, template => ['-s', `templates/${template}.yaml`]),
        '.',
        '-f',
        filename
      ]
      const { stdout } = await exec(cmd.join(' '), { cwd })
      return yaml.loadAll(stdout)
    } finally {
      fs.unlinkSync(filename)
    }
  }
}

module.exports = {
  renderTemplatesFn
}
