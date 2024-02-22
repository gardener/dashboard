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
            <g-shoot-messages
              :shoot-item="shootItem"
            />
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
            <g-shoot-seed-name :shoot-item="shootItem" />
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
        <g-worker-groups
          :shoot-item="shootItem"
          collapse
        />
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
            :shoot-item="shootItem"
          />
        </div>
      </template>
      <template v-if="cell.header.key === 'k8sVersion'">
        <div class="d-flex justify-center">
          <g-shoot-version
            :shoot-item="shootItem"
            chip
          />
        </div>
      </template>
      <template v-if="cell.header.key === 'readiness'">
        <div class="d-flex">
          <g-status-tags :shoot-item="shootItem" />
        </div>
      </template>
      <template v-if="cell.header.key === 'controlPlaneHighAvailability'">
        <div class="d-flex justify-center">
          <g-control-plane-high-availability-tag
            :shoot-item="shootItem"
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
        <g-access-restriction-chips
          :selected-access-restrictions="shootSelectedAccessRestrictions"
          collapse
          :shoot-uid="shootMetadata.uid"
        />
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
        <g-collapsable-items
          v-else
          :items="shootTicketLabels"
          :uid="shootMetadata.uid"
          inject-key="expandedTicketLabels"
          item-name="Ticket"
          hide-empty
          collapse
        >
          <template #item="{ item }">
            <g-ticket-label
              :label="item"
            />
          </template>
        </g-collapsable-items>
      </template>
      <template v-if="cell.header.customField">
        <template v-if="cell.value">
          <v-tooltip
            v-if="cell.header.tooltip"
            location="top"
          >
            <template #activator="{ props }">
              <span v-bind="props">{{ cell.value }}</span>
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
            :shoot-item="shootItem"
          />
        </v-row>
      </template>
      <v-tooltip
        v-if="isStaleShoot"
        location="top"
      >
        <template #activator="{ props }">
          <div
            class="stale-overlay"
            v-bind="props"
          />
        </template>
        This cluster is no longer part of the list and kept as stale item
      </v-tooltip>
    </td>
  </tr>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useTicketStore } from '@/store/ticket'

import GAccessRestrictionChips from '@/components/ShootAccessRestrictions/GAccessRestrictionChips.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GVendor from '@/components/GVendor.vue'
import GShootStatus from '@/components/GShootStatus.vue'
import GStatusTags from '@/components/GStatusTags.vue'
import GPurposeTag from '@/components/GPurposeTag.vue'
import GTimeString from '@/components/GTimeString.vue'
import GShootVersion from '@/components/ShootVersion/GShootVersion.vue'
import GTicketLabel from '@/components/ShootTickets/GTicketLabel.vue'
import GShootSeedName from '@/components/GShootSeedName.vue'
import GShootMessages from '@/components/ShootMessages/GShootMessages.vue'
import GShootListRowActions from '@/components/GShootListRowActions.vue'
import GAutoHide from '@/components/GAutoHide.vue'
import GExternalLink from '@/components/GExternalLink.vue'
import GControlPlaneHighAvailabilityTag from '@/components/ControlPlaneHighAvailability/GControlPlaneHighAvailabilityTag.vue'
import GWorkerGroups from '@/components/ShootWorkers/GWorkerGroups'
import GTextRouterLink from '@/components/GTextRouterLink.vue'
import GCollapsableItems from '@/components/GCollapsableItems'

import {
  isTypeDelete,
  getTimestampFormatted,
  getIssueSince,
} from '@/utils'
import { shootItem } from '@/mixins/shootItem'

import {
  includes,
  get,
  map,
  isObject,
} from '@/lodash'

export default {
  components: {
    GAccessRestrictionChips,
    GActionButton,
    GStatusTags,
    GPurposeTag,
    GShootStatus,
    GTimeString,
    GShootVersion,
    GTicketLabel,
    GAccountAvatar,
    GCopyBtn,
    GShootSeedName,
    GVendor,
    GShootMessages,
    GShootListRowActions,
    GAutoHide,
    GExternalLink,
    GControlPlaneHighAvailabilityTag,
    GWorkerGroups,
    GTextRouterLink,
    GCollapsableItems,
  },
  mixins: [shootItem],
  props: {
    visibleHeaders: {
      type: Array,
      required: true,
    },
  },
  emits: [
    'showDialog',
  ],
  computed: {
    ...mapState(useAuthzStore, [
      'canGetSecrets',
      'canPatchShoots',
      'canDeleteShoots',
    ]),

    isInfoAvailable () {
      // operator not yet updated shoot resource
      if (this.shootLastOperation.type === undefined || this.shootLastOperation.state === undefined) {
        return false
      }
      return !this.isCreateOrDeleteInProcess
    },
    isCreateOrDeleteInProcess () {
      // create or delete in process
      if (includes(['Create', 'Delete'], this.shootLastOperation.type) && this.shootLastOperation.state === 'Processing') {
        return true
      }
      return false
    },
    isTypeDelete () {
      return isTypeDelete(this.shootLastOperation)
    },
    isClusterAccessDialogDisabled () {
      if (this.shootInfo.dashboardUrl) {
        return false
      }
      if (this.shootInfo.kubeconfigGardenlogin) {
        return false
      }

      // disabled if info is NOT available
      return !this.isInfoAvailable
    },
    showClusterAccessActionTitle () {
      return this.isClusterAccessDialogDisabled
        ? 'Cluster Access'
        : 'Show Cluster Access'
    },
    shootLastUpdatedTicket () {
      return this.latestUpdatedTicket({
        projectName: this.shootProjectName,
        name: this.shootName,
      })
    },
    shootLastUpdatedTicketUrl () {
      return get(this.shootLastUpdatedTicket, 'data.html_url')
    },
    shootLastUpdatedTicketTimestamp () {
      return get(this.shootLastUpdatedTicket, 'metadata.updated_at')
    },
    shootTicketLabels () {
      return this.ticketLabels({
        projectName: this.shootProjectName,
        name: this.shootName,
      })
    },
    shootIssueSinceTimestamp () {
      return getIssueSince(this.shootItem.status)
    },
    shootIssueSince () {
      return getTimestampFormatted(this.shootIssueSinceTimestamp)
    },
    cells () {
      return map(this.visibleHeaders, header => {
        let value = get(this.shootItem, header.path)
        if (isObject(value)) { // only allow primitive types
          value = undefined
        }

        let className = header.class
        if (this.isStaleShoot && !header.stalePointerEvents) {
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
    },
  },
  methods: {
    ...mapActions(useTicketStore, {
      latestUpdatedTicket: 'latestUpdated',
      ticketLabels: 'labels',
    }),
    showDialog (action) {
      const shootItem = this.shootItem
      this.$emit('showDialog', { action, shootItem })
    },
  },
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
