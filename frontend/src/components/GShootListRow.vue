<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr :class="{ 'stale': isStaleShoot }">
    <td
      v-for="cell in cells"
      :key="cell.header.key"
      :class="cell.header.class"
      class="position-relative"
    >
      <template v-if="cell.header.key === 'project'">
        <g-text-router-link
          :to="{ name: 'ShootList', params: { namespace: shootNamespace } }"
          :text="shootProjectTitleAndName"
        />
      </template>
      <template v-if="cell.header.key === 'name'">
        <v-row
          class="pa-0 ma-0 fill-height flex-nowrap align-center"
        >
          <v-col
            class="flex-grow-1 flex-shrink-0 pa-0 ma-0"
          >
            <g-auto-hide right>
              <template #activator>
                <g-text-router-link
                  :to="{ name: 'ShootItem', params: { name: shootName, namespace: shootNamespace } }"
                  :text="shootName"
                />
              </template>
              <g-copy-btn :clipboard-text="shootName" />
            </g-auto-hide>
          </v-col>
          <v-col
            class="flex-grow-0 flex-shrink-1 pa-0 ma-0"
          >
            <g-shoot-messages />
          </v-col>
        </v-row>
      </template>
      <template v-if="cell.header.key === 'infrastructure'">
        <g-vendor
          :provider-type="shootProviderType"
          :region="shootRegion"
          :zones="shootZones"
        />
      </template>
      <template v-if="cell.header.key === 'seed'">
        <g-auto-hide right>
          <template #activator>
            <g-shoot-seed-name />
          </template>
          <g-copy-btn :clipboard-text="shootSeedName" />
        </g-auto-hide>
      </template>
      <template v-if="cell.header.key === 'technicalId'">
        <g-auto-hide right>
          <template #activator>
            <span>{{ shootTechnicalId }}</span>
          </template>
          <g-copy-btn :clipboard-text="shootTechnicalId" />
        </g-auto-hide>
      </template>
      <template v-if="cell.header.key === 'workers'">
        <g-scroll-container class="d-flex flex-wrap justify-center large-container">
          <g-collapsible-items
            :items="shootWorkerGroups"
            :uid="shootUid"
            :chip-color="hasShootWorkerGroupWarning ? 'warning' : 'primary'"
            inject-key="expandedWorkerGroups"
          >
            <template #item="{ item }">
              <g-worker-group
                :worker-group="item"
                class="ma-1"
              />
            </template>
          </g-collapsible-items>
        </g-scroll-container>
      </template>
      <template v-if="cell.header.key === 'createdBy'">
        <g-account-avatar :account-name="shootCreatedBy" />
      </template>
      <template v-if="cell.header.key === 'createdAt'">
        <g-time-string
          :date-time="shootCreationTimestamp"
          mode="past"
        />
      </template>
      <template v-if="cell.header.key === 'purpose'">
        <div class="d-flex justify-center">
          <g-purpose-tag :purpose="shootPurpose" />
        </div>
      </template>
      <template v-if="cell.header.key === 'lastOperation'">
        <div class="d-flex align-center justify-center">
          <g-shoot-status
            :popper-key="`${shootNamespace}/${shootName}`"
          />
        </div>
      </template>
      <template v-if="cell.header.key === 'k8sVersion'">
        <div class="d-flex justify-center">
          <g-shoot-version-chip />
        </div>
      </template>
      <template v-if="cell.header.key === 'readiness'">
        <div class="d-flex">
          <g-status-tags />
        </div>
      </template>
      <template v-if="cell.header.key === 'seedReadiness'">
        <div class="d-flex">
          <g-seed-status-tags />
        </div>
      </template>
      <template v-if="cell.header.key === 'controlPlaneHighAvailability'">
        <div class="d-flex justify-center">
          <g-control-plane-high-availability-tag

            size="small"
          />
        </div>
      </template>
      <template v-if="cell.header.key === 'issueSince'">
        <g-time-string
          :date-time="shootIssueSinceTimestamp"
          mode="past"
          without-prefix-or-suffix
        />
      </template>
      <template v-if="cell.header.key === 'accessRestrictions'">
        <g-scroll-container class="d-flex flex-wrap justify-center large-container">
          <g-collapsible-items
            :items="shootAccessRestrictions"
            :uid="shootUid"
            inject-key="expandedAccessRestrictions"
          >
            <template #item="{ item }">
              <g-access-restriction-chip
                :id="item.key"
                :key="item.key"
                :title="item.title"
                :description="item.description"
                :options="item.options"
              />
            </template>
          </g-collapsible-items>
        </g-scroll-container>
      </template>
      <template v-if="cell.header.key === 'ticket'">
        <g-external-link
          v-if="shootLastUpdatedTicketUrl"
          :url="shootLastUpdatedTicketUrl"
        >
          <g-time-string
            :date-time="shootLastUpdatedTicketTimestamp"
            mode="past"
          />
        </g-external-link>
      </template>
      <template v-if="cell.header.key === 'ticketLabels'">
        <template v-if="shootLastUpdatedTicketTimestamp && !shootTicketLabels.length">
          None
        </template>
        <g-scroll-container
          v-else
          class="d-flex flex-wrap justify-center small-container"
        >
          <g-ticket-label
            v-for="label in shootTicketLabels"
            :key="label.name"
            :label="label"
          />
        </g-scroll-container>
      </template>
      <template v-if="cell.header.customField">
        <span
          v-if="cell.header.tooltip"
          v-tooltip:top="cell.header.tooltip"
          :class="{'text-disabled' : !cell.value}"
        >{{ cell.displayValue }}</span>
        <span
          v-else-if="cell.displayValue"
          :class="{'text-disabled' : !cell.value}"
        >
          {{ cell.displayValue }}
        </span>
      </template>
      <template v-if="cell.header.key === 'actions'">
        <v-row
          class="fill-height d-flex flex-nowrap"
          align="center"
          justify="end"
        >
          <g-action-button
            v-if="canGetCloudProviderCredentials"
            icon="mdi-key"
            :disabled="isClusterAccessDialogDisabled"
            :tooltip="showClusterAccessActionTitle"
            @click="setShootAction('access', shootItem)"
          />
          <g-action-button
            v-if="canPatchShoots"
            icon="mdi-dots-vertical"
            tooltip="Cluster Actions"
            @click="setShootAction('menu', shootItem, $event.target)"
          />
        </v-row>
      </template>
      <div
        v-if="isStaleShoot"
        v-tooltip:top="'This cluster is no longer part of the list and kept as stale item'"
        class="stale-overlay"
      />
    </td>
  </tr>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useTicketStore } from '@/store/ticket'
