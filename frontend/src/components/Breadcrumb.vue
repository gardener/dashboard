<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <v-breadcrumbs :items="breadcrumbItems">
    <v-icon slot="divider" large>keyboard_arrow_right</v-icon>
    <router-link
      slot-scope="{item}"
      slot="item"
      :to="item.to"
      :class="textClass(item)"
      tag="span"
    >
      {{ item.text }}
    </router-link>
  </v-breadcrumbs>
</template>

<script>
import { mapState } from 'vuex'
import { namespacedRoute } from '@/utils'
import get from 'lodash/get'
import last from 'lodash/last'
import size from 'lodash/size'
import assign from 'lodash/assign'

/**
 * @typedef {number} Breadcrumb
 **/

/**
 * @readonly
 * @enum {Breadcrumb}
 */
export const BreadcrumbEnum = {
  USE_ROUTE_TITLE: 1,
  USE_ROUTE_PARAM_NAME: 2,
  FALSE: -1
}

export default {
  name: 'breadcrumb',
  computed: {
    ...mapState([
      'namespace'
    ]),
    breadcrumbItems () {
      var crumbs = []
      const namespace = this.namespace
      const matched = this.$route.matched
      matched.forEach((matchedRoute) => {
        const breadcrumb = get(matchedRoute, 'meta.breadcrumb')
        if (breadcrumb && breadcrumb !== BreadcrumbEnum.FALSE) {
          const to = namespacedRoute(matchedRoute, namespace)

          if (breadcrumb === BreadcrumbEnum.USE_ROUTE_PARAM_NAME) {
            const text = this.routeParamName
            crumbs.push({ text, to })
          } else if (breadcrumb === BreadcrumbEnum.USE_ROUTE_TITLE) {
            const text = get(matchedRoute, 'meta.title')
            crumbs.push({ text, to })
          }
        }
      })

      const lastItem = last(crumbs)
      crumbs.splice(size(crumbs) - 1, 1, assign({}, lastItem, { currentRoute: true }))

      return crumbs
    },
    textClass () {
      return (item) => {
        if (item.currentRoute) {
          return 'breadcrumb title'
        } else {
          return 'breadcrumb subheading pointer'
        }
      }
    },
    routeParamName () {
      return get(this.$route.params, 'name')
    }
  }
}
</script>

<style lang="styl" scoped>

  .v-breadcrumbs {
    padding-left: 0px;
  }

  .pointer {
    cursor: pointer;
  }

  .breadcrumb {
    color: black;
  }

</style>
