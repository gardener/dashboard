//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, find } = require('lodash')

function getCloudProfile ({ uid, name, kind, seedSelector = {} }) {
  return {
    metadata: {
      name,
      uid,
    },
    spec: {
      type: kind,
      seedSelector,
      kubernetes: {
        versions: [
          {
            version: '1.9.0',
          },
          {
            version: '1.8.5',
          },
        ],
      },
    },
  }
}

const cloudProfileList = [
  getCloudProfile({
    uid: 1,
    name: 'infra1-profileName',
    kind: 'infra1',
  }),
  getCloudProfile({
    uid: 2,
    name: 'infra1-profileName2',
    kind: 'infra1',
    seedSelector: {
      providerTypes: ['infra2', 'infra3'],
    },
  }),
  getCloudProfile({
    uid: 3,
    name: 'infra2-profileName',
    kind: 'infra2',
  }),
  getCloudProfile({
    uid: 4,
    name: 'infra3-profileName',
    kind: 'infra3',
    seedSelector: {
      matchLabels: { foo: 'bar' },
    },
  }),
  getCloudProfile({
    uid: 5,
    name: 'infra3-profileName2',
    kind: 'infra3',
  }),
  getCloudProfile({
    uid: 6,
    name: 'infra4-profileName',
    kind: 'infra4',
    seedSelector: {
      providerTypes: ['*'],
    },
  }),
]

const cloudprofiles = {
  create (...args) {
    return getCloudProfile(...args)
  },
  get (name) {
    return find(this.list(), ['metadata.name', name])
  },
  list () {
    return cloneDeep(cloudProfileList)
  },
  reset () {},
}

module.exports = cloudprofiles
