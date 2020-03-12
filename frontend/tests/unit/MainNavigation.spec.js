//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import MainNavigation from '@/components/MainNavigation.vue'
import Vue from 'vue'
import Vuex from 'vuex'
import Vuetify from 'vuetify'
import noop from 'lodash/noop'

Vue.use(Vuetify)
Vue.use(Vuex)

window.HTMLElement.prototype.scrollIntoView = noop

let storeProjectList = []

let $store = new Vuex.Store({
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
  }
}

function createMainNavigationComponent () {
  const wrapper = mount(MainNavigation, {
    mocks: {
      $route,
      $router,
      $store
    },
    stubs: ['ProjectCreateDialog', 'RouterLink'],
    propsData: {
      projectMenu: true
    }
  })

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

describe('MainNavigation.vue', function () {
  beforeEach(function () {
    storeProjectList.length = 0
    storeProjectList.push(createProjectListItem('foo'))
    storeProjectList.push(createProjectListItem('bar'))
  })

  it('should have correct element and css class hierarchy', function () {
    const wrapper = createMainNavigationComponent()
    const topArea = wrapper.find('aside > .teaser > .content')
    expect(topArea.element).not.to.be.undefined

    const projectSelector = wrapper.find('aside .project-selector > div')
    expect(projectSelector.element).not.to.be.undefined

    const listTitle = wrapper.find('aside .v-list .v-list__tile__title')
    expect(listTitle.element).not.to.be.undefined

    const mainMenu = wrapper.find({ ref: 'mainMenu' })
    const listTile = mainMenu.find('.v-list__tile__title')
    expect(listTile.element).not.to.be.undefined

    const projectMenuCard = wrapper.find('aside .project-menu .v-card')
    expect(projectMenuCard.element).not.to.be.undefined

    const projectMenuHighlightedTile = wrapper.find('aside .project-menu .v-card .project-list .v-list__tile--highlighted')
    expect(projectMenuHighlightedTile.element).to.be.undefined

    // highlight (default v-list-tile highlighting)
    const projectList = wrapper.find('aside .project-menu .v-card .project-list')

    projectList.trigger('keydown.down')
    expect(projectList.element).not.to.be.undefined
  })

  it('Filter input should be visible in case of more than 3 projects', function () {
    let wrapper = createMainNavigationComponent()
    let projectFilterInput = wrapper.find({ ref: 'projectFilter' })
    expect(projectFilterInput.element).to.be.undefined

    storeProjectList.push(createProjectListItem('baz'))
    storeProjectList.push(createProjectListItem('foobar'))
    wrapper = createMainNavigationComponent()
    projectFilterInput = wrapper.find({ ref: 'projectFilter' })
    expect(projectFilterInput.element).not.to.be.undefined
  })

  it('Project list should be filtered by input', function () {
    storeProjectList.push(createProjectListItem('fooz'))
    storeProjectList.push(createProjectListItem('foobar'))
    let wrapper = createMainNavigationComponent()

    let projectList = wrapper.vm.sortedAndFilteredProjectListWithAllProjects
    expect(projectList).to.have.length(5)
    expect(projectList[1].metadata.name).to.equal('bar')

    wrapper.setData({ projectFilter: 'foo' })
    wrapper.vm.onInputProjectFilter()
    projectList = wrapper.vm.sortedAndFilteredProjectListWithAllProjects
    expect(projectList).to.have.length(4)
    expect(projectList[1].metadata.name).to.equal('foo')

    const projectListWrapper = wrapper.find({ ref: 'projectList' })
    const exactMatchEl = projectListWrapper.vm.$children[1].$el
    expect(exactMatchEl.className).to.contain('grey lighten-4')
    const exactMatchChip = projectListWrapper.find('.v-chip__content')
    expect(exactMatchChip.element).not.to.be.undefined
    expect(exactMatchChip.text()).to.equal('Exact match')
  })

  it('Projects can be highlighted via arrow keys', function () {
    storeProjectList.push(createProjectListItem('fooz'))
    storeProjectList.push(createProjectListItem('foobar'))
    let wrapper = createMainNavigationComponent()
    const projectMenuButton = wrapper.find('aside .project-selector .v-btn__content')

    expect(wrapper.vm.highlightedProjectIndex).to.equal(0)
    projectMenuButton.trigger('keydown.down')
    projectMenuButton.trigger('keydown.down')
    expect(wrapper.vm.highlightedProjectIndex).to.equal(2)
    projectMenuButton.trigger('keydown.up')
    expect(wrapper.vm.highlightedProjectIndex).to.equal(1)

    const projectFilterInput = wrapper.find('input')
    projectFilterInput.trigger('keydown.down')
    projectFilterInput.trigger('keydown.down')
    expect(wrapper.vm.highlightedProjectIndex).to.equal(3)
    projectFilterInput.trigger('keydown.up')
    expect(wrapper.vm.highlightedProjectIndex).to.equal(2)
  })
})
