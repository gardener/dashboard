<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="popover"
    :toolbar-title="credentialName"
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
          :name="type"
          vendor-type="dns"
          :size="14"
        />
        <g-credential-name
          :credential="credential"
          hide-icon
        />
      </v-chip>
    </template>
    <v-list min-width="300">
      <v-list-item
        v-for="({title, value}) in dnsProviderDescriptions"
        :key="title"
      >
        <v-list-item-subtitle class="pt-1">
          {{ title }}
        </v-list-item-subtitle>
        <v-list-item-title>
          {{ value }}
        </v-list-item-title>
      </v-list-item>
      <template v-if="credential">
        <v-list-item>
          <v-list-item-subtitle class="pt-1">
            Credential
          </v-list-item-subtitle>
          <v-list-item-title>
            <g-credential-name
              :credential="credential"
              render-link
            />
          </v-list-item-title>
        </v-list-item>
        <v-list-item>
          <g-credential-details-item-content
            class="pb-2"
            :credential="credential"
            :provider-type="type"
            details-title
          />
        </v-list-item>
      </template>
    </v-list>
  </g-popover>
</template>

<script>
import GVendorIcon from '@/components/GVendorIcon'
import GCredentialName from '@/components/Credentials/GCredentialName.vue'
import GCredentialDetailsItemContent from '@/components/Credentials/GCredentialDetailsItemContent.vue'

import get from 'lodash/get'
import join from 'lodash/join'

export default {
  components: {
    GVendorIcon,
    GCredentialDetailsItemContent,
    GCredentialName,
  },
  props: {
    type: {
      type: String,
      required: true,
    },
    credential: {
      type: Object,
      required: false,
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
    credentialName () {
      return get(this.credential, ['metadata', 'name'])
    },
    dnsProviderDescriptions () {
      const descriptions = []
      descriptions.push({
        title: 'DNS Provider Type',
        value: this.type,
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
}
</script>
