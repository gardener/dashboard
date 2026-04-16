//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { defaultsDeep } from 'lodash-es'
import { randomNumber } from './helper.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function renderTemplatesFn (...paths) {
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
  let defaults
  try {
    const module = await import('./' + cwdPaths[0] + '.js')
    defaults = module.default
  } catch (err) {
    assert.fail(err.message)
  }
  const renderTemplate = (template, filename) => {
    const cmd = [
      'helm',
      'template',
      'gardener-dashboard',
      '-n',
      'garden',
      '-s',
      path.join(...tplPaths, `${template}.yaml`),
      '.',
      '-f',
      filename,
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

const renderDashboardRuntimeTemplates = await renderTemplatesFn(...gardenerDashboardRuntimeTemplates, 'dashboard')
const renderDashboardApplicationTemplates = await renderTemplatesFn(...gardenerDashboardApplicationTemplates, 'dashboard')

const renderIdentityTemplates = await renderTemplatesFn('identity')

export default {
  renderTemplatesFn,
  renderDashboardRuntimeTemplates,
  renderDashboardApplicationTemplates,
  renderIdentityTemplates,
}
