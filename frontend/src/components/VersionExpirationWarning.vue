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
    v-if="k8sExpirationDate || expiredWorkerGroups.length"
    :title="`Update Warnings for ${shootName}`"
    toolbarColor="warning"
    :popperKey="`version_warning${shootName}`"
  >
    <template v-slot:popperRef>
      <div>
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-icon v-on="on" :color="overallStatusColor" class="cursor-pointer">mdi-update</v-icon>
          </template>
          <span>Version update warning</span>
        </v-tooltip>
      </div>
    </template>
    <ul class="update-warning-box">
      <template v-if="k8sExpirationDate">
        <li v-if="isValidTerminationDate(k8sExpirationDate)">Kubernetes version of this cluster expires <span class="font-weight-bold"><time-string :date-time="k8sExpirationDate"></time-string></span>. Version update will be enforced after this date</li>
        <li v-else>Kubernetes version of this cluster is expired. Version update will be enforced soon</li>
      </template>

      <li v-for="({expirationDate, version, name, workerName, key}) in expiredWorkerGroups" :key="key">
        <span v-if="isValidTerminationDate(expirationDate)">
          Machine image
          <span class="font-weight-bold">{{name}} | Version: {{version}}</span>
          of worker group
          <span class="font-weight-bold">{{workerName}}</span>
          expires
          <span class="font-weight-bold"><time-string :date-time="expirationDate"></time-string></span>.
          Version update will be enforced after this date
        </span>
        <span v-else>
          Machine image
          <span class="font-weight-bold">{{name}} | Version: {{version}}</span>
          of worker group
          <span class="font-weight-bold">{{workerName}}</span>
          is expired. Version update will be enforced soon
        </span>
      </li>
    </ul>
  </g-popper>
</template>

<script>

import TimeString from '@/components/TimeString'
import GPopper from '@/components/GPopper'
import find from 'lodash/find'
import forEach from 'lodash/forEach'
import get from 'lodash/get'
import { mapGetters } from 'vuex'
import { shootItem } from '@/mixins/shootItem'
import { isValidTerminationDate, k8sVersionIsNotLatestPatch, k8sVersionUpdatePathAvailable, selectedImageIsNotLatest } from '@/utils'

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
    k8sExpirationDate () {
      // not expired
      // expired
      // - automatic update active, no warning as newer patch version available info?
      // - automaic update not active or no newer patch -> expired warning, update will be enfored...
      // - no update path available ->error

      // return { expirationDate, isValidExpirationDate, isInfo, isWarning, isError}
      // calc overall state, depeneding on prop flags
      if (this.onlyMachineImageWarnings) {
        return undefined
      }

      const allVersions = this.kubernetesVersions(this.shootCloudProfileName)
      const version = find(allVersions, { version: this.shootK8sVersion })
      if (!version) {
        return undefined
      }

      const patchAvailable = k8sVersionIsNotLatestPatch(this.shootK8sVersion, this.shootCloudProfileName)
      const k8sAutoPatch = get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
      const updatePathAvailable = k8sVersionUpdatePathAvailable(this.shootK8sVersion, this.shootCloudProfileName)

      const isError = !updatePathAvailable
      const isWarning = !isError && !k8sAutoPatch && patchAvailable
      const isInfo = !isError && !isWarning && k8sAutoPatch && patchAvailable
      return {
        expirationDate: version.expirationDate,
        isValidTerminationDate: isValidTerminationDate(version.expirationDate),
        isError,
        isWarning,
        isInfo
      }
    },
    expiredWorkerGroups () {
      // not expired
      // expired
      // - automatic update active, no warning as newer version available info?
      // - automaic update not active or no newer version -> expired warning, update will be enfored...
      // - no update path available ->error

      // return { expirationDate, isValidExpirationDate, isInfo, isWarning, isError}
      // calc overall state, depeneding on prop flags
      if (this.onlyK8sWarnings) {
        return []
      }
      const expiredWorkerGroups = []
      const allMachineImages = this.machineImagesByCloudProfileName(this.shootCloudProfileName)
      const imageAutoPatch = get(this.shootItem, 'spec.maintenance.autoUpdate.machineImageVersion', false)
      forEach(this.shootWorkerGroups, worker => {
        const workerImage = get(worker, 'machine.image')
        const workerImageDetails = find(allMachineImages, workerImage)
        const updateAvailable = selectedImageIsNotLatest(workerImageDetails, allMachineImages)

        const isError = !updateAvailable
        const isWarning = !imageAutoPatch && updateAvailable
        const isInfo = imageAutoPatch && updateAvailable
        if (workerImageDetails.expirationDate) {
          expiredWorkerGroups.push({
            ...workerImageDetails,
            workerName: worker.name,
            isError,
            isWarning,
            isInfo
          })
        }
      })
      return expiredWorkerGroups
    },
    overallStatusColor () {
      const isError = !!find([this.k8sExpirationDate, ...this.expiredWorkerGroups], { isError: true })
      const isWarning = !!find([this.k8sExpirationDate, ...this.expiredWorkerGroups], { isWarning: true })
      if (isError || isWarning) {
        return 'warning'
      }
      return 'cyan darken-2'
    }
  },
  methods: {
    isValidTerminationDate (terminationDate) {
      return isValidTerminationDate(terminationDate)
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

</style>
