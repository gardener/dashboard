<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <tr>
    <td
      v-for="header in headers"
      :key="header.key"
      :class="header.class"
      :align="header.align"
    >
      <template v-if="header.key === 'name'">
        {{ seedName }}
      </template>
      <template v-else-if="header.key === 'infrastructure'">
        <g-vendor
          :provider-type="seedProviderType"
          :region="seedProviderRegion"
        />
      </template>
      <template v-else-if="header.key === 'lastOperation'">
        <div class="d-flex align-center justify-center">
          <g-seed-status
            :popper-key="`seed/${seedName}`"
          />
        </div>
      </template>
      <template v-else-if="header.key === 'readiness'">
        <div class="d-flex">
          <g-seed-status-tags :identifier="seedName" />
        </div>
      </template>
      <template v-else-if="header.key === 'createdAt'">
        <g-time-string
          :date-time="seedCreationTimestamp"
          mode="past"
        />
      </template>
      <template v-else-if="header.key === 'kubernetesVersion'">
        <span>{{ seedKubernetesVersion }}</span>
      </template>
      <template v-else-if="header.key === 'gardenerVersion'">
        <span>{{ seedGardenerVersion }}</span>
      </template>
    </td>
  </tr>
</template>

<script setup>
import { toRef } from 'vue'

import GVendor from '@/components/GVendor.vue'
import GSeedStatus from '@/components/GSeedStatus.vue'
import GSeedStatusTags from '@/components/GSeedStatusTags.vue'
import GTimeString from '@/components/GTimeString.vue'

import { useProvideSeedItem } from '@/composables/useSeedItem'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  headers: {
    type: Array,
    required: true,
  },
})

const seedItem = toRef(props, 'modelValue')

const {
  seedName,
  seedProviderType,
  seedProviderRegion,
  seedKubernetesVersion,
  seedGardenerVersion,
  seedCreationTimestamp,
} = useProvideSeedItem(seedItem)

</script>
