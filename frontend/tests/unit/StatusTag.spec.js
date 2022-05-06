//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import Vuetify from 'vuetify'

// Components
import StatusTag from '@/components/StatusTag'

// Utilities
import { createLocalVue, shallowMount } from '@vue/test-utils'

describe('condition.vue', () => {
  const localVue = createLocalVue()
  localVue.use(Vuetify)
  let vuetify

  const shallowMountStatusTag = (condition, isAdmin = false) => {
    const wrapper = shallowMount(StatusTag, {
      localVue,
      vuetify,
      propsData: {
        condition
      },
      computed: {
        isAdmin () {
          return isAdmin
        }
      }
    })
    return wrapper
  }

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('should render healthy condition object', () => {
    const condition = {
      shortName: 'foo',
      name: 'foo-bar',
      status: 'True'
    }
    const wrapper = shallowMountStatusTag(condition)
    const vm = wrapper.vm
    expect(vm.chipText).toBe('foo')
    expect(vm.chipStatus).toBe('Healthy')
    expect(vm.chipTooltip.title).toBe('foo-bar')
    expect(vm.chipIcon).toBe('')
    expect(vm.isError || vm.isUnknown || vm.isProgressing).toBe(false)
    expect(vm.color).toBe('primary')
    expect(vm.visible).toBe(true)
  })

  it('should render condition with user error', () => {
    const condition = {
      shortName: 'foo',
      name: 'foo-bar',
      status: 'True',
      codes: [
        'ERR_CONFIGURATION_PROBLEM'
      ]
    }
    const wrapper = shallowMountStatusTag(condition)
    const vm = wrapper.vm
    expect(vm.chipText).toBe('foo')
    expect(vm.chipStatus).toBe('Error')
    expect(vm.isError).toBe(true)
    expect(vm.isUserError).toBe(true)
    expect(vm.chipIcon).toBe('mdi-account-alert-outline')
    expect(vm.color).toBe('error')
    expect(vm.visible).toBe(true)
  })

  it('should render accoring to admin status', () => {
    const condition = {
      shortName: 'foo',
      name: 'foo-bar',
      status: 'Progressing',
      showAdminOnly: true
    }
    let wrapper = shallowMountStatusTag(condition)
    const vm = wrapper.vm
    expect(vm.visible).toBe(false)
    expect(vm.isProgressing).toBe(true)
    expect(vm.color).toBe('primary')
    expect(vm.chipStatus).toBe('Progressing')
    expect(vm.chipIcon).toBe('')

    wrapper = shallowMountStatusTag(condition, true)
    const vmAdmin = wrapper.vm
    expect(vmAdmin.visible).toBe(true)
    expect(vmAdmin.isProgressing).toBe(true)
    expect(vmAdmin.color).toBe('info')
    expect(vmAdmin.chipStatus).toBe('Progressing')
    expect(vmAdmin.chipIcon).toBe('mdi-progress-alert')
  })
})
