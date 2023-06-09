//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import Vuex from 'vuex'
import Vuetify from 'vuetify'

// Components
import MainNavigation from '@/components/MainNavigation'

// Utilities
import { createLocalVue, mount } from '@vue/test-utils'

function createProjectList (names) {
  return names.map(name => {
    return {
      metadata: {
        name,
        namespace: `garden-${name}`
      },
      data: {
        owner: 'owner'
      }
    }
  })
}

describe('MainNavigation.vue', () => {
  const localVue = createLocalVue()
  localVue.use(Vuetify)
  localVue.use(Vuex)

  let vuetify
  let store
  let getters
  let actions

  const $route = {
    name: 'bar',
    path: '/'
  }

  const $router = {
    options: {
      routes: [
        {
          path: '/',
          children: [
            {
              path: '',
              name: 'bar',
              meta: {
                menu: {
                  title: 'bar',
                  icon: 'icon-foo'
                }
              }
            }
          ]
        }
      ]
    },
    push: jest.fn()
  }

  const mountMainNavigation = async () => {
    const wrapper = mount(MainNavigation, {
      localVue,
      vuetify,
      store,
      mocks: {
        $route,
        $router
      },
      stubs: [
        'ProjectCreateDialog',
        'RouterLink',
        'StaleProjectWarning'
      ]
    })
    await wrapper.setData({ projectMenu: true })
    return wrapper
  }

  beforeEach(() => {
    vuetify = new Vuetify()
    getters = {
      canCreateProject: jest.fn().mockReturnValue(true),
      projectList: jest.fn().mockReturnValue(createProjectList(['foo', 'bar'])),
      branding: jest.fn().mockReturnValue({})
    }
    actions = {
      setSidebar: jest.fn()
    }
    store = new Vuex.Store({
      state: {
        namespace: 'foo',
        sidebar: true,
        cfg: {}
      },
      getters,
      actions
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should have correct element and css class hierarchy', async () => {
    const wrapper = await mountMainNavigation()

    const topArea = wrapper.find('.v-navigation-drawer .teaser > .content')
    expect(topArea.exists()).toBe(true)

    const projectSelector = wrapper.find('.v-navigation-drawer .project-selector')
    expect(projectSelector.exists()).toBe(true)

    const listTitle = wrapper.find('.v-navigation-drawer .v-list .v-list-item__title')
    expect(listTitle.exists()).toBe(true)

    const mainMenu = wrapper.findComponent({ ref: 'mainMenu' })
    const listTile = mainMenu.find('.v-list-item__title')
    expect(listTile.exists()).toBe(true)

    const projectMenuCard = wrapper.find('.v-navigation-drawer .project-menu')
    expect(projectMenuCard.exists()).toBe(true)

    const projectMenu = wrapper.find('.v-navigation-drawer .project-menu .v-card .project-list')
    expect(projectMenu.exists()).toBe(true)
  })

  it('Filter input should be invisible in case of less than 3 projects', async () => {
    const wrapper = await mountMainNavigation()
    const projectFilterInput = wrapper.findComponent({ ref: 'projectFilter' })
    expect(projectFilterInput.exists()).toBe(false)
  })

  it('Filter input should be visible in case of more than 3 projects', async () => {
    getters.projectList.mockReturnValue(createProjectList(['foo', 'bar', 'baz', 'foobar']))
    const wrapper = await mountMainNavigation()
    const projectFilterInput = wrapper.findComponent({ ref: 'projectFilter' })
    expect(projectFilterInput.exists()).toBe(true)
  })

  it('Project list should be filtered by input', async () => {
    const projects = createProjectList(['foo', 'bar', 'fooz', 'foobar'])
    getters.projectList.mockReturnValue(projects)
    const wrapper = await mountMainNavigation()
    let projectList

    projectList = wrapper.vm.sortedAndFilteredProjectListWithAllProjects
    expect(projectList).toHaveLength(5)
    expect(projectList[1].metadata.name).toBe('bar')

    const projectFilterWrapper = wrapper.findComponent({ ref: 'projectFilter' })
    expect(projectFilterWrapper.exists()).toBe(true)
    const projectFilterInputWrapper = projectFilterWrapper.findComponent({ ref: 'input' })
    expect(projectFilterInputWrapper.exists()).toBe(true)
    await projectFilterInputWrapper.setValue('foo')

    projectList = wrapper.vm.sortedAndFilteredProjectListWithAllProjects
    expect(projectList).toHaveLength(4)
    expect(projectList[1].metadata.name).toBe('foo')

    const projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    const exactMatchListTile = projectListWrapper.findAll('.project-list-tile').at(1)
    expect(exactMatchListTile.classes()).toEqual(expect.arrayContaining(['highlighted-item']))
  })

  it('Projects can be highlighted via arrow keys', async () => {
    const projects = createProjectList(['a', 'b', 'c', 'd'])
    getters.projectList.mockReturnValue(projects)
    const wrapper = await mountMainNavigation()
    const projectMenuButton = wrapper.find('.v-navigation-drawer .project-selector .v-btn__content')

    expect(wrapper.vm.highlightedProjectName).toBeUndefined() // undefined == first item == All Projects
    const mockScrollIntoView = jest.spyOn(wrapper.vm, 'scrollIntoView')
    projectMenuButton.trigger('keydown.down')
    // 2nd item is 1st in storeProjectList as vm projectList has 'all projects' item
    expect(wrapper.vm.highlightedProjectName).toBe(projects[0].metadata.name)
    projectMenuButton.trigger('keydown.down')
    expect(wrapper.vm.highlightedProject()).toBe(projects[1])
    projectMenuButton.trigger('keydown.up')
    expect(wrapper.vm.highlightedProject()).toBe(projects[0])

    const projectFilterInput = wrapper.find('input')
    projectFilterInput.trigger('keydown.down')
    projectFilterInput.trigger('keydown.down')
    expect(wrapper.vm.highlightedProject()).toBe(projects[2])
    projectFilterInput.trigger('keydown.up')
    expect(wrapper.vm.highlightedProject()).toBe(projects[1])
    expect(mockScrollIntoView).toHaveBeenCalledTimes(6)
  })

  it('Project list rendering should be lazy', async () => {
    const projects = createProjectList(['foo', 'bar', 'fooz', 'foobar', 'foozz', 'foobarz'])
    getters.projectList.mockReturnValue(projects)
    const wrapper = await mountMainNavigation()
    await wrapper.setData({ numberOfVisibleProjects: 5 })
    let projectListWrapper

    projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    expect(wrapper.vm.visibleProjectList.length).toBe(5)
    expect(projectListWrapper.vm.$children.length).toBe(5)

    const projectFilterInput = wrapper.find('input')
    await Promise.all([
      projectFilterInput.trigger('keydown.down'),
      projectFilterInput.trigger('keydown.down'),
      projectFilterInput.trigger('keydown.down'),
      projectFilterInput.trigger('keydown.down'),
      projectFilterInput.trigger('keydown.down'),
      projectFilterInput.trigger('keydown.down')
    ])

    projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    expect(wrapper.vm.visibleProjectList.length).toBe(7)
    expect(projectListWrapper.vm.$children.length).toBe(7)
  })

  it('Project list scrolling should trigger lazy rendering', async () => {
    const projects = createProjectList(['foo', 'bar', 'fooz', 'foobar', 'foozz', 'foobarz'])
    getters.projectList.mockReturnValue(projects)
    const wrapper = await mountMainNavigation()
    await wrapper.setData({ numberOfVisibleProjects: 5 })
    let projectListWrapper

    projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    expect(wrapper.vm.visibleProjectList.length).toBe(5)
    expect(projectListWrapper.vm.$children.length).toBe(5)

    // stub bounding rect method to simulate actual scrolling
    const boundingRectStub = jest.spyOn(window.HTMLElement.prototype, 'getBoundingClientRect')
    boundingRectStub.mockReturnValueOnce({ top: 200 })
    boundingRectStub.mockReturnValueOnce({ height: 200 })
    boundingRectStub.mockReturnValueOnce({ top: 300 }) // scrolled into view
    await projectListWrapper.trigger('scroll') // scroll last element into view

    projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    expect(wrapper.vm.visibleProjectList.length).toBe(6)
    expect(projectListWrapper.vm.$children.length).toBe(6)

    boundingRectStub.mockReset()
    boundingRectStub.mockReturnValueOnce({ top: 200 })
    boundingRectStub.mockReturnValueOnce({ height: 200 })
    boundingRectStub.mockReturnValueOnce({ top: 500 }) // NOT scrolled into view
    await projectListWrapper.trigger('scroll') // scrolled, but NOT scrolled last element into view

    projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    expect(wrapper.vm.visibleProjectList.length).toBe(6)
    expect(projectListWrapper.vm.$children.length).toBe(6)

    boundingRectStub.mockReset()
    boundingRectStub.mockReturnValueOnce({ top: 200 })
    boundingRectStub.mockReturnValueOnce({ height: 200 })
    boundingRectStub.mockReturnValueOnce({ top: 300 }) // scrolled into view
    await projectListWrapper.trigger('scroll') // scroll last element into view

    projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    expect(wrapper.vm.visibleProjectList.length).toBe(7)
    expect(projectListWrapper.vm.$children.length).toBe(7)
  })

  it('Project list should navigate to highlighted project on enter', async () => {
    const projects = createProjectList(['a', 'b', 'c', 'd'])
    getters.projectList.mockReturnValue(projects)
    const wrapper = await mountMainNavigation()
    const navigateSpy = jest.spyOn(wrapper.vm, 'navigateToProject')

    // 2nd item is 1st in storeProjectList as vm projectList has 'all projects' item
    const projectMenuButton = wrapper.find('.v-navigation-drawer .project-selector .v-btn__content')
    projectMenuButton.trigger('keydown.down')
    await projectMenuButton.trigger('keyup.enter')
    expect(navigateSpy.mock.calls[0]).toEqual([projects[0]])

    const projectFilterInput = wrapper.find('input')
    projectFilterInput.trigger('keydown.down')
    await projectFilterInput.trigger('keyup.enter')
    expect(navigateSpy.mock.calls[1]).toEqual([projects[1]])
  })

  it('Project list should navigate to project on click', async () => {
    const wrapper = await mountMainNavigation()
    const projectClickSpy = jest.spyOn(wrapper.vm, 'onProjectClick')
    const navigateSpy = jest.spyOn(wrapper.vm, 'navigateToProject')

    const projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    // 2nd item is 1st in storeProjectList as vm projectList has 'all projects' item
    projectListWrapper.findAll('.project-list-tile').at(1).trigger('click')
    expect(projectClickSpy).toHaveBeenCalledTimes(1)
    expect(navigateSpy).not.toHaveBeenCalled() // not called because of untrusted event
  })
})
