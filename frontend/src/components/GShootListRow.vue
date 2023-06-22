<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr :class="{ 'stale': isStaleShoot }">
    <td v-for="cell in cells"
      :key="cell.header.key"
      :class="cell.header.class"
      class="position-relative"
    >
      <template v-if="cell.header.key === 'project'">
        <router-link class="text-anchor" :to="{ name: 'ShootList', params: { namespace: shootNamespace } }">
          {{ shootProjectName }}
        </router-link>
      </template>
      <template v-if="cell.header.key === 'name'">
        <v-row class="pa-0 ma-0 fill-height flex-nowrap align-center">
          <v-col class="grow pa-0 ma-0">
            <g-auto-hide right>
              <template v-slot:activator>
                <router-link class="text-anchor" :to="{ name: 'ShootItem', params: { name: shootName, namespace: shootNamespace } }">
                  {{ shootName }}
                </router-link>
              </template>
              <g-copy-btn :clipboard-text="shootName"/>
            </g-auto-hide>
          </v-col>
          <v-col class="shrink pa-0 ma-0">
            <g-shoot-messages :shoot-item="shootItem" />
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
          <template v-slot:activator>
            <g-shoot-seed-name :shoot-item="shootItem" />
          </template>
          <g-copy-btn :clipboard-text="shootSeedName"/>
        </g-auto-hide>
      </template>
      <template v-if="cell.header.key === 'technicalId'">
        <g-auto-hide right>
          <template v-slot:activator>
            <span>{{shootTechnicalId}}</span>
          </template>
          <g-copy-btn :clipboard-text="shootTechnicalId"/>
        </g-auto-hide>
      </template>
      <template v-if="cell.header.key === 'createdBy'">
        <g-account-avatar :account-name="shootCreatedBy"/>
      </template>
      <template v-if="cell.header.key === 'createdAt'">
        <g-time-string :date-time="shootCreationTimestamp" mode="past"/>
      </template>
      <template v-if="cell.header.key === 'purpose'">
        <div class="d-flex justify-center">
          <g-purpose-tag :purpose="shootPurpose"/>
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
          <g-shoot-version :shoot-item="shootItem" chip/>
        </div>
      </template>
      <template v-if="cell.header.key === 'readiness'">
        <div class="d-flex">
          <g-status-tags :shoot-item="shootItem"/>
        </div>
      </template>
      <template v-if="cell.header.key === 'controlPlaneHighAvailability'">
        <div class="d-flex justify-center">
          <g-control-plane-high-availability-tag :shoot-item="shootItem" size="small"/>
        </div>
      </template>
      <template v-if="cell.header.key === 'issueSince'">
        <v-tooltip location="top">
          <template v-slot:activator="{ props }">
            <div v-bind="props">
              <g-time-string :date-time="shootIssueSinceTimestamp" mode="past" withoutPrefixOrSuffix/>
            </div>
          </template>
          {{ shootIssueSince }}
        </v-tooltip>
      </template>
      <template v-if="cell.header.key === 'accessRestrictions'">
        access-restriction-chips
        <g-access-restriction-chips :selected-access-restrictions="shootSelectedAccessRestrictions"/>
      </template>
      <template v-if="cell.header.key === 'ticket'">
        <g-external-link v-if="shootLastUpdatedTicketUrl" :url="shootLastUpdatedTicketUrl">
          <g-time-string :date-time="shootLastUpdatedTicketTimestamp" mode="past"/>
        </g-external-link>
      </template>
      <template v-if="cell.header.key === 'ticketLabels'">
        <template v-if="shootLastUpdatedTicketTimestamp && !shootTicketLabels.length">
          None
        </template>
        <div class="labels" v-else>
          <g-ticket-label v-for="label in shootTicketLabels"
            :key="label.id"
            :label="label"
          />
        </div>
      </template>
      <template v-if="cell.header.customField">
        <template v-if="cell.value">
          <v-tooltip location="top" v-if="cell.header.tooltip">
            <template v-slot:activator="{ props }">
              <span v-bind="props">{{cell.value}}</span>
            </template>
            {{cell.header.tooltip}}
          </v-tooltip>
          <span v-else>{{cell.value}}</span>
        </template>
        <span class="text-grey" v-else-if="cell.header.defaultValue">
          {{cell.header.defaultValue}}
        </span>
      </template>
      <template v-if="cell.header.key === 'actions'">
        <v-row class="fill-height" align="center" justify="end">
          <g-action-button
            icon="mdi-key"
            :disabled="isClusterAccessDialogDisabled"
            @click="showDialog('access')"
          >
            <template #tooltip>
              <span>{{ showClusterAccessActionTitle }}</span>
            </template>
          </g-action-button>
          <g-shoot-list-row-actions :shoot-item="shootItem"/>
        </v-row>
      </template>
      <v-tooltip location="top" v-if="isStaleShoot">
        <template v-slot:activator="{ props }">
          <div class="stale-overlay" v-bind="props"></div>
        </template>
        This cluster is no longer part of the list and kept as stale item
      </v-tooltip>
    </td>
  </tr>
</template>

<script>
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'

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

import {
  isTypeDelete,
  getTimestampFormatted,
  getIssueSince,
} from '@/utils'

import { shootItem } from '@/mixins/shootItem'

import includes from 'lodash/includes'
import get from 'lodash/get'
import map from 'lodash/map'
import isObject from 'lodash/isObject'
import { useAuthzStore, useTicketStore } from '@/store'

export default defineComponent({
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
  },
  props: {
    visibleHeaders: {
      type: Array,
      required: true,
    },
  },
  mixins: [shootItem],
  computed: {
    ...mapState(useAuthzStore, [
      'canGetSecrets',
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
      if (this.shootInfo.kubeconfig) {
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
  emits: [
    'showDialog',
  ],
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
})
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

  .theme--light .stale .stale-overlay {
    background-color: rgba(255,255,255,0.7)
  }
  .theme--dark .stale .stale-overlay {
    background-color: rgba(30,30,30,0.7)
  }

  .no-stale-pointer-events {
    .stale-overlay {
      pointer-events: auto !important;
    }
  }
</style>
