//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, find } = require('lodash')

function getNamespacedCloudProfile ({ uid, name, namespace, parentName, kind, seedSelector = {} }) {
  return {
    metadata: {
      name,
      namespace,
      uid,
    },
    spec: {
      parent: {
        kind: 'CloudProfile',
        name: parentName,
      },
      kubernetes: {
        versions: [
          {
            version: '1.31.1',
            expirationDate: '2025-02-28T23:59:59Z',
          },
        ],
      },
      machineTypes: [
        {
          name: `${kind}-large`,
          cpu: '4',
          gpu: '0',
          memory: '16Gi',
          usable: true,
        },
      ],
    },
    status: {
      cloudProfileSpec: {
        type: kind,
        seedSelector,
        kubernetes: {
          versions: [
            {
              version: '1.31.1',
              expirationDate: '2025-02-28T23:59:59Z',
            },
            {
              version: '1.30.8',
            },
            {
              version: '1.29.10',
            },
          ],
        },
        machineTypes: [
          {
            name: `${kind}-large`,
            cpu: '4',
            gpu: '0',
            memory: '16Gi',
            usable: true,
          },
          {
            name: `${kind}-medium`,
            cpu: '2',
            gpu: '0',
            memory: '8Gi',
            usable: true,
          },
        ],
        machineImages: [
          {
            name: 'gardenlinux',
            versions: [
              {
                version: '15.4.20220818',
              },
            ],
          },
        ],
        regions: [
          {
            name: 'europe-central-1',
            zones: [
              {
                name: 'europe-central-1a',
              },
            ],
          },
        ],
      },
    },
  }
}

const namespacedCloudProfileList = [
  getNamespacedCloudProfile({
    uid: 1001,
    name: 'custom-cloudprofile-1',
    namespace: 'garden-local',
    parentName: 'local',
    kind: 'local',
  }),
  getNamespacedCloudProfile({
    uid: 1002,
    name: 'custom-cloudprofile-2',
    namespace: 'garden-local',
    parentName: 'infra1-profileName',
    kind: 'infra1',
    seedSelector: {
      matchLabels: { env: 'dev' },
    },
  }),
  getNamespacedCloudProfile({
    uid: 1003,
    name: 'custom-cloudprofile-3',
    namespace: 'garden-dev',
    parentName: 'infra2-profileName',
    kind: 'infra2',
  }),
]

const namespacedCloudProfiles = {
  create (...args) {
    return getNamespacedCloudProfile(...args)
  },
  get (namespace, name) {
    return find(this.list(namespace), ['metadata.name', name])
  },
  list (namespace) {
    const items = cloneDeep(namespacedCloudProfileList)
    if (!namespace || namespace === '_all') {
      return items
    }
    return items.filter(item => item.metadata.namespace === namespace)
  },
  reset () {},
}

module.exports = namespacedCloudProfiles
