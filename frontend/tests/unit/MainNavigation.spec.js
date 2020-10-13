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

import { mount } from '@vue/test-utils'
import MainNavigation from '@/components/MainNavigation.vue'
import Vue from 'vue'
import Vuex from 'vuex'
import Vuetify from 'vuetify'
import noop from 'lodash/noop'

Vue.use(Vuetify)
Vue.use(Vuex)

window.HTMLElement.prototype.scrollIntoView = noop

// see issue https://github.com/vuejs/vue-test-utils/issues/974#issuecomment-423721358
global.requestAnimationFrame = cb => cb()

const storeProjectList = []
let vuetify

const $store = new Vuex.Store({
  state: {
    namespace: 'foo',
    sidebar: true,
    cfg: {}
  },
  getters: {
    canCreateProject: () => {
      return true
    },
    projectList: () => {
      return storeProjectList
    }
  },
  actions: {
    setSidebar: noop
  }
})

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
  push: noop
}

async function createMainNavigationComponent () {
  const wrapper = mount(MainNavigation, {
    vuetify,
    mocks: {
      $route,
      $router,
      $store
    },
    stubs: ['ProjectCreateDialog', 'RouterLink', 'StaleProjectWarning']
  })
  wrapper.setData({ projectMenu: true })

  // need to wait for projectmenu to be rendered
  await Vue.nextTick()

  return wrapper
}

function createProjectListItem (name) {
  return {
    metadata: {
      name,
      namespace: `garden-${name}`
    },
    data: {
      owner: 'owner'
    }
  }
}

