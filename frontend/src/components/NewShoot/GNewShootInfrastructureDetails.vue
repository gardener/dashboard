<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="px-0 mx-0">
    <v-row>
      <v-col cols="3">
        <g-select-cloud-profile
          ref="cloudProfile"
          v-model="cloudProfileRef"
          :cloud-profiles="cloudProfiles"
          color="primary"
        />
      </v-col>
      <v-col
        v-if="!workerless"
        cols="3"
      >
        <g-select-credential
          v-model="infrastructureBinding"
          :provider-type="providerType"
        />
      </v-col>
      <v-col cols="3">
        <v-select
          v-model="v$.region.$model"
          color="primary"
          item-color="primary"
          label="Region"
          :items="regionItems"
          :hint="regionHint"
          persistent-hint
          :error-messages="getErrorMessages(v$.region)"
          variant="underlined"
          @blur="v$.region.$touch()"
        >
          <template #item="{ item, props }">
            <!-- Divider / header in items not implemented yet in Vuetify 3: https://github.com/vuetifyjs/vuetify/issues/15721 -->
            <v-list-subheader v-if="!!item.raw.header">
              {{ item.raw.header }}
            </v-list-subheader>
            <v-list-item
              v-else
              v-bind="props"
            />
          </template>
        </v-select>
      </v-col>
      <v-col
        v-if="!workerless"
        cols="3"
      >
        <v-select
          v-model="v$.networkingType.$model"
          color="primary"
          item-color="primary"
          label="Networking Type"
          :items="networkingTypes"
          persistent-hint
          :error-messages="getErrorMessages(v$.networkingType)"
          variant="underlined"
          @blur="v$.networkingType.$touch()"
        />
      </v-col>
      <template v-if="providerType === 'openstack'">
        <v-col cols="3">
          <g-wildcard-select
            v-model="floatingPoolName"
            :wildcard-select-items="allFloatingPoolNames"
            wildcard-select-label="Floating Pool"
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="v$.loadBalancerProviderName.$model"
            color="primary"
            item-color="primary"
            label="Load Balancer Provider"
            :items="allLoadBalancerProviderNames"
            :error-messages="getErrorMessages(v$.loadBalancerProviderName)"
            persistent-hint
            variant="underlined"
            @blur="v$.loadBalancerProviderName.$touch()"
          />
        </v-col>
      </template>
      <template v-else-if="providerType === 'metal'">
        <v-col cols="3">
          <v-text-field
            v-model="v$.projectID.$model"
            color="primary"
            item-color="primary"
            label="Project ID"
            :error-messages="getErrorMessages(v$.projectID)"
            hint="Clusters with same Project ID share IP ranges to allow load balancing accross multiple partitions"
            persistent-hint
            variant="underlined"
            @blur="v$.projectID.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="v$.partitionID.$model"
            color="primary"
            item-color="primary"
            label="Partition ID"
            :items="partitionIDs"
            :error-messages="getErrorMessages(v$.partitionID)"
            hint="Partion ID equals zone on other infrastructures"
            persistent-hint
            variant="underlined"
            @blur="v$.partitionID.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="v$.firewallImage.$model"
            color="primary"
            item-color="primary"
            label="Firewall Image"
            :items="firewallImages"
            :error-messages="getErrorMessages(v$.firewallImage)"
            variant="underlined"
            @blur="v$.firewallImage.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="v$.firewallSize.$model"
            color="primary"
            item-color="primary"
            label="Firewall Size"
            :items="firewallSizes"
            :error-messages="getErrorMessages(v$.firewallSize)"
            variant="underlined"
            @blur="v$.firewallImage.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="v$.firewallNetworks.$model"
            color="primary"
            item-color="primary"
            label="Firewall Networks"
            :items="allFirewallNetworks"
            :error-messages="getErrorMessages(v$.firewallNetworks)"
            chips
            closable-chips
            multiple
            variant="underlined"
            @blur="v$.firewallNetworks.$touch()"
          />
        </v-col>
      </template>
      <template v-else-if="providerType === 'vsphere'">
        <v-col cols="3">
          <v-select
            v-model="v$.loadBalancerClassNames.$model"
            color="primary"
            label="Load Balancer Classes"
            :items="allLoadBalancerClasses"
            :error-messages="getErrorMessages(v$.loadBalancerClassNames)"
            attach
            chips
            multiple
            variant="underlined"
            @blur="v$.loadBalancerClassNames.$touch()"
          />
        </v-col>
      </template>
    </v-row>
  </v-container>
</template>

