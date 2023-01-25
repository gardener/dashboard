//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const path = require('path')
const assert = require('assert/strict')
const childProcess = require('child_process')
const yaml = require('js-yaml')
const { defaultsDeep } = require('lodash')
const { randomNumber } = require('./helper')

function renderTemplatesFn (...paths) {
  let cwdPaths, tplPaths
  const index = paths.indexOf('templates')
  if (index !== -1) {
    cwdPaths = paths.slice(0, index)
    tplPaths = paths.slice(index)
  } else {
    cwdPaths = paths
    tplPaths = ['templates']
  }
  const cwd = path.resolve(__dirname, '..', ...cwdPaths)
  let name, defaults
  try {
    defaults = require('./' + cwdPaths[0])
    const data = fs.readFileSync(path.join(cwd, 'Chart.yaml'), 'utf8')
    name = yaml.load(data).name
  } catch (err) {
    assert.fail(err.message)
  }
  const renderTemplate = (template, filename) => {
    const cmd = [
      'helm',
      'template',
      name,
      '-n',
      'garden',
      '-s',
      path.join(...tplPaths, `${template}.yaml`),
      '.',
      '-f',
      filename
    ]
    return new Promise((resolve, reject) => {
      const { KUBECONFIG, ...env } = process.env
      childProcess.exec(cmd.join(' '), { env, cwd }, (err, stdout, stderr) => {
        if (err) {
          let message = err.message
          if (stderr) {
            for (const line of stderr.split('\n')) {
              if (!line || line.startsWith('walk.go:')) {
                continue
              }
              if (line.startsWith('Error:')) {
                message = line
                break
              }
              message = line
            }
          }
          if (/^Error: could not find template .* in chart$/.test(message)) {
            resolve(null)
          } else {
            reject(new Error(message))
          }
        } else {
          resolve(yaml.loadAll(stdout))
        }
      })
    })
  }
  return async (templates, values) => {
    defaultsDeep(values, defaults)
    const dirname = process.env.HELM_VALUES_DIRNAME
    assert.ok(fs.statSync(dirname).isDirectory(), `Invalid helm values directory "${dirname}"`)
    const filename = path.join(dirname, `values-${randomNumber()}.yaml`)
    try {
      fs.writeFileSync(filename, yaml.dump(values, { skipInvalid: true }))
      const documents = await Promise.all(templates.map(template => renderTemplate(template, filename)))
      return documents.flat()
    } finally {
      fs.unlinkSync(filename)
    }
  }
}

const gardenerDashboardRuntimeTemplates = ['gardener-dashboard', 'charts', 'runtime', 'templates']
const gardenerDashboardApplicationTemplates = ['gardener-dashboard', 'charts', 'application', 'templates']

const renderDashboardRuntimeTemplates = renderTemplatesFn(...gardenerDashboardRuntimeTemplates, 'dashboard')
const renderDashboardApplicationTemplates = renderTemplatesFn(...gardenerDashboardApplicationTemplates, 'dashboard')

const renderBootstrapperRuntimeTemplates = renderTemplatesFn(...gardenerDashboardRuntimeTemplates, 'bootstrapper')
const renderBootstrapperApplicationTemplates = renderTemplatesFn(...gardenerDashboardApplicationTemplates, 'bootstrapper')

const renderIdentityTemplates = renderTemplatesFn('identity')

module.exports = {
  renderTemplatesFn,
  renderDashboardRuntimeTemplates,
  renderDashboardApplicationTemplates,
  renderBootstrapperRuntimeTemplates,
  renderBootstrapperApplicationTemplates,
  renderIdentityTemplates
}
