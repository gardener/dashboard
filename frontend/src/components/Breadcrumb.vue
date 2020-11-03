<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
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