import { useShootStore } from '@/store/shoot'
import { useConfigStore } from '@/store/config'
import { useCredentialStore } from '@/store/credential'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useProjectStore } from '@/store/project'
import { useSeedStore } from '@/store/seed'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import GAccessRestrictionChip from '@/components/ShootAccessRestrictions/GAccessRestrictionChip.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GVendor from '@/components/GVendor.vue'
import GShootStatus from '@/components/GShootStatus.vue'
import GStatusTags from '@/components/GStatusTags.vue'
import GSeedStatusTags from '@/components/GSeedStatusTags.vue'
import GPurposeTag from '@/components/GPurposeTag.vue'
import GTimeString from '@/components/GTimeString.vue'
import GShootVersionChip from '@/components/ShootVersion/GShootVersionChip.vue'
import GTicketLabel from '@/components/ShootTickets/GTicketLabel.vue'
import GShootSeedName from '@/components/GShootSeedName.vue'
import GShootMessages from '@/components/ShootMessages/GShootMessages.vue'
import GAutoHide from '@/components/GAutoHide.vue'
import GExternalLink from '@/components/GExternalLink.vue'
import GControlPlaneHighAvailabilityTag from '@/components/ControlPlaneHighAvailability/GControlPlaneHighAvailabilityTag.vue'
import GWorkerGroup from '@/components/ShootWorkers/GWorkerGroup'
import GTextRouterLink from '@/components/GTextRouterLink.vue'
import GCollapsibleItems from '@/components/GCollapsibleItems'
import GScrollContainer from '@/components/GScrollContainer'

import { useProvideSeedItem } from '@/composables/useSeedItem'
import { useShootAction } from '@/composables/useShootAction'
import { useProvideShootItem } from '@/composables/useShootItem'
import { useProvideShootHelper } from '@/composables/useShootHelper'
import { formatValue } from '@/composables/useProjectShootCustomFields/helper'

import { getIssueSince } from '@/utils'
import { truncateProjectTitle } from '@/utils/project.js'

import find from 'lodash/find'
import some from 'lodash/some'
import map from 'lodash/map'
import get from 'lodash/get'
import includes from 'lodash/includes'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  visibleHeaders: {
    type: Array,
    required: true,
  },
})
const shootItem = toRef(props, 'modelValue')

const { setShootAction } = useShootAction()

const shootStore = useShootStore()
const ticketStore = useTicketStore()
const authzStore = useAuthzStore()
const configStore = useConfigStore()
const credentialStore = useCredentialStore()
const cloudProfileStore = useCloudProfileStore()
const projectStore = useProjectStore()
const seedStore = useSeedStore()
const gardenerExtensionStore = useGardenerExtensionStore()

