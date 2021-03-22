//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import './matchMedia.mock' // Must be imported before the tested file
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
  const machineImageComponent = wrapper.findComponent(NewShootDetails)
  return machineImageComponent.vm
}

describe('NewShootDetails.vue', () => {
  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('maximum shoot name length should depend on project name', () => {
    const shootDetails = createNewShootDetailsComponent()
    expect(shootDetails.maxShootNameLength).toBe(18)
  })
})
