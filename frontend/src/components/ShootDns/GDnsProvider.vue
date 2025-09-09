<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="popover"
    :toolbar-title="secretName"
  >
    <template #activator="{ props }">
      <v-chip
        v-bind="props"
        size="small"
        density="comfortable"
        color="primary"
        variant="tonal"
        class="cursor-pointer my-0 ml-0"
      >
        <g-vendor-icon
          :icon="type"
          :size="14"
        />
        <span class="px-1">{{ secretName }}</span>
      </v-chip>
    </template>
    <v-list min-width="300">
      <v-list-item
        v-for="({title, value, to}) in dnsProviderDescriptions"
        :key="title"
      >
        <v-list-item-subtitle class="pt-1">
          {{ title }}
        </v-list-item-subtitle>
        <v-list-item-title v-if="to">
          <g-text-router-link
            :to="to"
            :text="value"
          />
        </v-list-item-title>
        <v-list-item-title v-else>
          {{ value }}
        </v-list-item-title>
      </v-list-item>
      <v-list-item v-if="secret">
        <g-credential-details-item-content
          class="pb-2"
          :credential="secret"
          :provider-type="type"
          details-title
        />
      </v-list-item>
    </v-list>
  </g-popover>
</template>

<script>
import { mapActions } from 'pinia'

import { useCredentialStore } from '@/store/credential'

import GVendorIcon from '@/components/GVendorIcon'
import GCredentialDetailsItemContent from '@/components/Credentials/GCredentialDetailsItemContent.vue'
import GTextRouterLink from '@/components/GTextRouterLink.vue'

import get from 'lodash/get'
import join from 'lodash/join'

export default {
  components: {
    GVendorIcon,
    GCredentialDetailsItemContent,
    GTextRouterLink,
  },
  props: {
    type: {
      type: String,
      required: true,
    },
    secretName: {
      type: String,
      required: true,
    },
    shootNamespace: {
      type: String,
      required: true,
    },
    primary: {
      type: Boolean,
      default: false,
    },
    domains: {
      type: Object,
      required: false,
    },
    zones: {
      type: Object,
      required: false,
    },
  },
  data () {
    return {
      popover: false,
    }
  },
  computed: {
    secret () {
      return this.getSecret({ namespace: this.shootNamespace, name: this.secretName })
    },
    dnsProviderDescriptions () {
      const descriptions = []
      descriptions.push({
        title: 'DNS Provider Type',
        value: this.type,
      })
      descriptions.push({
        title: 'Credential',
        value: this.secretName,
        to: {
          name: 'Credentials',
          params: {
            hash: this.secretName,
            namespace: this.shootNamespace,
          },
        },
      })
      descriptions.push({
        title: 'Primary DNS Provider',
        value: this.primary ? 'true' : 'false',
      })
      if (get(this.domains, ['include', 'length'])) {
        descriptions.push({
          title: 'Include Domains',
          value: join(this.domains.include, ', '),
        })
      }
      if (get(this.domains, ['exclude', 'length'])) {
        descriptions.push({
          title: 'Exclude Domains',
          value: join(this.domains.exclude, ', '),
        })
      }
      if (get(this.zones, ['include', 'length'])) {
        descriptions.push({
          title: 'Include Zones',
          value: join(this.zones.include, ', '),
        })
      }
      if (get(this.zones, ['exclude', 'length'])) {
        descriptions.push({
          title: 'Exclude Zones',
          value: join(this.zones.exclude, ', '),
        })
      }
      return descriptions
    },
  },
  methods: {
    ...mapActions(useCredentialStore, [
      'getSecret',
    ]),
  },
}
</script>
