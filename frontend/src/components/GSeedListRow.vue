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
        <g-text-router-link
          :to="seedItemLink"
          :text="seedName"
        />
      </template>
      <template v-else-if="header.key === 'infrastructure'">
        <g-vendor
          :provider-type="seedProviderType"
          :region="seedProviderRegion"
        />
      </template>
      <template v-else-if="header.key === 'lastOperation'">
        <div class="d-flex align-center justify-center">
          <g-seed-status />
        </div>
      </template>
      <template v-else-if="header.key === 'readiness'">
        <div class="d-flex">
          <g-seed-status-tags :identifier="seedName" />
        </div>
      </template>
      <template v-else-if="header.key === 'controlPlaneHighAvailability'">
        <div class="d-flex justify-center flex-wrap">
          <g-high-availability-tag
            v-if="seedBestSupportedFailureToleranceType === 'zone'"
            :popover-key="controlPlaneHighAvailabilityTagPopoverKey"
            :failure-tolerance-type="seedBestSupportedFailureToleranceType"
            size="small"
            color="primary"
            chip-class="mr-1"
          />
        </div>
      </template>
      <template v-else-if="header.key === 'accessRestrictions'">
        <g-scroll-container class="d-flex flex-wrap justify-center large-container">
          <g-collapsible-items
            :items="seedAccessRestrictions"
            :uid="seedUid"
            inject-key="expandedAccessRestrictions"
          >
            <template #item="{ item }">
              <g-access-restriction-chip
                :id="item.key"
                :key="item.key"
                :title="item.title"
                :options="item.options"
              />
            </template>
          </g-collapsible-items>
        </g-scroll-container>
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
      <template v-else-if="header.key === 'schedulingVisible'">
        <v-chip
          v-if="!seedSchedulingVisible"
          v-tooltip:top="'This seed is hidden from shoot scheduling'"
          size="small"
          color="warning"
          variant="tonal"
        >
          Hidden
        </v-chip>
      </template>
    </td>
  </tr>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'
import { useRoute } from 'vue-router'

import GVendor from '@/components/GVendor.vue'
import GSeedStatus from '@/components/GSeedStatus.vue'
import GSeedStatusTags from '@/components/GSeedStatusTags.vue'
import GTimeString from '@/components/GTimeString.vue'
import GTextRouterLink from '@/components/GTextRouterLink.vue'
import GAccessRestrictionChip from '@/components/ShootAccessRestrictions/GAccessRestrictionChip.vue'
import GHighAvailabilityTag from '@/components/ControlPlaneHighAvailability/GHighAvailabilityTag.vue'
import GCollapsibleItems from '@/components/GCollapsibleItems'
import GScrollContainer from '@/components/GScrollContainer'

import { useProvideSeedItem } from '@/composables/useSeedItem/index'

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
const route = useRoute()

const {
  seedName,
  seedProviderType,
  seedProviderRegion,
  seedUid,
  seedBestSupportedFailureToleranceType,
  seedAccessRestrictions,
  seedSchedulingVisible,
  seedKubernetesVersion,
  seedGardenerVersion,
  seedCreationTimestamp,
} = useProvideSeedItem(seedItem)

const controlPlaneHighAvailabilityTagPopoverKey = computed(() => {
  return `g-seed-control-plane-high-availability-tag:${seedUid.value}`
})

const seedItemLink = computed(() => ({
  name: 'SeedItem',
  params: {
    name: seedName.value,
  },
  query: {
    namespace: route.query.namespace,
  },
}))

</script>

<style lang="scss" scoped>
  .large-container {
    max-height: 140px;
    max-width: 350px;
  }
</style>
