<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr>
    <td v-for="cell in cells" :key="cell.header.value" :class="cell.header.class">
      <template v-if="cell.header.value === 'project'">
        <router-link :to="{ name: 'ShootList', params: { namespace: shootNamespace } }">
          {{ shootProjectName }}
        </router-link>
      </template>
      <template v-if="cell.header.value === 'name'">
        <v-row align="center" class="pa-0 ma-0 fill-height flex-nowrap">
          <v-col class="grow pa-0 ma-0">
            <div class="d-flex align-center justify-start flex-nowrap fill-height">
              <router-link :to="{ name: 'ShootItem', params: { name: shootName, namespace: shootNamespace } }">
                {{ shootName }}
              </router-link>
              <copy-btn :clipboard-text="shootName" auto-hide></copy-btn>
            </div>
          </v-col>
          <v-col class="shrink" >
            <div class="d-flex flew-row" v-if="!isShootMarkedForDeletion">
              <self-termination-warning :expiration-timestamp="shootExpirationTimestamp" />
              <version-expiration-warning :shoot-item="shootItem" />
              <constraint-warning
                :value="!isMaintenancePreconditionSatisfied"
                type="maintenance"
                icon>
                {{maintenancePreconditionSatisfiedMessage}}
              </constraint-warning>
              <constraint-warning
                :value="!isHibernationPossible && shootHibernationSchedules.length > 0"
                type="hibernation"
                icon>
                {{hibernationPossibleMessage}}
              </constraint-warning>
              <hibernation-schedule-warning
                v-if="isShootHasNoHibernationScheduleWarning"
                :name="shootName"
                :namespace="shootNamespace"
                :purpose="shootPurpose" />
            </div>
          </v-col>
        </v-row>
      </template>
      <template v-if="cell.header.value === 'infrastructure'">
        <vendor :cloud-provider-kind="shootCloudProviderKind" :region="shootRegion" :zones="shootZones"></vendor>
      </template>
      <template v-if="cell.header.value === 'seed'">
        <div class="d-flex align-center justify-start flex-nowrap fill-height">
          <shoot-seed-name :shoot-item="shootItem" />
          <copy-btn :clipboard-text="shootSeedName" auto-hide></copy-btn>
        </div>
      </template>
      <template v-if="cell.header.value === 'technicalId'">
        <div class="d-flex align-center justify-start flex-nowrap fill-height">
          <span>{{shootTechnicalId}}</span>
          <copy-btn :clipboard-text="shootTechnicalId" auto-hide></copy-btn>
        </div>
      </template>
      <template v-if="cell.header.value === 'createdBy'">
        <account-avatar :account-name="shootCreatedBy"></account-avatar>
      </template>
      <template v-if="cell.header.value === 'createdAt'">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <div v-on="on">
              <time-string :date-time="shootCreationTimestamp" mode="past"></time-string>
            </div>
          </template>
          {{ shootCreatedAt }}
        </v-tooltip>
      </template>
      <template v-if="cell.header.value === 'purpose'">
        <div class="d-flex justify-center pr-4">
          <purpose-tag :purpose="shootPurpose"></purpose-tag>
        </div>
      </template>
      <template v-if="cell.header.value === 'lastOperation'">
        <div class="d-flex align-center justify-center pr-4">
          <shoot-status
          :popper-key="`${shootNamespace}/${shootName}`"
          :shoot-item="shootItem">
          </shoot-status>
        </div>
      </template>
      <template v-if="cell.header.value === 'k8sVersion'">
        <div class="d-flex justify-center pr-4">
          <shoot-version :shoot-item="shootItem" chip></shoot-version>
        </div>
      </template>
      <template v-if="cell.header.value === 'readiness'">
        <div class="d-flex justify-center pr-4">
          <status-tags :shoot-item="shootItem"></status-tags>
        </div>
      </template>
      <template v-if="cell.header.value === 'accessRestrictions'">
        <access-restriction-chips :selected-access-restrictions="shootSelectedAccessRestrictions"></access-restriction-chips>
      </template>
      <template v-if="cell.header.value === 'ticket'">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <div v-on="on">
              <router-link :to="{ name: 'ShootItem', params: { name: shootName, namespace: shootNamespace } }">
                <time-string :date-time="shootLastUpdatedTicketTimestamp" mode="past"></time-string>
              </router-link>
            </div>
          </template>
          {{ shootLastUpdatedTicket }}
        </v-tooltip>
      </template>
      <template v-if="cell.header.value === 'ticketLabels'">
        <template v-if="shootLastUpdatedTicketTimestamp && !shootTicketsLabels.length">
          None
        </template>
        <div class="labels" v-else>
          <ticket-label v-for="label in shootTicketsLabels" :key="label.id" :label="label"></ticket-label>
        </div>
      </template>
      <template v-if="cell.header.customField">
        <template v-if="cell.value">
          <v-tooltip top v-if="cell.header.tooltip">
            <template v-slot:activator="{ on }">
              <span v-on="on">{{cell.value}}</span>
            </template>
            {{cell.header.tooltip}}
          </v-tooltip>
          <span v-else>{{cell.value}}</span>
        </template>
        <span class="grey--text" v-else-if="cell.header.defaultValue">
          {{cell.header.defaultValue}}
        </span>
      </template>
      <template v-if="cell.header.value === 'actions'">
        <v-row class="fill-height" align="center" justify="end">
          <v-tooltip top v-if="canGetSecrets">
            <template v-slot:activator="{ on }">
              <div v-on="on">
                <v-btn small icon class="action-button--text" :disabled="isClusterAccessDialogDisabled" @click="showDialog('access')">
                  <v-icon size="22">mdi-key</v-icon>
                </v-btn>
              </div>
            </template>
            <span>{{showClusterAccessActionTitle}}</span>
          </v-tooltip>
          <shoot-list-row-actions :shoot-item="shootItem"></shoot-list-row-actions>
        </v-row>
      </template>
    </td>
  </tr>
