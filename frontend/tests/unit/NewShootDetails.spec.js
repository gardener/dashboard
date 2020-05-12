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

import { expect } from 'chai'
import { mount } from '@vue/test-utils'
import NewShootDetails from '@/components/NewShoot/NewShootDetails.vue'
import Vue from 'vue'
import Vuex from 'vuex'
import Vuetify from 'vuetify'
import Vuelidate from 'vuelidate'
const EventEmitter = require('events')

Vue.use(Vuetify)
Vue.use(Vuelidate)
Vue.use(Vuex)

// see issue https://github.com/vuejs/vue-test-utils/issues/974#issuecomment-423721358
global.requestAnimationFrame = cb => cb()

let vuetify

const projectList = [
  {
    metadata: {
      name: 'foo',
      namespace: 'garden-foo'
    },
    data: {
      owner: 'owner'
    }
  }
]

const store = new Vuex.Store({
  state: {
    namespace: 'garden-foo',
    cfg: {}
  },
  getters: {
    projectList: () => {
      return projectList
    }
  }
})

const sampleVersions = [
  {
    version: '1.1.1'
  },
  {
    version: '1.1.2'
  },
  {
    version: '1.2.4'
  },
  {
    version: '3.3.2'
  }
]

function createNewShootDetailsComponent (kubernetesVersion) {
  const propsData = {
    userInterActionBus: new EventEmitter()
  }
  const wrapper = mount(NewShootDetails, {
    vuetify,
    propsData,
    store,
    computed: {
      sortedKubernetesVersionsList: () => sampleVersions
    }
  })
  const machineImageComponent = wrapper.find(NewShootDetails)
  machineImageComponent.vm.setDetailsData({ kubernetesVersion })

  return machineImageComponent.vm
}

describe('NewShootDetails.vue', function () {
  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('selected kubernetes version should be latest (multiple same minor)', function () {
    const shootDetails = createNewShootDetailsComponent(sampleVersions[1].version)
    expect(shootDetails.versionIsNotLatestPatch).to.be.false
  })

  it('selected kubernetes version should be latest (one minor)', function () {
    const shootDetails = createNewShootDetailsComponent(sampleVersions[2].version)
    expect(shootDetails.versionIsNotLatestPatch).to.be.false
  })

  it('selected kubernetes version should not be latest', function () {
    const shootDetails = createNewShootDetailsComponent(sampleVersions[0].version)
    expect(shootDetails.versionIsNotLatestPatch).to.be.true
  })

  it('maximum shoot name length should depend on project name', function () {
    const shootDetails = createNewShootDetailsComponent()
    expect(shootDetails.maxShootNameLength).to.equal(18)
  })
})