describe('MainNavigation.vue', () => {
  beforeEach(() => {
    storeProjectList.length = 0 // clear array
    storeProjectList.push(createProjectListItem('foo'))
    storeProjectList.push(createProjectListItem('bar'))
    vuetify = new Vuetify()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should have correct element and css class hierarchy', async () => {
    const wrapper = await createMainNavigationComponent()

    const topArea = wrapper.find('.v-navigation-drawer .teaser > .content')
    expect(topArea.element).not.toBeUndefined()

    const projectSelector = wrapper.find('.v-navigation-drawer .project-selector')
    expect(projectSelector.element).not.toBeUndefined()

    const footer = wrapper.find('.v-navigation-drawer .v-footer')
    expect(footer.element).not.toBeUndefined()

    const listTitle = wrapper.find('.v-navigation-drawer .v-list .v-list-item__title')
    expect(listTitle.element).not.toBeUndefined()

    const mainMenu = wrapper.findComponent({ ref: 'mainMenu' })
    const listTile = mainMenu.find('.v-list-item__title')
    expect(listTile.element).not.toBeUndefined()

    const projectMenuCard = wrapper.find('.v-navigation-drawer .project-menu')
    expect(projectMenuCard.element).not.toBeUndefined()

    const projectMenu = wrapper.find('.v-navigation-drawer .project-menu .v-card .project-list')
    expect(projectMenu.element).not.toBeUndefined()
  })

  it('Filter input should be visible in case of more than 3 projects', async () => {
    let wrapper = await createMainNavigationComponent()

    let projectFilterInput = wrapper.findComponent({ ref: 'projectFilter' })
    expect(projectFilterInput.element).toBeUndefined()

    storeProjectList.push(createProjectListItem('baz'))
    storeProjectList.push(createProjectListItem('foobar'))
    wrapper = await createMainNavigationComponent()

    projectFilterInput = wrapper.findComponent({ ref: 'projectFilter' })
    expect(projectFilterInput.element).not.toBeUndefined()
  })

  it('Project list should be filtered by input', async () => {
    storeProjectList.push(createProjectListItem('fooz'))
    storeProjectList.push(createProjectListItem('foobar'))
    const wrapper = await createMainNavigationComponent()

    let projectList = wrapper.vm.sortedAndFilteredProjectListWithAllProjects
    expect(projectList).toHaveLength(5)
    expect(projectList[1].metadata.name).toBe('bar')

    wrapper.setData({ projectFilter: 'foo' })
    wrapper.vm.onInputProjectFilter()
    projectList = wrapper.vm.sortedAndFilteredProjectListWithAllProjects
    expect(projectList).toHaveLength(4)
    expect(projectList[1].metadata.name).toBe('foo')

    await Vue.nextTick()
    const projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    const exactMatchListTile = projectListWrapper.findAll('.project-list-tile').at(1)
    expect(exactMatchListTile.classes()).toEqual(expect.arrayContaining(['grey', 'lighten-4']))
  })

  it('Projects can be highlighted via arrow keys', async () => {
    storeProjectList.length = 0 // clear array
    storeProjectList.push(createProjectListItem('a'))
    storeProjectList.push(createProjectListItem('b'))
    storeProjectList.push(createProjectListItem('c'))
    storeProjectList.push(createProjectListItem('d'))
    const wrapper = await createMainNavigationComponent()
    const projectMenuButton = wrapper.find('.v-navigation-drawer .project-selector .v-btn__content')

    expect(wrapper.vm.highlightedProjectName).toBeUndefined() // undefined == first item == All Projects
    const scrollIntoViewSpy = jest.spyOn(window.HTMLElement.prototype, 'scrollIntoView')
    projectMenuButton.trigger('keydown.down')
    // 2nd item is 1st in storeProjectList as vm projectList has 'all projects' item
    expect(wrapper.vm.highlightedProjectName).toBe(storeProjectList[0].metadata.name)
    projectMenuButton.trigger('keydown.down')
    expect(wrapper.vm.highlightedProject()).toBe(storeProjectList[1])
    projectMenuButton.trigger('keydown.up')
    expect(wrapper.vm.highlightedProject()).toBe(storeProjectList[0])

    const projectFilterInput = wrapper.find('input')
    projectFilterInput.trigger('keydown.down')
    projectFilterInput.trigger('keydown.down')
    expect(wrapper.vm.highlightedProject()).toBe(storeProjectList[2])
    projectFilterInput.trigger('keydown.up')
    expect(wrapper.vm.highlightedProject()).toBe(storeProjectList[1])
    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(6)
  })

  it('Project list rendering should be lazy', async () => {
    storeProjectList.push(createProjectListItem('fooz'))
    storeProjectList.push(createProjectListItem('foobar'))
    storeProjectList.push(createProjectListItem('foozz'))
    storeProjectList.push(createProjectListItem('foobarz'))
    const wrapper = await createMainNavigationComponent()
    wrapper.setData({ numberOfVisibleProjects: 5 })

    await Vue.nextTick()
    let projectListWrapper = wrapper.findComponent({ ref: 'projectList' })

    await Vue.nextTick()
    expect(wrapper.vm.visibleProjectList.length).toBe(5)
    expect(projectListWrapper.vm.$children.length).toBe(5)

    const projectFilterInput = wrapper.find('input')
    projectFilterInput.trigger('keydown.down')
    projectFilterInput.trigger('keydown.down')
    projectFilterInput.trigger('keydown.down')
    projectFilterInput.trigger('keydown.down')
    projectFilterInput.trigger('keydown.down')
    projectFilterInput.trigger('keydown.down')

    await Vue.nextTick()
    projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    expect(wrapper.vm.visibleProjectList.length).toBe(7)
    expect(projectListWrapper.vm.$children.length).toBe(7)
  })

  it('Project list scrolling should trigger lazy rendering', async () => {
    storeProjectList.push(createProjectListItem('fooz'))
    storeProjectList.push(createProjectListItem('foobar'))
    storeProjectList.push(createProjectListItem('foozz'))
    storeProjectList.push(createProjectListItem('foobarz'))
    const wrapper = await createMainNavigationComponent()
    wrapper.setData({ numberOfVisibleProjects: 5 })

    await Vue.nextTick()
    let projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    expect(wrapper.vm.visibleProjectList.length).toBe(5)
    expect(projectListWrapper.vm.$children.length).toBe(5)

    // stub bounding rect method to simulate actual scrolling
    const boundingRectStub = jest.spyOn(window.HTMLElement.prototype, 'getBoundingClientRect')
    boundingRectStub.mockReturnValueOnce({ top: 200 })
    boundingRectStub.mockReturnValueOnce({ height: 200 })
    boundingRectStub.mockReturnValueOnce({ top: 300 }) // scrolled into view
    projectListWrapper.trigger('scroll') // scroll last element into view

    await Vue.nextTick()
    projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    expect(wrapper.vm.visibleProjectList.length).toBe(6)
    expect(projectListWrapper.vm.$children.length).toBe(6)

    boundingRectStub.mockReset()
    boundingRectStub.mockReturnValueOnce({ top: 200 })
    boundingRectStub.mockReturnValueOnce({ height: 200 })
    boundingRectStub.mockReturnValueOnce({ top: 500 }) // NOT scrolled into view
    projectListWrapper.trigger('scroll') // scrolled, but NOT scrolled last element into view

    await Vue.nextTick()
    projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    expect(wrapper.vm.visibleProjectList.length).toBe(6)
    expect(projectListWrapper.vm.$children.length).toBe(6)

    boundingRectStub.mockReset()
    boundingRectStub.mockReturnValueOnce({ top: 200 })
    boundingRectStub.mockReturnValueOnce({ height: 200 })
    boundingRectStub.mockReturnValueOnce({ top: 300 }) // scrolled into view
    projectListWrapper.trigger('scroll') // scroll last element into view

    await Vue.nextTick()
    projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    expect(wrapper.vm.visibleProjectList.length).toBe(7)
    expect(projectListWrapper.vm.$children.length).toBe(7)
  })

  it('Project list should navigate to highlighted project on enter', async () => {
    storeProjectList.length = 0 // clear array
    storeProjectList.push(createProjectListItem('a'))
    storeProjectList.push(createProjectListItem('b'))
    storeProjectList.push(createProjectListItem('c'))
    storeProjectList.push(createProjectListItem('d'))
    const wrapper = await createMainNavigationComponent()
    const projectMenuButton = wrapper.find('.v-navigation-drawer .project-selector .v-btn__content')
    const navigateSpy = jest.spyOn(wrapper.vm, 'navigateToProject')

    // 2nd item is 1st in storeProjectList as vm projectList has 'all projects' item
    projectMenuButton.trigger('keydown.down')

    projectMenuButton.trigger('keyup.enter')
    expect(navigateSpy.mock.calls[0]).toEqual([storeProjectList[0]])

    const projectFilterInput = wrapper.find('input')
    projectFilterInput.trigger('keydown.down')
    projectFilterInput.trigger('keyup.enter')
    expect(navigateSpy.mock.calls[1]).toEqual([storeProjectList[1]])
  })

  it('Project list should navigate to project on click', async () => {
    const wrapper = await createMainNavigationComponent()
    const projectClickSpy = jest.spyOn(wrapper.vm, 'onProjectClick')
    const navigateSpy = jest.spyOn(wrapper.vm, 'navigateToProject')

    const projectListWrapper = wrapper.findComponent({ ref: 'projectList' })
    // 2nd item is 1st in storeProjectList as vm projectList has 'all projects' item
    projectListWrapper.findAll('.project-list-tile').at(1).trigger('click')
    expect(projectClickSpy).toHaveBeenCalledTimes(1)
    expect(navigateSpy).not.toHaveBeenCalled() // not called because of untrusted event
  })
})
