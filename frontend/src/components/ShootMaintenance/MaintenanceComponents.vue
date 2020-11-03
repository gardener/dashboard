<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div class="subtitle-1 pt-4 ml-3">{{title}}</div>
    <v-list class="pt-0" two-line>
      <v-list-item v-if="selectable || osUpdates">
        <v-list-item-action>
          <v-checkbox v-if="selectable" color="cyan darken-2" v-model="osUpdates"></v-checkbox>
          <v-icon v-else>mdi-arrow-up-bold-circle-outline</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>Operating System</v-list-item-title>
          <v-list-item-subtitle>
            Update the operating system of the workers<br />
            (requires rolling update of all workers, ensure proper pod disruption budgets to ensure availability of your workload)
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="selectable || k8sUpdates">
        <v-list-item-action>
          <v-checkbox v-if="selectable" color="cyan darken-2" v-model="k8sUpdates"></v-checkbox>
          <v-icon v-else>mdi-arrow-up-bold-circle-outline</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title >Kubernetes Patch Version</v-list-item-title>
          <v-list-item-subtitle>
            Update the control plane of the cluster and the worker components<br />
            (control plane, most notably the API server, will be briefly unavailable during switch-over)
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="selectable">
        <v-list-item-action>
          <v-icon>mdi-information-outline</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title >Automatic updates will not update to preview versions</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="showNoUpdates">
        <v-list-item-action>
          <v-icon>mdi-close-circle-outline</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title >Updates disabled</v-list-item-title>
          <v-list-item-subtitle>
            All automatic updates have been disabled for this cluster
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </div>
</template>

<script>

export default {
  name: 'maintenance-components',
  props: {
    userInterActionBus: {
      type: Object
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
      k8sUpdatesInternal: false,
      osUpdatesInternal: false
    }
  },
  computed: {
    k8sUpdates: {
      get () {
        return this.k8sUpdatesInternal
      },
      set (value) {
        this.k8sUpdatesInternal = value
        if (this.userInterActionBus) {
          this.userInterActionBus.emit('updateK8sMaintenance', value)
        }
      }
    },
    osUpdates: {
      get () {
        return this.osUpdatesInternal
      },
      set (value) {
        this.osUpdatesInternal = value
        if (this.userInterActionBus) {
          this.userInterActionBus.emit('updateOSMaintenance', value)
        }
      }
    },
    showNoUpdates () {
      return !this.selectable && !this.osUpdates && !this.k8sUpdates
    }
  },
  methods: {
    getComponentUpdates () {
      return { k8sUpdates: this.k8sUpdates, osUpdates: this.osUpdates }
    },
    setComponentUpdates ({ k8sUpdates, osUpdates }) {
      this.k8sUpdates = k8sUpdates
      this.osUpdates = osUpdates
    }
  }
}
</script>
