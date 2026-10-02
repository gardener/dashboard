//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'

import GWorkerGroupExpirationMessage from '@/components/ShootMessages/GWorkerGroupExpirationMessage.vue'

describe('components', () => {
  describe('g-worker-group-expiration-message', () => {
    const defaultProps = {
      expirationDate: '2027-07-07T14:58:37Z',
      isValidTerminationDate: true,
      isExpired: false,
      version: '1.0.0',
      name: 'gardenlinux',
      workerName: 'worker-1',
      regularUpdate: false,
      forcedUpdate: false,
      noUpdate: false,
      supportedVersionAvailable: false,
    }

    function mountWorkerGroupExpirationMessage (props = {}) {
      return mount(GWorkerGroupExpirationMessage, {
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

    it('explains automatic image updates without implying that expiration caused them', () => {
      const wrapper = mountWorkerGroupExpirationMessage({
        regularUpdate: true,
      })

      expect(wrapper.text()).toContain('has a newer supported version available and will be updated automatically in the next maintenance window.')
      expect(wrapper.text()).not.toContain('expires')
    })

    it('keeps the expiration reason for forced image updates', () => {
      const wrapper = mountWorkerGroupExpirationMessage({
        forcedUpdate: true,
      })

      expect(wrapper.text()).toContain('expires')
      expect(wrapper.text()).toContain('Machine Image update will be enforced after that date')
    })
  })
})
