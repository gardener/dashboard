<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr :class="{ 'stale': isStaleShoot }">
    <td v-for="cell in cells" :key="cell.header.value" :class="cell.header.class" class="position-relative">
      <template v-if="cell.header.value === 'project'">
        <router-link :to="{ name: 'ShootList', params: { namespace: shootNamespace } }">
          {{ shootProjectName }}
        </router-link>
      </template>
      <template v-if="cell.header.value === 'name'">
        <v-row class="pa-0 ma-0 fill-height flex-nowrap align-center">
          <v-col class="grow pa-0 ma-0">
            <auto-hide right>
              <template v-slot:activator>
                <router-link :to="{ name: 'ShootItem', params: { name: shootName, namespace: shootNamespace } }">
                  {{ shootName }}
                </router-link>
              </template>
              <copy-btn :clipboard-text="shootName"></copy-btn>
            </auto-hide>
          </v-col>
          <v-col class="shrink pa-0 ma-0">
            <shoot-messages :shoot-item="shootItem" />
          </v-col>
        </v-row>
      </template>
      <template v-if="cell.header.value === 'infrastructure'">
        <vendor :cloud-provider-kind="shootCloudProviderKind" :region="shootRegion" :zones="shootZones"></vendor>
      </template>
      <template v-if="cell.header.value === 'seed'">
        <auto-hide right>
          <template v-slot:activator>
            <shoot-seed-name :shoot-item="shootItem" />
          </template>
          <copy-btn :clipboard-text="shootSeedName"></copy-btn>
        </auto-hide>
      </template>
      <template v-if="cell.header.value === 'technicalId'">
        <auto-hide right>
          <template v-slot:activator>
            <span>{{shootTechnicalId}}</span>
          </template>
          <copy-btn :clipboard-text="shootTechnicalId"></copy-btn>
        </auto-hide>
      </template>
      <template v-if="cell.header.value === 'createdBy'">
        <account-avatar :account-name="shootCreatedBy"></account-avatar>
      </template>
      <template v-if="cell.header.value === 'createdAt'">
        <time-string :date-time="shootCreationTimestamp" mode="past"></time-string>
      </template>
      <template v-if="cell.header.value === 'purpose'">
        <div class="d-flex justify-center">
          <purpose-tag :purpose="shootPurpose"></purpose-tag>
        </div>
      </template>
      <template v-if="cell.header.value === 'lastOperation'">
        <div class="d-flex align-center justify-center">
          <shoot-status
          :popper-key="`${shootNamespace}/${shootName}`"
          :shoot-item="shootItem">
          </shoot-status>
        </div>
      </template>
      <template v-if="cell.header.value === 'k8sVersion'">
        <div class="d-flex justify-center">
          <shoot-version :shoot-item="shootItem" chip></shoot-version>
        </div>
      </template>
      <template v-if="cell.header.value === 'readiness'">
        <div class="d-flex">
          <status-tags :shoot-item="shootItem"></status-tags>
        </div>
      </template>
      <template v-if="cell.header.value === 'controlPlaneHighAvailability'">
        <div class="d-flex justify-center">
          <control-plane-high-availability-tag :shoot-item="shootItem"></control-plane-high-availability-tag>
        </div>
      </template>
      <template v-if="cell.header.value === 'issueSince'">
        <v-tooltip location="top">
          <template v-slot:activator="{ on }">
            <div v-on="on">
              <time-string :date-time="shootIssueSinceTimestamp" mode="past" withoutPrefixOrSuffix></time-string>
            </div>
          </template>
          {{ shootIssueSince }}
        </v-tooltip>
      </template>
      <template v-if="cell.header.value === 'accessRestrictions'">
        <access-restriction-chips :selected-access-restrictions="shootSelectedAccessRestrictions"></access-restriction-chips>
      </template>
      <template v-if="cell.header.value === 'ticket'">
        <external-link v-if="shootLastUpdatedTicketUrl" :url="shootLastUpdatedTicketUrl">
          <time-string :date-time="shootLastUpdatedTicketTimestamp" mode="past"></time-string>
        </external-link>
      </template>
      <template v-if="cell.header.value === 'ticketLabels'">
        <template v-if="shootLastUpdatedTicketTimestamp && !shootTicketLabels.length">
          None
        </template>
        <div class="labels" v-else>
          <ticket-label v-for="label in shootTicketLabels" :key="label.id" :label="label"></ticket-label>
        </div>
      </template>
      <template v-if="cell.header.customField">
        <template v-if="cell.value">
          <v-tooltip location="top" v-if="cell.header.tooltip">
            <template v-slot:activator="{ on }">
              <span v-on="on">{{cell.value}}</span>
            </template>
            {{cell.header.tooltip}}
          </v-tooltip>
          <span v-else>{{cell.value}}</span>
        </template>
        <span class="text-grey" v-else-if="cell.header.defaultValue">
          {{cell.header.defaultValue}}
        </span>
      </template>
      <template v-if="cell.header.value === 'actions'">
        <v-row class="fill-height" align="center" justify="end">
          <v-tooltip location="top" v-if="canGetSecrets">
            <template v-slot:activator="{ on }">
              <div v-on="on">
                <v-btn size="small" icon class="action-button--text" :disabled="isClusterAccessDialogDisabled" @click="showDialog('access')">
                  <v-icon size="22">mdi-key</v-icon>
                </v-btn>
              </div>
            </template>
            <span>{{showClusterAccessActionTitle}}</span>
          </v-tooltip>
          <shoot-list-row-actions :shoot-item="shootItem"></shoot-list-row-actions>
        </v-row>
      </template>
      <v-tooltip location="top" v-if="isStaleShoot">
        <template v-slot:activator="{ on }">
          <div class="stale-overlay" v-on="on"></div>
        </template>
        This cluster is no longer part of the list and kept as stale item
      </v-tooltip>
    </td>
  </tr>
