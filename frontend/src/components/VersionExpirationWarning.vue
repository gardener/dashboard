<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    v-if="k8sExpiration || expiredWorkerGroups.length"
    :title="`Update Information for ${this.shootName}`"
    :toolbar-color="overallStatusColor"
    :popper-key="`version_warning_${shootName}`"
  >
    <template v-slot:popperRef>
      <v-btn icon>
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-icon v-on="on" :color="overallStatusColor">mdi-update</v-icon>
          </template>
          <span>{{tooltip}}</span>
        </v-tooltip>
      </v-btn>
    </template>
    <ul class="update-warning-box" :class="listClass">
      <template v-if="k8sExpiration">
        <li>
          <span v-if="k8sExpiration.isValidTerminationDate">Kubernetes version of this cluster expires
            <v-tooltip right>
              <template v-slot:activator="{ on }">
                <span class="font-weight-bold" v-on="on"><time-string :date-time="k8sExpiration.expirationDate" mode="future"></time-string></span>
              </template>
              <span>{{getDateFormatted(k8sExpiration.expirationDate)}}</span>
            </v-tooltip>
            <span>. </span>
          </span>
          <span v-else>Kubernetes version of this cluster is expired. </span>
          <span v-if="k8sExpiration.isInfo">Version will be updated in the next maintenance window</span>
          <template v-if="k8sExpiration.isWarning">
            <span v-if="k8sExpiration.isValidTerminationDate">Version update will be enforced after that date</span>
            <span v-else>Version update will be enforced soon</span>
          </template>
          <span v-if="k8sExpiration.isError">Version update not possible due to missing update path. Please contact your landscape administrator</span>
        </li>
      </template>

      <li v-for="({expirationDate, isValidTerminationDate, version, name, workerName, key, isInfo, isWarning, isError}) in expiredWorkerGroups" :key="key">
        <span>Machine image <span class="font-weight-bold">{{name}} | Version: {{version}}</span> of worker group <span class="font-weight-bold">{{workerName}} </span></span>
        <span v-if="isValidTerminationDate">expires
          <v-tooltip right>
            <template v-slot:activator="{ on }">
              <span class="font-weight-bold" v-on="on"><time-string :date-time="expirationDate" mode="future"></time-string></span>
            </template>
            <span>{{getDateFormatted(expirationDate)}}</span>
          </v-tooltip>
          <span>. </span>
        </span>
        <span v-else>is expired. </span>
        <span v-if="isInfo">Version will be updated in the next maintenance window</span>
        <template v-if="isWarning">
          <span v-if="isValidTerminationDate">Machine Image update will be enforced after that date</span>
            <span v-else>Machine Image update will be enforced soon</span>
        </template>
        <span v-if="isError">Machine Image update not possible as no newer version is available. Please choose another operating system</span>
      </li>
    </ul>
  </g-popper>
</template>

<script>

import TimeString from '@/components/TimeString'
import GPopper from '@/components/GPopper'
import some from 'lodash/some'
import get from 'lodash/get'
import { shootItem } from '@/mixins/shootItem'
import { k8sVersionExpirationForShoot, expiringWorkerGroupsForShoot, getDateFormatted } from '@/utils'

export default {
  name: 'VerisonUpdateWarning',
  components: {
    TimeString,
    GPopper
  },
  props: {
    shootItem: {
      type: Object
    },
    onlyK8sWarnings: {
      type: Boolean
    },
    onlyMachineImageWarnings: {
      type: Boolean
    }
  },
  mixins: [shootItem],
  computed: {
    k8sExpiration () {
      if (this.onlyMachineImageWarnings) {
        return undefined
      }
      const k8sAutoPatch = get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
      return k8sVersionExpirationForShoot(this.shootK8sVersion, this.shootCloudProfileName, k8sAutoPatch)
    },
    expiredWorkerGroups () {
      if (this.onlyK8sWarnings) {
        return []
      }
      const imageAutoPatch = get(this.shootItem, 'spec.maintenance.autoUpdate.machineImageVersion', false)
      return expiringWorkerGroupsForShoot(this.shootWorkerGroups, this.shootCloudProfileName, imageAutoPatch)
    },
    isOverallStatusWarning () {
      const isError = some([this.k8sExpiration, ...this.expiredWorkerGroups], { isError: true })
      const isWarning = some([this.k8sExpiration, ...this.expiredWorkerGroups], { isWarning: true })
      return isError || isWarning
    },
    overallStatusColor () {
      if (this.isOverallStatusWarning) {
        return 'warning'
      }
      return 'primary'
    },
    listClass () {
      if ((this.k8sExpiration && this.expiredWorkerGroups.length) || this.expiredWorkerGroups.length > 1) {
        return ''
      }
      return 'no-list-style'
    },
    tooltip () {
      if (this.isOverallStatusWarning) {
        return 'Version Update Warning'
      }
      return 'Version Update Information'
    }
  },
  methods: {
    getDateFormatted (date) {
      return getDateFormatted(date)
    }
  }
}
</script>

<style lang="scss" scoped>

  .update-warning-box {
    max-width: 800px;
    text-align: left;
  }

  .no-list-style {
    list-style-type: none;
    margin: 0;
    padding: 0;
  }

</style>
