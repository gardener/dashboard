<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <template v-if="!!shootLoadbalancerClasses">
    <v-divider inset />
    <g-list-item>
      <template #prepend>
        <v-icon color="primary">
          mdi-ip-network-outline
        </v-icon>
      </template>
      <g-list-item-content label="Available Load Balancer Classes">
        <div class="d-flex align-center pt-1">
          <v-chip
            v-for="{ name } in shootLoadbalancerClasses"
            :key="name"
            size="small"
            class="mr-2"
            variant="tonal"
            color="tonal-primary"
          >
            {{ name }}
            <v-icon
              v-if="name === defaultLoadbalancerClass"
              size="small"
            >
              mdi-star
            </v-icon>
            <span
              v-tooltip:top="{
                text: 'Default Load Balancer Class',
                disabled: name !== defaultLoadbalancerClass
              }"
            />
          </v-chip>
        </div>
      </g-list-item-content>
    </g-list-item>
  </template>
</template>

<script>
import { computed } from 'vue'

import { useCloudProfileStore } from '@/store/cloudProfile'

import { useShootItem } from '@/composables/useShootItem'
import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

import { useOpenStackConstraints } from '@/providers/infra/openstack/cloudProfile'
import { useOpenStackCredentialDomainName } from '@/providers/infra/openstack/credentials'
import {
  wildcardObjectsFromStrings,
  bestMatchForString,
} from '@/utils/wildcard'

import find from 'lodash/find'
import get from 'lodash/get'
import head from 'lodash/head'
import map from 'lodash/map'

export default {
  setup () {
    const cloudProfileStore = useCloudProfileStore()
    const {
      shootItem,
      shootCloudProfileRef,
      shootRegion,
      shootCloudProviderBinding,
    } = useShootItem()

    const cloudProviderBindingContext = useCloudProviderBinding(shootCloudProviderBinding)
    const openStackDomainName = useOpenStackCredentialDomainName(cloudProviderBindingContext)
    const cloudProfile = computed(() => cloudProfileStore.cloudProfileByRef(shootCloudProfileRef.value))
    const { useFloatingPools } = useOpenStackConstraints(cloudProfile)
    const availableFloatingPools = useFloatingPools(shootRegion, openStackDomainName)

    return {
      shootItem,
      availableFloatingPools,
    }
  },
  computed: {
    shootLoadbalancerClasses () {
      const shootLBClasses = get(this.shootItem, ['spec', 'provider', 'controlPlaneConfig', 'loadBalancerClasses'])
      if (shootLBClasses) {
        return shootLBClasses
      }

      const floatingPoolWildCardObjects = wildcardObjectsFromStrings(map(this.availableFloatingPools, 'name'))
      const shootFloatingPoolName = get(this.shootItem, ['spec', 'provider', 'infrastructureConfig', 'floatingPoolName'])
      const floatingPoolWildcardName = bestMatchForString(floatingPoolWildCardObjects, shootFloatingPoolName)

      if (!floatingPoolWildcardName) {
        return
      }

      const shootFloatingPool = find(this.availableFloatingPools, ['name', floatingPoolWildcardName.originalValue])
      return get(shootFloatingPool, ['loadBalancerClasses'])
    },
    defaultLoadbalancerClass () {
      const shootLBClasses = this.shootLoadbalancerClasses

      let defaultLoadbalancerClass = find(shootLBClasses, ['purpose', 'default'])
      if (defaultLoadbalancerClass) {
        return defaultLoadbalancerClass.name
      }

      defaultLoadbalancerClass = find(shootLBClasses, ['name', 'default'])
      if (defaultLoadbalancerClass) {
        return defaultLoadbalancerClass.name
      }

      return get(head(shootLBClasses), ['name'])
    },
  },
}
</script>
