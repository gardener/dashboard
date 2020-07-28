<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-breadcrumbs :items="breadcrumbItems" class="pl-0">
    <template v-slot:divider>
      <v-icon large>mdi-chevron-right</v-icon>
    </template>
    <template v-slot:item="{ item }">
      <router-link v-if="item.to" :to="item.to" class="black--text text-decoration-none">
        {{ item.text }}
      </router-link>
      <span v-else class="black--text text-h6">
        {{ item.text }}
      </span>
    </template>
  </v-breadcrumbs>
</template>

<script>
import { mapState } from 'vuex'
import get from 'lodash/get'

export default {
  name: 'breadcrumb',
  computed: {
    ...mapState([
      'namespace'
    ]),
    breadcrumbItems () {
      const breadcrumbs = get(this.$route, 'meta.breadcrumbs', [])
      if (typeof breadcrumbs === 'function') {
        return breadcrumbs(this.$route)
      }
      return breadcrumbs
    },
    routeParamName () {
      return get(this.$route.params, 'name')
    }
  }
}
</script>
