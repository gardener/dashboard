<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <g-popper
    v-if="k8sExpiration || expiredWorkerGroups.length"
    :title="`Update Information for ${this.shootName}`"
    :toolbarColor="overallStatusColor"
    :popperKey="`version_warning_${shootName}`"
  >
    <template v-slot:popperRef>
      <div>
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-icon v-on="on" :color="overallStatusColor" class="cursor-pointer">mdi-update</v-icon>
          </template>
          <span>{{tooltip}}</span>
        </v-tooltip>
      </div>
    </template>
    <ul class="update-warning-box" :class="listClass">
      <template v-if="k8sExpiration">
        <li>
          <span v-if="k8sExpiration.isValidTerminationDate">Kubernetes version of this cluster expires <span class="font-weight-bold"><time-string :date-time="k8sExpiration.expirationDate"></time-string></span>. </span>
          <span v-else>Kubernetes version of this cluster is expired. </span>
          <span v-if="k8sExpiration.isInfo">Version will be updated in the next maintenance window</span>
          <template v-if="k8sExpiration.isWarning">
            <span v-if="k8sExpiration.isValidTerminationDate">Version update will be enforced after this date</span>
            <span v-else>Version update will be enforced soon</span>
          </template>
          <span v-if="k8sExpiration.isError">Version update not possible due to missing update path. Please contact your landscape administrator</span>
        </li>
      </template>

      <li v-for="({expirationDate, isValidTerminationDate, version, name, workerName, key, isInfo, isWarning, isError}) in expiredWorkerGroups" :key="key">
        <span>Machine image<span class="font-weight-bold">{{name}} | Version: {{version}}</span>of worker group<span class="font-weight-bold">{{workerName}}</span></span>
        <span v-if="isValidTerminationDate">expires<span class="font-weight-bold"><time-string :date-time="expirationDate"></time-string></span>. </span>
        <span v-else>is expired. </span>
        <span v-if="isInfo">Version will be updated in the next maintenance window</span>
        <template v-if="isWarning">
          <span v-if="isValidTerminationDate">Machine Image update will be enforced after this date</span>
            <span v-else>Machine Image update will be enforced soon</span>
        </template>
        <span v-if="isError">Machine Image update as no newer version is available. Please choose another operating system</span>
      </li>
    </ul>
  </g-popper>
</template>

<script>

import TimeString from '@/components/TimeString'
import GPopper from '@/components/GPopper'
import find from 'lodash/find'
import get from 'lodash/get'
import { mapGetters } from 'vuex'
import { shootItem } from '@/mixins/shootItem'
import { k8sExpirationForShoot, expiredWorkerGroupsForShoot } from '@/utils'

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
    ...mapGetters([
      'kubernetesVersions',
      'machineImagesByCloudProfileName'
    ]),
    k8sExpiration () {
      if (this.onlyMachineImageWarnings) {
        return undefined
      }
      const k8sAutoPatch = get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
      return k8sExpirationForShoot(this.shootK8sVersion, this.shootCloudProfileName, k8sAutoPatch)
    },
    expiredWorkerGroups () {
      if (this.onlyK8sWarnings) {
        return []
      }
      const imageAutoPatch = get(this.shootItem, 'spec.maintenance.autoUpdate.machineImageVersion', false)
      return expiredWorkerGroupsForShoot(this.shootWorkerGroups, this.shootCloudProfileName, imageAutoPatch)
    },
    isOverallStatusWarning () {
      const isError = !!find([this.k8sExpiration, ...this.expiredWorkerGroups], { isError: true })
      const isWarning = !!find([this.k8sExpiration, ...this.expiredWorkerGroups], { isWarning: true })
      return isError || isWarning
    },
    overallStatusColor () {
      if (this.isOverallStatusWarning) {
        return 'warning'
      }
      return 'cyan darken-2'
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
  }
}
</script>

<style lang="scss" scoped>

  .cursor-pointer {
      cursor: pointer;
  }

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