</template>

<script>
import { mapGetters } from 'vuex'
import includes from 'lodash/includes'
import get from 'lodash/get'
import map from 'lodash/map'
import isObject from 'lodash/isObject'

import AccessRestrictionChips from '@/components/ShootAccessRestrictions/AccessRestrictionChips'
import AccountAvatar from '@/components/AccountAvatar'
import CopyBtn from '@/components/CopyBtn'
import Vendor from '@/components/Vendor'
import ShootStatus from '@/components/ShootStatus'
import StatusTags from '@/components/StatusTags'
import PurposeTag from '@/components/PurposeTag'
import TimeString from '@/components/TimeString'
import ShootVersion from '@/components/ShootVersion/ShootVersion'
import TicketLabel from '@/components/ShootTickets/TicketLabel'
import SelfTerminationWarning from '@/components/SelfTerminationWarning'
import HibernationScheduleWarning from '@/components/ShootHibernation/HibernationScheduleWarning'
import ShootSeedName from '@/components/ShootSeedName'
import VersionExpirationWarning from '@/components/VersionExpirationWarning'
import ShootListRowActions from '@/components/ShootListRowActions'
import ConstraintWarning from '@/components/ConstraintWarning'

import {
  isTypeDelete,
  isShootHasNoHibernationScheduleWarning,
  getTimestampFormatted
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
    SelfTerminationWarning,
    HibernationScheduleWarning,
    AccountAvatar,
    CopyBtn,
    ShootSeedName,
    Vendor,
    VersionExpirationWarning,
    ShootListRowActions,
    ConstraintWarning
  },
  props: {
    shootItem: {
      type: Object,
      required: true
    },
    visibleHeaders: {
      type: Array,
      required: true
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'latestUpdatedTicketByNameAndNamespace',
      'ticketsLabels',
      'canGetSecrets',
      'canDeleteShoots'
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
    isShootHasNoHibernationScheduleWarning () {
      return isShootHasNoHibernationScheduleWarning(this.shootItem)
    },
    shootLastUpdatedTicketTimestamp () {
      return this.latestUpdatedTicketByNameAndNamespace(this.shootMetadata)
    },
    shootLastUpdatedTicket () {
      return getTimestampFormatted(this.shootLastUpdatedTicketTimestamp)
    },
    shootTicketsLabels () {
      return this.ticketsLabels(this.shootMetadata)
    },
    cells () {
      return map(this.visibleHeaders, header => {
        let value = get(this.shootItem, header.path)
        if (isObject(value)) { // only allow primitive types
          value = undefined
        }
        return {
          header,
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
</style>