const {
  canGetCloudProviderCredentials,
  canPatchShoots,
} = storeToRefs(authzStore)

const {
  shootMetadata,
  shootName,
  shootNamespace,
  shootCreatedBy,
  shootCreationTimestamp,
  shootProjectName,
  shootProjectTitle,
  shootPurpose,
  shootProviderType,
  shootRegion,
  shootZones,
  shootInfo,
  shootLastOperation,
  shootTechnicalId,
  shootSeedName,
  shootAccessRestrictions,
  shootWorkerGroups,
  shootUid,
  shootCloudProfileRef,
} = useProvideShootItem(shootItem, {
  cloudProfileStore,
  projectStore,
})

useProvideShootHelper(shootItem, {
  cloudProfileStore,
  configStore,
  gardenerExtensionStore,
  credentialStore,
  seedStore,
})

const seedItem = computed(() => seedStore.seedByName(shootSeedName.value))
useProvideSeedItem(seedItem)

const shootProjectTitleAndName = computed(() => {
  const title = shootProjectTitle.value
  const name = shootProjectName.value
  return title ? `${truncateProjectTitle(title, 32)} (${name})` : name
})

const isInfoAvailable = computed(() => {
  // operator not yet updated shoot resource
  if (shootLastOperation.value.type === undefined || shootLastOperation.value.state === undefined) {
    return false
  }
  return !isCreateOrDeleteInProcess.value
})

const isCreateOrDeleteInProcess = computed(() => {
  // create or delete in process
  if (includes(['Create', 'Delete'], shootLastOperation.value.type) && shootLastOperation.value.state === 'Processing') {
    return true
  }
  return false
})

const isClusterAccessDialogDisabled = computed(() => {
  if (shootInfo.value.dashboardUrl) {
    return false
  }
  if (shootInfo.value.kubeconfigGardenlogin) {
    return false
  }

  // disabled if info is NOT available
  return !isInfoAvailable.value
})

const isStaleShoot = computed(() => {
  return !shootStore.isShootActive(shootMetadata.value.uid)
})

const showClusterAccessActionTitle = computed(() => {
  return isClusterAccessDialogDisabled.value
    ? 'Cluster Access'
    : 'Show Cluster Access'
})

const shootLastUpdatedTicket = computed(() => {
  return ticketStore.latestUpdated({
    projectName: shootProjectName.value,
    name: shootName.value,
  })
})

const shootLastUpdatedTicketUrl = computed(() => {
  return get(shootLastUpdatedTicket.value, ['data', 'html_url'])
})

const shootLastUpdatedTicketTimestamp = computed(() => {
  return get(shootLastUpdatedTicket.value, ['metadata', 'updated_at'])
})

const shootTicketLabels = computed(() => {
  return ticketStore.labels({
    projectName: shootProjectName.value,
    name: shootName.value,
  })
})

const shootIssueSinceTimestamp = computed(() => {
  return getIssueSince(shootItem.value.status)
})

const cells = computed(() => {
  return map(props.visibleHeaders, header => {
    const value = get(shootItem.value, header.path)
    const displayValue = formatValue(value, ', ') || header.defaultValue

    let className = header.class
    if (isStaleShoot.value && !header.stalePointerEvents) {
      className = `${header.class} no-stale-pointer-events`
    }

    return {
      header: {
        ...header,
        class: className,
      },
      value, // currently only applicable for header.customField === true
      displayValue, // currently only applicable for header.customField === true
    }
  })
})

const hasShootWorkerGroupWarning = computed(() => {
  const machineImages = cloudProfileStore.machineImagesByCloudProfileRef(shootCloudProfileRef.value)
  return some(shootWorkerGroups.value, workerGroup => {
    const { name, version } = get(workerGroup, ['machine', 'image'], {})
    const machineImage = find(machineImages, { name, version })
    return machineImage?.isDeprecated
  })
})

</script>

<style lang="scss" scoped>
  .large-container {
    max-height: 140px;
    max-width: 350px;
  }

  .small-container {
    max-height: 37px;
    max-width: 350px;
  }

  .position-relative {
    position: relative;
  }

  .stale-overlay {
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    position: absolute;
    pointer-events: none;
  }

  .v-theme--light .stale .stale-overlay {
    background-color: rgba(255,255,255,0.7)
  }
  .v-theme--dark .stale .stale-overlay {
    background-color: rgba(30,30,30,0.7)
  }

  .no-stale-pointer-events {
    .stale-overlay {
      pointer-events: auto !important;
    }
  }
</style>
