//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import noop from 'lodash/noop'
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
    projectList: () => projectList,
    shootByNamespaceAndName: () => noop
  }
})

function createNewShootDetailsComponent () {
  const propsData = {
    userInterActionBus: new EventEmitter()
  }
  const wrapper = mount(NewShootDetails, {
    vuetify,
    propsData,
    store,
    computed: {
      sortedKubernetesVersionsList: () => []
    }
  })
  const machineImageComponent = wrapper.find(NewShootDetails)
  return machineImageComponent.vm
}

describe('NewShootDetails.vue', function () {
  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('maximum shoot name length should depend on project name', function () {
    const shootDetails = createNewShootDetailsComponent()
    expect(shootDetails.maxShootNameLength).to.equal(16)
  })
})
