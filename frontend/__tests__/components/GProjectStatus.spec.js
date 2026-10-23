//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'

import GNotReadyProjectWarning from '@/components/GNotReadyProjectWarning.vue'
import GProjectStatus from '@/components/GProjectStatus.vue'

const { createVuetifyPlugin } = global.fixtures.helper

function mountStatus (phase, { deletionTimestamp, showStatusText = false } = {}) {
  return shallowMount(GProjectStatus, {
    props: {
      project: {
        metadata: { deletionTimestamp },
        status: { phase },
      },
      showStatusText,
    },
    global: {
      plugins: [createVuetifyPlugin()],
    },
  })
}

describe('components GProjectStatus', () => {
  it('renders a success icon for a ready project', () => {
    const wrapper = mountStatus('Ready')

    expect(wrapper.find('.status-icon-check').exists()).toBe(true)
    expect(wrapper.findComponent(GNotReadyProjectWarning).exists()).toBe(false)
  })

  it('shows the deletion status instead of success', () => {
    const wrapper = mountStatus('Ready', {
      deletionTimestamp: '2026-02-01T00:00:00Z',
      showStatusText: true,
    })

    expect(wrapper.find('.status-icon-check').exists()).toBe(false)
    expect(wrapper.findComponent(GNotReadyProjectWarning).exists()).toBe(true)
    expect(wrapper.text()).toContain('Deleting')
  })
})
