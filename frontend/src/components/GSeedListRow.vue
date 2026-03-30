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
          :zones="seedProviderZones"
        />
      </template>
      <template v-else-if="header.key === 'shoot'">
        <g-managed-seed-shoot-link
          :managed-seed-shoot-name="managedSeedShootName"
          hide-unmanaged-chip
        />
      </template>
      <template v-else-if="header.key === 'lastOperation'">
        <div class="d-flex align-center justify-center">
          <g-seed-status />
        </div>
      </template>
      <template v-else-if="header.key === 'readiness'">
        <div class="d-flex">
          <g-seed-status-tags
            :identifier="seedName"
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

import GManagedSeedShootLink from '@/components/GManagedSeedShootLink.vue'
import GTextRouterLink from '@/components/GTextRouterLink.vue'
import GVendor from '@/components/GVendor.vue'
import GSeedStatus from '@/components/GSeedStatus.vue'
import GSeedStatusTags from '@/components/GSeedStatusTags.vue'
import GTimeString from '@/components/GTimeString.vue'
import GAccessRestrictionChip from '@/components/ShootAccessRestrictions/GAccessRestrictionChip.vue'
import GCollapsibleItems from '@/components/GCollapsibleItems'
import GScrollContainer from '@/components/GScrollContainer'

import { useProvideManagedSeedShoot } from '@/composables/useManagedSeedShootForSeed'
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
  seedProviderZones,
  seedUid,
  seedAccessRestrictions,
  seedSchedulingVisible,
  seedKubernetesVersion,
  seedGardenerVersion,
  seedCreationTimestamp,
} = useProvideSeedItem(seedItem)

const {
  managedSeedShootName,
} = useProvideManagedSeedShoot(seedName)

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
