
//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { toRef } from 'vue'
import { useAppStore } from '@/store/app'
import { useLogger } from '@/composables/useLogger'

/* Layouts */
import GLogin from '@/layouts/GLogin.vue'
import GDefault from '@/layouts/GDefault.vue'

/* Views */
import GError from '@/views/GError.vue'
import GHome from '@/views/GHome.vue'
import GNotFound from '@/views/GNotFound.vue'
import GAccount from '@/views/GAccount.vue'
import GSettings from '@/views/GSettings.vue'

import {
  notFoundBreadcrumbs,
  homeBreadcrumbs,
  settingsBreadcrumbs,
  accountBreadcrumbs,
} from './breadcrumbs'

export function createRoutes () {
  return [
    loginRoute('/login'),
    errorRoute('/error'),
    defaultHierarchy('/'),
  ]
}

export function loginRoute (path) {
  const store = useAppStore()
  const logger = useLogger() // eslint-disable-line no-unused-vars
  const alert = toRef(store, 'alert')

  return {
    path,
    name: 'Login',
    component: GLogin,
    async beforeEnter (to) {
      if (/^#.+/.test(to.hash)) {
        const searchParams = new URLSearchParams(to.hash.substring(1))
        if (searchParams.has('error')) {
          alert.value = {
            type: 'error',
            title: searchParams.get('title') ?? 'Login Error',
            message: searchParams.get('error'),
          }
          return {
            ...to,
            hash: '',
          }
        }
      }
    },
    meta: {
      public: true,
    },
  }
}

export function errorRoute (path) {
  return {
    path,
    name: 'Error',
    component: GError,
    meta: {
      public: true,
    },
  }
}

/* Default Hierachy "/" */
function defaultHierarchy (path) {
  const children = [
    homeRoute(''),
    accountRoute('account'),
    settingsRoute('settings'),
    {
      path: '*',
      component: GNotFound,
      meta: {
        namespaced: false,
        projectScope: false,
        breadcrumbs: notFoundBreadcrumbs,
      },
    },
  ]
  return {
    path,
    component: GDefault,
    children,
  }
}

export function homeRoute (path) {
  return {
    path,
    name: 'Home',
    component: GHome,
    meta: {
      namespaced: false,
      projectScope: false,
      breadcrumbs: homeBreadcrumbs,
    },
  }
}

export function accountRoute (path) {
  return {
    path,
    name: 'Account',
    component: GAccount,
    meta: {
      namespaced: false,
      projectScope: false,
      breadcrumbs: accountBreadcrumbs,
    },
    beforeEnter (to, from) {
      const namespace = from.params.namespace ?? from.query.namespace ?? 'garden'
      if (!to.query.namespace && namespace) {
        return {
          name: 'Account',
          query: { namespace, ...to.query },
        }
      }
    },
  }
}

export function settingsRoute (path) {
  return {
    path,
    name: 'Settings',
    component: GSettings,
    meta: {
      namespaced: false,
      projectScope: false,
      breadcrumbs: settingsBreadcrumbs,
    },
    beforeEnter (to, from) {
      const namespace = from.params.namespace ?? from.query.namespace ?? 'garden'
      if (!to.query.namespace && namespace) {
        return {
          name: 'Settings',
          query: { namespace, ...to.query },
        }
      }
    },
  }
}
