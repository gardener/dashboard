//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import GProjectListRow from '@/components/GProjectListRow.vue'
import GTextRouterLink from '@/components/GTextRouterLink.vue'

const { createVuetifyPlugin } = global.fixtures.helper

const project = {
  metadata: {
    name: 'core',
    uid: 'core-uid',
    creationTimestamp: '2026-01-01T00:00:00Z',
    annotations: {
      'dashboard.gardener.cloud/project-title': 'Core platform',
    },
  },
  spec: {
    description: 'Platform services for internal product teams',
    purpose: 'Production platform',
    owner: { name: 'owner@example.org' },
    createdBy: { name: 'creator@example.org' },
  },
  status: {
    phase: 'Ready',
  },
}

function mountRow ({
  project: projectValue = project,
  headers,
} = {}) {
  const pinia = createPinia()

  const wrapper = shallowMount(GProjectListRow, {
    props: {
      project: projectValue,
      headers: headers ?? [
        { key: 'name' },
        { key: 'status' },
      ],
    },
    global: {
      plugins: [
        createVuetifyPlugin(),
        pinia,
      ],
    },
  })
  return wrapper
}

describe('components GProjectListRow', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('leaves unset optional text and staleness cells empty', () => {
    const projectWithoutOptionalText = {
      ...project,
      metadata: {
        ...project.metadata,
        annotations: {},
      },
      spec: {
        ...project.spec,
        description: undefined,
        purpose: undefined,
      },
    }
    const wrapper = mountRow({
      project: projectWithoutOptionalText,
      headers: [
        { key: 'title' },
        { key: 'description' },
        { key: 'purpose' },
        { key: 'staleness' },
      ],
    })

    expect(wrapper.findAll('td').map(cell => cell.text())).toEqual(['', '', '', ''])
  })

  it('caps Project text cells and exposes their full text in tooltips', () => {
    const wrapper = mountRow({
      headers: [
        { key: 'title' },
        { key: 'description' },
        { key: 'purpose' },
      ],
    })
    const textCells = wrapper.findAll('.project-text')

    expect(textCells.map(cell => cell.text())).toEqual([
      'Core platform',
      'Platform services for internal product teams',
      'Production platform',
    ])
    expect(textCells.every(cell => cell.classes('text-truncate'))).toBe(true)
    expect(wrapper.vm.projectTitle).toBe('Core platform')
    expect(wrapper.vm.projectDescription).toBe('Platform services for internal product teams')
    expect(wrapper.vm.projectPurpose).toBe('Production platform')
  })

  it('links to the project workspace', () => {
    const wrapper = mountRow()

    expect(wrapper.findComponent(GTextRouterLink).props()).toMatchObject({
      text: 'core',
      to: {
        name: 'ShootList',
        params: { projectName: 'core' },
      },
    })
  })

  it('disables navigation while the Project is Pending', () => {
    const pendingProject = {
      ...project,
      status: { phase: 'Pending' },
    }
    const wrapper = mountRow({ project: pendingProject })

    expect(wrapper.findComponent(GTextRouterLink).exists()).toBe(false)
    expect(wrapper.find('[aria-disabled="true"]').text()).toBe('core')
  })
})
