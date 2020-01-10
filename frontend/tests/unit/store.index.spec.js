//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import Vuex from 'vuex'
import { expect } from 'chai'
import { state, actions, getters, mutations, modules } from '@/store'
import find from 'lodash/find'

describe('Store', function () {
  it('should transform machine images from cloud profile', function () {
    const cpMachineImages = [
      {
        'name': 'coreos',
        'versions': [
          {
            'version': '2135.6.0'
          }
        ]
      },
      {
        'name': 'suse-jeos',
        'versions': [
          {
            'version': '15.1.20190927'
          },
          {
            'version': '15.1.20191027',
            'expirationDate': '2119-04-05T01:02:03Z' // not expired
          },
          {
            'version': '15.1.20191127',
            'expirationDate': '2019-04-05T01:02:03Z' // expired
          }
        ]
      },
      {
        'name': 'foo',
        'versions': [
          {
            'version': '1.02.3' // invalid version (not semver compatible)
          },
          {
            'version': '1.2.3'
          }
        ]
      }
    ]

    state.cloudProfiles.all = [
      {
        data: {
          machineImages: cpMachineImages
        },
        metadata: {
          name: 'foo'
        }
      }
    ]

    const store = new Vuex.Store({
      state,
      actions,
      getters,
      mutations,
      modules
    })

    const dashboardMachineImages = store.getters.machineImagesByCloudProfileName('foo')
    expect(dashboardMachineImages).to.have.length(4)

    const expiredImage = find(dashboardMachineImages, { name: 'suse-jeos', version: '15.1.20191127' })
    expect(expiredImage).to.equal(undefined)

    const invalidImage = find(dashboardMachineImages, { name: 'foo', version: '1.02.3' })
    expect(invalidImage).to.equal(undefined)

    const suseImage = find(dashboardMachineImages, { name: 'suse-jeos', version: '15.1.20191027' })
    expect(suseImage.expirationDate).to.equal('2119-04-05T01:02:03Z')
    expect(suseImage.expirationDateString).to.not.equal(undefined)
    expect(suseImage.vendorName).to.equal('suse-jeos')
    expect(suseImage.icon).to.equal('suse-jeos')
    expect(suseImage.needsLicense).to.equal(true)
    expect(suseImage).to.equal(dashboardMachineImages[1]) // check sorting

    const fooImage = find(dashboardMachineImages, { name: 'foo', version: '1.2.3' })
    expect(fooImage.icon).to.equal('mdi-blur-radial')
    expect(fooImage.needsLicense).to.equal(false)
  })

  it('should should filter kubernetes versions from cloud profile', function () {
    const kubernetesVersions = [
      {
        'version': '1.13.4'
      },
      {
        'expirationDate': '2120-04-12T23:59:59Z', // not expired
        'version': '1.16.3'
      },
      {
        'expirationDate': '2019-03-15T23:59:59Z', // expired
        'version': '1.16.2'
      },
      {
        'version': '1.06.2' // invalid version (not semver compatible)
      }
    ]

    state.cloudProfiles.all = [
      {
        data: {
          kubernetes: {
            versions: kubernetesVersions
          }
        },
        metadata: {
          name: 'foo'
        }
      }
    ]

    const store = new Vuex.Store({
      state,
      actions,
      getters,
      mutations,
      modules
    })

    const dashboardVersions = store.getters.sortedKubernetesVersions('foo')
    expect(dashboardVersions).to.have.length(2)

    const expiredVersion = find(dashboardVersions, { version: '1.16.2' })
    expect(expiredVersion).to.equal(undefined)

    const invalidVersion = find(dashboardVersions, { version: '1.06.2' })
    expect(invalidVersion).to.equal(undefined)

    const kubernetesVersion = find(dashboardVersions, { version: '1.16.3' })
    expect(kubernetesVersion.expirationDate).to.equal('2120-04-12T23:59:59Z')
    expect(kubernetesVersion.expirationDateString).to.not.equal(undefined)
    expect(kubernetesVersion).to.equal(dashboardVersions[0]) // check sorting
  })
})