<script>
import {
  required,
  requiredIf,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import GSelectCloudProfile from '@/components/GSelectCloudProfile'
import GWildcardSelect from '@/components/GWildcardSelect'
import GSelectCredential from '@/components/Credentials/GSelectCredential'

import { useShootContext } from '@/composables/useShootContext'

import { getErrorMessages } from '@/utils'
import {
  includesIfAvailable,
  withMessage,
  withFieldName,
} from '@/utils/validators'

import forEach from 'lodash/forEach'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'

export default {
  components: {
    GSelectCloudProfile,
    GWildcardSelect,
    GSelectCredential,
  },
  setup () {
    const {
      providerType,
      cloudProfileRef,
      infrastructureBinding,
      region,
      networkingType,
      providerControlPlaneConfigLoadBalancerProviderName,
      providerControlPlaneConfigLoadBalancerClassNames,
      providerInfrastructureConfigFloatingPoolName,
      providerInfrastructureConfigPartitionID,
      providerInfrastructureConfigProjectID,
      providerInfrastructureConfigFirewallImage,
      providerInfrastructureConfigFirewallSize,
      providerInfrastructureConfigFirewallNetworks,
      cloudProfiles,
      infrastructureBindings,
      regionsWithSeed,
      regionsWithoutSeed,
      showAllRegions,
      networkingTypes,
      allLoadBalancerProviderNames,
      allLoadBalancerClassNames,
      partitionIDs,
      firewallImages,
      firewallSizes,
      allFirewallNetworks,
      allFloatingPoolNames,
      workerless,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      providerType,
      infrastructureBinding,
      cloudProfileRef,
      region,
      networkingType,
      loadBalancerProviderName: providerControlPlaneConfigLoadBalancerProviderName,
      loadBalancerClassNames: providerControlPlaneConfigLoadBalancerClassNames,
      floatingPoolName: providerInfrastructureConfigFloatingPoolName,
      partitionID: providerInfrastructureConfigPartitionID,
      projectID: providerInfrastructureConfigProjectID,
      firewallImage: providerInfrastructureConfigFirewallImage,
      firewallSize: providerInfrastructureConfigFirewallSize,
      firewallNetworks: providerInfrastructureConfigFirewallNetworks,
      cloudProfiles,
      infrastructureBindings,
      regionsWithSeed,
      regionsWithoutSeed,
      showAllRegions,
      networkingTypes,
      allLoadBalancerProviderNames,
      allLoadBalancerClassNames,
      partitionIDs,
      firewallImages,
      firewallSizes,
      allFirewallNetworks,
      allFloatingPoolNames,
      workerless,
    }
  },
  validations () {
    const requiresInfrastructure = providerType => {
      return requiredIf(() => this.providerType === providerType)
    }
    return {
      region: withFieldName('Region', {
        required,
      }),
      networkingType: withFieldName('Networking Type', {
        required: requiredIf(!this.workerless),
      }),
      loadBalancerProviderName: withFieldName('Cluster Name', {
        required: requiresInfrastructure('openstack'),
      }),
      loadBalancerClassNames: withFieldName('Load Balancer Class Names', {
        required: requiresInfrastructure('vsphere'),
        includesKey: withMessage('Load Balancer Class \'default\' must be selected', includesIfAvailable('default', 'allLoadBalancerClassNames')),
      }),
      partitionID: withFieldName('Partition ID', {
        required: requiresInfrastructure('metal'),
      }),
      firewallImage: withFieldName('Firewall Image', {
        required: requiresInfrastructure('metal'),
      }),
      firewallSize: withFieldName('Firewall Size', {
        required: requiresInfrastructure('metal'),
      }),
      firewallNetworks: withFieldName('Firewall Networks', {
        required: requiresInfrastructure('metal'),
      }),
      projectID: withFieldName('Project ID', {
        required: requiresInfrastructure('metal'),
      }),
    }
  },
  computed: {
    regionItems () {
      const regionItems = []
      if (!isEmpty(this.regionsWithSeed)) {
        regionItems.push({ header: 'Recommended Regions (API servers in same region)' })
      }
      forEach(this.regionsWithSeed, region => {
        regionItems.push(region)
      })
      if (this.showAllRegions && !isEmpty(this.regionsWithoutSeed)) {
        regionItems.push({ header: 'Supported Regions (API servers in another region)' })
        forEach(this.regionsWithoutSeed, region => {
          regionItems.push(region)
        })
      }
      return regionItems
    },
    regionHint () {
      if (includes(this.regionsWithSeed, this.region)) {
        return 'API servers in same region as your workers (optimal if you require a low latency)'
      }
      return 'API servers in another region than your workers (expect a somewhat higher latency; picked by Gardener based on internal considerations such as geographic proximity)'
    },
    allLoadBalancerClasses () {
      return map(this.allLoadBalancerClassNames, name => {
        return {
          title: name,
          value: name,
          props: {
            disabled: name === 'default',
          },
        }
      })
    },
  },
  mounted () {
    this.v$.projectID.$touch() // project id is a required field (for metal). We want to show the error immediatley
  },
  methods: {
    getErrorMessages,
  },
}
</script>
