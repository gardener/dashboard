<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <div>
    <v-flex xs12>
      <div class="subheading pt-3">{{title}}</div>
    </v-flex>
    <v-flex xs12>
      <v-list two-line>
        <v-list-tile class="list-complete-item">
          <v-list-tile-action>
            <v-checkbox v-if="selectable" color="cyan darken-2" v-model="osUpdates" disabled></v-checkbox>
            <v-icon v-else>mdi-arrow-up-bold-circle-outline</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>Operating System</v-list-tile-title>
            <v-list-tile-sub-title>
              Update the operating system of the workers<br />
              (requires rolling update of all workers, ensure proper pod disruption budgets to ensure availability of your workload)
            </v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile class="list-complete-item" v-if="selectable || updateVersion">
          <v-list-tile-action>
            <v-checkbox v-if="selectable" color="cyan darken-2" v-model="updateVersion"></v-checkbox>
            <v-icon v-else>mdi-arrow-up-bold-circle-outline</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title >Kubernetes Patch Version</v-list-tile-title>
            <v-list-tile-sub-title>
              Update the control plane of the cluster and the worker components<br />
              (control plane, most notably the API server, will be briefly unavailable during switch-over)
            </v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-flex>
  </div>
</template>

<script>

export default {
  name: 'maintenance-components',
  props: {
    updateKubernetesVersion: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Auto Update'
    },
    selectable: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      osUpdates: true
    }
  },
  computed: {
    updateVersion: {
      get () {
        return this.updateKubernetesVersion
      },
      set (value) {
        this.$emit('updateKubernetesVersion', value)
      }
    }
  }
}
</script>
