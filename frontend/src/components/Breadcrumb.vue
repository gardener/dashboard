<!--
Copyright 2018 by The Gardener Authors.

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
  <v-breadcrumbs>
    <v-icon slot="divider" large>keyboard_arrow_right</v-icon>
    <v-breadcrumbs-item
      v-for="item in breadcrumbItems"
      :key="item.text"
      :to="item.to"
      :exact="true"
    >
      <div :class="textClass(item)">
        {{ item.text }}
      </div>
    </v-breadcrumbs-item>
  </v-breadcrumbs>
</template>

<script>
  import { mapState } from 'vuex'
  import { routes, namespacedRoute } from '@/utils'
  import get from 'lodash/get'
  import last from 'lodash/last'
  import size from 'lodash/size'
  import assign from 'lodash/assign'

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
        matched.forEach(function (matchedRoute) {
          var hasBreadcrumb = get(matchedRoute, 'meta.breadcrumb')

          if (hasBreadcrumb) {
            const text = get(matchedRoute, 'meta.title')
            const to = namespacedRoute(matchedRoute, namespace)
            crumbs.push({text, to})
          }
        })

        const lastItem = last(crumbs)
        crumbs.splice(size(crumbs) - 1, 1, assign({}, lastItem, { currentRoute: true }))

        return crumbs
      },
      routes () {
        return routes(this.$router)
      },
      textClass () {
        return (item) => {
          if (item.currentRoute) {
            return 'breadcrumb title'
          } else {
            return 'breadcrumb subheading pointer'
          }
        }
      }
    }
  }
</script>

<style lang="styl" scoped>

  .breadcrumbs {
    padding-left: 0px;
  }

  .pointer {
    cursor: pointer;
  }

  .breadcrumb {
    color: black;
  }

</style>
