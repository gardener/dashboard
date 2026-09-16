<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <template v-if="hasValidCommandParameters">
    <g-gardenctl-command
      v-for="({ title, subtitle, value }, index) in commands"
      :key="title"
      :title="title"
      :subtitle="subtitle"
      :command="value"
      :show-icon="index === 0"
    />
  </template>
</template>

<script>
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'

import GGardenctlCommand from '@/components/GGardenctlCommand.vue'

import { useShootItem } from '@/composables/useShootItem'

import {
  isRfc1123LabelName,
  isDnsSubdomainName,
  isGardenName,
} from '@/utils/validators'

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
      return `gardenctl target --garden ${this.clusterIdentity} --project ${this.shootProjectName} --shoot ${this.shootName} --control-plane`  
    },
    targetShootCommand () {
      return `gardenctl target --garden ${this.clusterIdentity} --project ${this.shootProjectName} --shoot ${this.shootName}`  
    },
    hasValidCommandParameters () {
      return this.clusterIdentity && isGardenName(this.clusterIdentity) 
        && this.shootProjectName && isDnsSubdomainName(this.shootProjectName)
        && this.shootName && isRfc1123LabelName(this.shootName)
    },
  },
}
</script>
