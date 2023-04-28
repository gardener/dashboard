<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    :title="secretName"
    :popper-key="`worker_group_${type}_${secretName}`"
  >
    <template v-slot:popperRef>
      <v-chip
        small
        color="primary"
        variant="outlined"
        class="cursor-pointer my-0 ml-0">
          <vendor-icon :value="type" :size="20"></vendor-icon>
          <span class="px-1">{{secretName}}</span>
          <v-icon v-if="primary" size="small">mdi-star</v-icon>
      </v-chip>
    </template>
    <v-list class="pa-0">
      <v-list-item v-for="({title, value, description, to}) in dnsProviderDescriptions" :key="title" class="px-0">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>{{title}}</v-list-item-subtitle>
          <v-list-item-title v-if="to">
            <router-link :to="to">
              {{value}} {{description}}
            </router-link>
          </v-list-item-title>
          <v-list-item-title v-else>{{value}} {{description}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="secret" class="px-0">
        <secret-details-item-content
          class="pb-2"
          dns
          :secret="secret"
          details-title />
      </v-list-item>
    </v-list>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper.vue'
import VendorIcon from '@/components/VendorIcon.vue'
import join from 'lodash/join'
import get from 'lodash/get'
import SecretDetailsItemContent from '@/components/SecretDetailsItemContent.vue'

export default {
  name: 'worker-group',
  components: {
    GPopper,
    VendorIcon,
    SecretDetailsItemContent
  },
  props: {
    type: {
      type: String,
      required: true
    },
    secretName: {
      type: String,
      required: true
    },
    shootNamespace: {
      type: String,
      required: true
    },
    primary: {
      type: Boolean,
      default: false
    },
    domains: {
      type: Object,
      required: false
    },
    zones: {
      type: Object,
      required: false
    },
    secret: {
      type: Object,
      required: false
    }
  },
  computed: {
    dnsProviderDescriptions () {
      const description = []
      description.push({
        title: 'DNS Provider Type',
        value: this.type
      })
      description.push({
        title: 'Credential',
        value: this.secretName,
        to: {
          name: 'Secret',
          params: {
            name: this.secretName,
            namespace: this.shootNamespace
          }
        }
      })
      description.push({
        title: 'Primary DNS Provider',
        value: this.primary ? 'true' : 'false'
      })
      if (get(this.domains, 'exclude.length')) {
        description.push({
          title: 'Exclude Domains',
          value: join(this.domains.exclude, ', ')
        })
      }
      if (get(this.domains, 'include.length')) {
        description.push({
          title: 'Include Domains',
          value: join(this.domains.include, ', ')
        })
      }
      if (get(this.zones, 'exclude.length')) {
        description.push({
          title: 'Exclude Zones',
          value: join(this.zones.exclude, ', ')
        })
      }
      if (get(this.zones, 'include.length')) {
        description.push({
          title: 'Include Zones',
          value: join(this.zones.include, ', ')
        })
      }
      return description
    }
  }
}
</script>

<style lang="scss" scoped>
  :deep(.popper) {
    text-align: initial;
  }
</style>
