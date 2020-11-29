//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { find } = require('lodash')
const { cloneDeepAndSetUid } = require('./helper')

function getCloudProfile (cloudProfileName, kind, seedSelector = {}) {
  const spec = {
    type: kind,
    seedSelector,
    kubernetes: {
      versions: [
        {
          version: '1.9.0'
        },
        {
          version: '1.8.5'
        }
      ]
    }
  }

  return {
    metadata: {
      name: cloudProfileName
    },
    spec
  }
}

const cloudProfileList = [
  getCloudProfile('infra1-profileName', 'infra1'),
  getCloudProfile('infra1-profileName2', 'infra1', {
    providerTypes: ['infra2', 'infra3']
  }),
  getCloudProfile('infra2-profileName', 'infra2'),
  getCloudProfile('infra3-profileName', 'infra3', {
    matchLabels: { foo: 'bar' }
  }),
  getCloudProfile('infra3-profileName2', 'infra3')
]

module.exports = {
  create (...args) {
    return getCloudProfile(...args)
  },
  get (name) {
    return find(this.list(), ['metadata.name', name])
  },
  list () {
    return cloneDeepAndSetUid(cloudProfileList)
  }
}
