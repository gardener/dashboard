<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="pa-0 ma-0">
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
          vendor-type="infra"
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
            <v-list-subheader v-if="!!item.header">
              {{ item.header }}
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
      <template v-if="!workerless && providerType === 'openstack'">
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
      <template v-else-if="!workerless && providerType === 'metal'">
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
            @blur="v$.firewallSize.$touch()"
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
      <template v-else-if="!workerless && providerType === 'vsphere'">
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
      <template v-else-if="!workerless && providerType === 'gdch'">
        <v-col cols="3">
          <v-select
            v-model="v$.parentReferenceType.$model"
            color="primary"
            item-color="primary"
            label="Parent Reference Type"
            :items="parentReferenceTypes"
            :error-messages="getErrorMessages(v$.parentReferenceType)"
            hint="Reference type for the parent resource: SingleSubnet or SubnetGroup"
            persistent-hint
            variant="underlined"
            @blur="v$.parentReferenceType.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-text-field
            v-model="v$.parentReferenceName.$model"
            color="primary"
            label="Parent Reference Name"
            :error-messages="getErrorMessages(v$.parentReferenceName)"
            hint="Name of the parent GDC Subnet or SubnetGroup"
            persistent-hint
            variant="underlined"
            @blur="v$.parentReferenceName.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-text-field
            v-model="parentReferenceNamespace"
            color="primary"
            label="Parent Reference Namespace (optional)"
            hint="Namespace of the parent reference, if it is in another GDC project"
            persistent-hint
            variant="underlined"
          />
        </v-col>
        <v-col cols="3">
          <v-text-field
            v-model="v$.nodeCIDR.$model"
            color="primary"
            label="Node CIDR"
            :error-messages="getErrorMessages(v$.nodeCIDR)"
            hint="CIDR range used for worker nodes. The GDC provider extension creates a subnet for this range from the parent reference (e.g. 10.0.0.0/18)"
            persistent-hint
            variant="underlined"
            @blur="v$.nodeCIDR.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-switch
            v-model="enableEgress"
            color="primary"
            label="Enable Cloud NAT egress"
            hint="Recommended. Disable only if your project does not use Cloud NAT egress."
            persistent-hint
            inset
          />
        </v-col>
      </template>
    </v-row>
  </v-container>
</template>

<script>
import {
  or,
  required,
  requiredIf,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import { Netmask } from 'netmask'

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
      providerInfrastructureConfigParentReferenceName,
      providerInfrastructureConfigParentReferenceNamespace,
      providerInfrastructureConfigParentReferenceType,
      providerInfrastructureConfigEnableEgress,
      providerInfrastructureConfigNodeCIDR,
      networkingNodes,
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
      parentReferenceName: providerInfrastructureConfigParentReferenceName,
      parentReferenceNamespace: providerInfrastructureConfigParentReferenceNamespace,
      parentReferenceType: providerInfrastructureConfigParentReferenceType,
      enableEgress: providerInfrastructureConfigEnableEgress,
      nodeCIDR: providerInfrastructureConfigNodeCIDR,
      networkingNodes,
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
    const infrastructureRequired = providerType => !this.workerless && this.providerType === providerType
    const requiresInfrastructure = providerType => {
      return requiredIf(() => infrastructureRequired(providerType))
    }
    return {
      region: withFieldName('Region', {
        required,
      }),
      networkingType: withFieldName('Networking Type', {
        required: requiredIf(() => !this.workerless),
      }),
      loadBalancerProviderName: withFieldName('Load Balancer Provider', {
        required: requiresInfrastructure('openstack'),
      }),
      loadBalancerClassNames: withFieldName('Load Balancer Class Names', {
        required: requiresInfrastructure('vsphere'),
        includesKey: withMessage('Load Balancer Class \'default\' must be selected', or(
          () => !infrastructureRequired('vsphere'),
          includesIfAvailable('default', 'allLoadBalancerClassNames'),
        )),
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
      parentReferenceName: withFieldName('Parent Reference Name', {
        required: requiresInfrastructure('gdch'),
      }),
      parentReferenceType: withFieldName('Parent Reference Type', {
        required: requiresInfrastructure('gdch'),
      }),
      nodeCIDR: withFieldName('Node CIDR', {
        required: requiresInfrastructure('gdch'),
        cidr: withMessage('Must be a valid IPv4 CIDR range', value => {
          if (!infrastructureRequired('gdch') || !value) {
            return true
          }
          const [address, prefix, ...remainder] = value.split('/')
          const octets = address?.split('.') ?? []
          if (remainder.length || !prefix || octets.length !== 4 || octets.some(octet => !/^\d{1,3}$/.test(octet))) {
            return false
          }
          try {
            return new Netmask(value).toString() === value
          } catch {
            return false
          }
        }),
        matchesNetworkingNodes: withMessage('Must match the shoot networking node CIDR', value => {
          return !infrastructureRequired('gdch') || value === this.networkingNodes
        }),
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
    parentReferenceTypes () {
      return ['SingleSubnet', 'SubnetGroup']
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
