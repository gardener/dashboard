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
            <v-icon v-on="on" color="warning" class="cursor-pointer">mdi-update</v-icon>
          </template>
          <span>Version update warning</span>
        </v-tooltip>
      </div>
    </template>
    <ul class="update-warning-box">
      <li v-if="k8sExpirationDate">Kubernetes version of this cluster is about to expire. The version update will be enforced <span class="font-weight-bold"><time-string :date-time="k8sExpirationDate"></time-string></span></li>
      <li v-for="({expirationDate, version, name, workerName, key}) in expiredWorkerGroups" :key="key">
        Machine image
        <span class="font-weight-bold">{{name}} | Version: {{version}}</span>
        of worker group
        <span class="font-weight-bold">{{workerName}}</span>
        is about to expire. The version update will be enforced
        <span class="font-weight-bold"><time-string :date-time="expirationDate"></time-string></span>
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
      if (this.onlyMachineImageWarnings) {
        return undefined
      }
      const allVersions = this.kubernetesVersions(this.shootCloudProfileName)
      const version = find(allVersions, { version: this.shootK8sVersion })
      if (version) {
        return version.expirationDate
      }
      return undefined
    },
    expiredWorkerGroups () {
      if (this.onlyK8sWarnings) {
        return []
      }
      const expiredWorkerGroups = []
      const allMachineImages = this.machineImagesByCloudProfileName(this.shootCloudProfileName)
      forEach(this.shootWorkerGroups, worker => {
        const workerImage = get(worker, 'machine.image')
        const workerImageDetails = find(allMachineImages, workerImage)
        if (workerImageDetails.expirationDate) {
          expiredWorkerGroups.push({
            ...workerImageDetails,
            workerName: worker.name
          })
        }
      })
      return expiredWorkerGroups
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
