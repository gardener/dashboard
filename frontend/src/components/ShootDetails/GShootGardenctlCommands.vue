<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-gardenctl-command
    v-for="({ title, subtitle, value }, index) in commands"
    :key="title"
    :title="title"
    :subtitle="subtitle"
    :command="value"
    :show-icon="index === 0"
  />
</template>

<script>
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'

import GGardenctlCommand from '@/components/GGardenctlCommand.vue'

import { useShootItem } from '@/composables/useShootItem'

export default {
  components: {
    GGardenctlCommand,
  },
  setup () {
    const {
      shootName,
      shootProjectName,
      seedIsManagedSeed,
    } = useShootItem()

    return {
      shootName,
      shootProjectName,
      seedIsManagedSeed,
    }
  },
  computed: {
    ...mapState(useConfigStore, [
      'clusterIdentity',
    ]),
    ...mapState(useAuthzStore, [
      'canCreateShootsViewerkubeconfigInGarden',
      'canGetConfigMapsInGarden',
    ]),
    showControlPlaneCommand () {
      return this.seedIsManagedSeed
        ? this.canCreateShootsViewerkubeconfigInGarden
        : this.canGetConfigMapsInGarden
    },
    commands () {
      const cmds = [
        {
          title: 'Target Cluster',
          subtitle: 'Gardenctl command to target the shoot cluster',
          value: this.targetShootCommand,
        },
      ]

      if (this.showControlPlaneCommand) {
        cmds.unshift({
          title: 'Target Control Plane',
          subtitle: 'Gardenctl command to target the control plane of the shoot cluster',
          value: this.targetControlPlaneCommand,
        })
      }
      return cmds
    },
    targetControlPlaneCommand () {
      const args = []
      if (this.clusterIdentity) {
        args.push(`--garden ${this.clusterIdentity}`)
      }
      if (this.shootProjectName) {
        args.push(`--project ${this.shootProjectName}`)
      }
      if (this.shootName) {
        args.push(`--shoot ${this.shootName}`)
      }

      args.push('--control-plane')

      return `gardenctl target ${args.join(' ')}`
    },
    targetShootCommand () {
      const args = []
      if (this.clusterIdentity) {
        args.push(`--garden ${this.clusterIdentity}`)
      }
      if (this.shootProjectName) {
        args.push(`--project ${this.shootProjectName}`)
      }
      if (this.shootName) {
        args.push(`--shoot ${this.shootName}`)
      }

      return `gardenctl target ${args.join(' ')}`
    },
  },
}
</script>
