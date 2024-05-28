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
          :text="shootProjectName"
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
          :cloud-provider-kind="shootCloudProviderKind"
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
        <g-worker-groups />
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
        <g-access-restriction-chips :access-restrictions="shootAccessRestrictions" />
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
        <div
          v-else
          class="labels"
        >
          <g-ticket-label
            v-for="label in shootTicketLabels"
            :key="label.id"
            :label="label"
          />
        </div>
      </template>
      <template v-if="cell.header.customField">
        <template v-if="cell.value">
          <v-tooltip
            v-if="cell.header.tooltip"
            location="top"
          >
            <template #activator="slotProps">
              <span v-bind="slotProps.props">{{ cell.value }}</span>
            </template>
            {{ cell.header.tooltip }}
          </v-tooltip>
          <span v-else>{{ cell.value }}</span>
        </template>
        <span
          v-else-if="cell.header.defaultValue"
          class="text-grey"
        >
          {{ cell.header.defaultValue }}
        </span>
      </template>
      <template v-if="cell.header.key === 'actions'">
        <v-row
          class="fill-height d-flex flex-nowrap"
          align="center"
          justify="end"
        >
          <g-action-button
            v-if="canGetSecrets"
            icon="mdi-key"
            :disabled="isClusterAccessDialogDisabled"
            :tooltip="showClusterAccessActionTitle"
            @click="showDialog('access')"
          />
          <g-shoot-list-row-actions
            v-if="canPatchShoots"
          />
        </v-row>
      </template>
      <v-tooltip
        v-if="isStaleShoot"
        location="top"
      >
        <template #activator="slotProps">
          <div
            class="stale-overlay"
            v-bind="slotProps.props"
          />
        </template>
        This cluster is no longer part of the list and kept as stale item
      </v-tooltip>
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
import { useSecretStore } from '@/store/secret'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useProjectStore } from '@/store/project'
import { useSeedStore } from '@/store/seed'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import GAccessRestrictionChips from '@/components/ShootAccessRestrictions/GAccessRestrictionChips.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GVendor from '@/components/GVendor.vue'
import GShootStatus from '@/components/GShootStatus.vue'
import GStatusTags from '@/components/GStatusTags.vue'
import GPurposeTag from '@/components/GPurposeTag.vue'
import GTimeString from '@/components/GTimeString.vue'
import GShootVersionChip from '@/components/ShootVersion/GShootVersionChip.vue'
import GTicketLabel from '@/components/ShootTickets/GTicketLabel.vue'
import GShootSeedName from '@/components/GShootSeedName.vue'
import GShootMessages from '@/components/ShootMessages/GShootMessages.vue'
import GShootListRowActions from '@/components/GShootListRowActions.vue'
import GAutoHide from '@/components/GAutoHide.vue'
import GExternalLink from '@/components/GExternalLink.vue'
import GControlPlaneHighAvailabilityTag from '@/components/ControlPlaneHighAvailability/GControlPlaneHighAvailabilityTag.vue'
import GWorkerGroups from '@/components/ShootWorkers/GWorkerGroups'
import GTextRouterLink from '@/components/GTextRouterLink.vue'

import { useProvideShootItem } from '@/composables/useShootItem'
import { useProvideShootHelper } from '@/composables/useShootHelper'

import { getIssueSince } from '@/utils'

import {
  includes,
  get,
  map,
  isObject,
} from '@/lodash'

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

const emit = defineEmits([
  'showDialog',
])

const shootStore = useShootStore()
const ticketStore = useTicketStore()
const authzStore = useAuthzStore()
const configStore = useConfigStore()
const secretStore = useSecretStore()
const cloudProfileStore = useCloudProfileStore()
const projectStore = useProjectStore()
const seedStore = useSeedStore()
const gardenerExtensionStore = useGardenerExtensionStore()

const {
  canGetSecrets,
  canPatchShoots,
} = storeToRefs(authzStore)

const {
  shootMetadata,
  shootName,
  shootNamespace,
  shootCreatedBy,
  shootCreationTimestamp,
  shootProjectName,
  shootPurpose,
  shootCloudProviderKind,
  shootRegion,
  shootZones,
  shootInfo,
  shootLastOperation,
  shootTechnicalId,
  shootSeedName,
  shootAccessRestrictions,
} = useProvideShootItem(shootItem, {
  cloudProfileStore,
  projectStore,
  seedStore,
})

useProvideShootHelper(shootItem, {
  cloudProfileStore,
  configStore,
  gardenerExtensionStore,
  secretStore,
  seedStore,
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
  return get(shootLastUpdatedTicket.value, 'data.html_url')
})

const shootLastUpdatedTicketTimestamp = computed(() => {
  return get(shootLastUpdatedTicket.value, 'metadata.updated_at')
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
    let value = get(shootItem.value, header.path)
    if (isObject(value)) { // only allow primitive types
      value = undefined
    }

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
    }
  })
})

function showDialog (action) {
  emit('showDialog', {
    action,
    shootItem: shootItem.value,
  })
}
</script>

<style lang="scss" scoped>
  .labels {
    line-height: 10px;
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
