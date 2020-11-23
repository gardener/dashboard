//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeepAndSetUid } = require('./helper')

function getShoot ({
  namespace,
  name,
  uid,
  project,
  createdBy,
  purpose = 'foo-purpose',
  kind = 'fooInfra',
  profile = 'infra1-profileName',
  region = 'foo-west',
  secretBindingName = 'foo-secret',
  seed = 'infra1-seed',
  hibernation = { enabled: false },
  kubernetesVersion = '1.16.0'
}) {
  uid = uid || `${namespace}--${name}`
  const shoot = {
    metadata: {
      uid,
      name,
      namespace,
      annotations: {}
    },
    spec: {
      secretBindingName,
      cloudProfileName: profile,
      region,
      hibernation,
      provider: {
        type: kind
      },
      seedName: seed,
      kubernetes: {
        version: kubernetesVersion
      },
      purpose
    },
    status: {}
  }
  if (createdBy) {
    shoot.metadata.annotations['gardener.cloud/created-by'] = createdBy
  }
  if (project) {
    shoot.status.technicalID = `shoot--${project}--${name}`
  }
  return shoot
}

const shootList = [
  getShoot({
    name: 'fooShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'fooCreator',
    purpose: 'fooPurpose',
    secretBindingName: 'fooSecretName'
  }),
  getShoot({
    name: 'barShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'barCreator',
    purpose: 'barPurpose',
    secretBindingName: 'barSecretName'
  }),
  getShoot({
    name: 'dummyShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'fooCreator',
    purpose: 'fooPurpose',
    secretBindingName: 'barSecretName',
    seed: 'infra4-seed-without-secretRef'
  })
]

module.exports = {
  create (...args) {
    return getShoot(...args)
  },
  list () {
    return cloneDeepAndSetUid(shootList)
  }
}
