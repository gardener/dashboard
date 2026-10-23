//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'

import GK8sExpirationMessage from '@/components/ShootMessages/GK8sExpirationMessage.vue'

describe('components', () => {
  describe('g-k8s-expiration-message', () => {
    const defaultProps = {
      expirationDate: '2027-07-07T14:58:37Z',
      isValidTerminationDate: true,
      isExpired: false,
      version: '1.35.5',
      regularUpdate: false,
      forcedUpdate: false,
      noUpdate: false,
    }

    function mountK8sExpirationMessage (props = {}) {
      return mount(GK8sExpirationMessage, {
        global: {
          stubs: {
            GTimeString: true,
          },
        },
        props: {
          ...defaultProps,
          ...props,
        },
      })
    }

    it('explains automatic patch updates without implying that expiration caused them', () => {
      const wrapper = mountK8sExpirationMessage({
        regularUpdate: true,
      })

      expect(wrapper.text()).toContain('has a newer supported patch version available and will be updated automatically in the next maintenance window.')
      expect(wrapper.text()).not.toContain('expires')
    })

    it('keeps the expiration reason for forced updates', () => {
      const wrapper = mountK8sExpirationMessage({
        forcedUpdate: true,
      })

      expect(wrapper.text()).toContain('expires')
      expect(wrapper.text()).toContain('Version update will be enforced after that date')
    })
  })
})
