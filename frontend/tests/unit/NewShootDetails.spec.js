//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import EventEmitter from 'events'
import Vuex from 'vuex'
import Vuetify from 'vuetify'
import Vuelidate from 'vuelidate'

// Components
import NewShootDetails from '@/components/NewShoot/NewShootDetails'

// Utilities
import { createLocalVue, mount } from '@vue/test-utils'

describe('NewShootDetails.vue', () => {
  const localVue = createLocalVue()
  localVue.use(Vuelidate)
  localVue.use(Vuex)

  let vuetify
  let store

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

  beforeEach(() => {
    vuetify = new Vuetify()
    store = new Vuex.Store({
      state: {
        namespace: 'garden-foo',
        cfg: {}
      },
      getters: {
        projectList: jest.fn().mockReturnValue(projectList),
        shootByNamespaceAndName: jest.fn()
      }
    })
  })

  it('maximum shoot name length should depend on project name', () => {
    const wrapper = mount(NewShootDetails, {
      localVue,
      store,
      vuetify,
      propsData: {
        userInterActionBus: new EventEmitter()
      },
      computed: {
        sortedKubernetesVersionsList: jest.fn().mockReturnValue([])
      }
    })
    expect(wrapper.vm.maxShootNameLength).toBe(18)
  })
})