</template>

<script>
import { mapGetters } from 'vuex'
import includes from 'lodash/includes'
import get from 'lodash/get'
import map from 'lodash/map'
import isObject from 'lodash/isObject'

import AccessRestrictionChips from '@/components/ShootAccessRestrictions/AccessRestrictionChips.vue'
import AccountAvatar from '@/components/AccountAvatar.vue'
import CopyBtn from '@/components/CopyBtn.vue'
import Vendor from '@/components/Vendor.vue'
import ShootStatus from '@/components/ShootStatus.vue'
import StatusTags from '@/components/StatusTags.vue'
import PurposeTag from '@/components/PurposeTag.vue'
import TimeString from '@/components/TimeString.vue'
import ShootVersion from '@/components/ShootVersion/ShootVersion.vue'
import TicketLabel from '@/components/ShootTickets/TicketLabel.vue'
import ShootSeedName from '@/components/ShootSeedName.vue'
import ShootMessages from '@/components/ShootMessages/ShootMessages.vue'
import ShootListRowActions from '@/components/ShootListRowActions.vue'
import AutoHide from '@/components/AutoHide.vue'
import ExternalLink from '@/components/ExternalLink.vue'
import ControlPlaneHighAvailabilityTag from '@/components/ControlPlaneHighAvailability/ControlPlaneHighAvailabilityTag.vue'

import {
  isTypeDelete,
  getTimestampFormatted,
  getIssueSince
} from '@/utils'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    AccessRestrictionChips,
    StatusTags,
    PurposeTag,
    ShootStatus,
    TimeString,
    ShootVersion,
    TicketLabel,
    AccountAvatar,
    CopyBtn,
    ShootSeedName,
    Vendor,
    ShootMessages,
    ShootListRowActions,
    AutoHide,
    ExternalLink,
    ControlPlaneHighAvailabilityTag
  },
  props: {
    visibleHeaders: {
      type: Array,
      required: true
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'canGetSecrets',
      'canDeleteShoots'
    ]),
    ...mapGetters('tickets', {
      latestUpdatedTicket: 'latestUpdated',
      ticketLabels: 'labels'
    }),
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
        name: this.shootName
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
        name: this.shootName
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
            class: className
          },
          value // currently only applicable for header.customField === true
        }
      })
    }
  },
  methods: {
    showDialog: function (action) {
      const shootItem = this.shootItem
      this.$emit('show-dialog', { action, shootItem })
    }
  }
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
