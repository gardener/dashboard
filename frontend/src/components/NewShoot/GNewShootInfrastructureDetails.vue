<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="px-0 mx-0">
    <v-row >
      <v-col v-show="cloudProfiles.length > 1" cols="3">
        <g-cloud-profile
          ref="cloudProfile"
          v-model="cloudProfileName"
          create-mode
          :cloud-profiles="cloudProfiles"
          @valid="onCloudProfileNameValid"
          @update:modelValue="onUpdateCloudProfileName"
          color="primary">
        </g-cloud-profile>
      </v-col>
      <v-col cols="3">
        <g-select-secret
         :cloudProfileName="cloudProfileName"
         v-model="secret"
         @update:modelValue="onUpdateSecret"
         v-model:valid="secretValid"
         @update:valid="onSecretValid"></g-select-secret>
      </v-col>
      <v-col cols="3">
        <v-select
          color="primary"
          item-color="primary"
          label="Region"
          :items="regionItems"
          :hint="regionHint"
          persistent-hint
          v-model="region"
          :error-messages="getErrorMessages('region')"
          @update:modelValue="onInputRegion"
          @blur="v$.region.$touch()"
          variant="underlined"
          >
          <template #item="{ item, props }">
            <!-- Divider / header in items not implemented yet in Vuetify 3: https://github.com/vuetifyjs/vuetify/issues/15721 -->
            <span class="text-subtitle-1 text-disabled pa-3" v-if="!!item.raw.header">{{item.raw.header}}</span>
            <v-list-item v-else v-bind="props" />
          </template>
        </v-select>
      </v-col>
      <v-col cols="3">
        <v-select
          color="primary"
          item-color="primary"
          label="Networking Type"
          :items="networkingTypes"
          persistent-hint
          v-model="networkingType"
          :error-messages="getErrorMessages('networkingType')"
          @update:modelValue="v$.networkingType.$touch()"
          @blur="v$.networkingType.$touch()"
          variant="underlined"
          ></v-select>
      </v-col>
      <template v-if="infrastructureKind === 'openstack'">
        <v-col cols="3">
          <g-wildcard-select
            v-model="floatingPoolName"
            :wildcard-select-items="allFloatingPoolNames"
            wildcard-select-label="Floating Pool"
            @valid="onFloatingPoolWildcardValid"
            ></g-wildcard-select>
        </v-col>
        <v-col cols="3">
          <v-select
          color="primary"
          item-color="primary"
          label="Load Balancer Provider"
          :items="allLoadBalancerProviderNames"
          v-model="loadBalancerProviderName"
          :error-messages="getErrorMessages('loadBalancerProviderName')"
          @update:modelValue="onInputLoadBalancerProviderName"
          @blur="v$.loadBalancerProviderName.$touch()"
          persistent-hint
          variant="underlined"
          ></v-select>
        </v-col>
      </template>
      <template v-else-if="infrastructureKind === 'metal'">
        <v-col cols="3">
          <v-text-field
            color="primary"
            item-color="primary"
            label="Project ID"
            v-model="projectID"
            :error-messages="getErrorMessages('projectID')"
            @update:modelValue="onInputProjectID"
            @blur="v$.projectID.$touch()"
            hint="Clusters with same Project ID share IP ranges to allow load balancing accross multiple partitions"
            persistent-hint
            variant="underlined"
            ></v-text-field>
        </v-col>
        <v-col cols="3">
          <v-select
            color="primary"
            item-color="primary"
            label="Partition ID"
            :items="partitionIDs"
            v-model="partitionID"
            :error-messages="getErrorMessages('partitionID')"
            @update:modelValue="onInputPartitionID"
            @blur="v$.partitionID.$touch()"
            hint="Partion ID equals zone on other infrastructures"
            persistent-hint
            variant="underlined"
          ></v-select>
        </v-col>
        <v-col cols="3">
          <v-select
            color="primary"
            item-color="primary"
            label="Firewall Image"
            :items="firewallImages"
            v-model="firewallImage"
            :error-messages="getErrorMessages('firewallImage')"
            @update:modelValue="onInputFirewallImage"
            @blur="v$.firewallImage.$touch()"
            variant="underlined"
          ></v-select>
        </v-col>
        <v-col cols="3">
          <v-select
            color="primary"
            item-color="primary"
            label="Firewall Size"
            :items="firewallSizes"
            v-model="firewallSize"
            :error-messages="getErrorMessages('firewallSize')"
            @update:modelValue="onInputFirewallSize"
            @blur="v$.firewallImage.$touch()"
            variant="underlined"
          ></v-select>
        </v-col>
        <v-col cols="3">
          <v-select
            color="primary"
            item-color="primary"
            label="Firewall Networks"
            :items="allFirewallNetworks"
            v-model="firewallNetworks"
            :error-messages="getErrorMessages('firewallNetworks')"
            @update:modelValue="onInputFirewallNetworks"
            @blur="v$.firewallNetworks.$touch()"
            chips
            small-chips
            deletable-chips
            multiple
            variant="underlined"
          ></v-select>
        </v-col>
      </template>
      <template v-else-if="infrastructureKind === 'vsphere'">
        <v-col cols="3">
          <v-select
            color="primary"
            item-color="primary"
            label="Load Balancer Classes"
            :items="allLoadBalancerClasses"
            v-model="loadBalancerClassNames"
            :error-messages="getErrorMessages('loadBalancerClassNames')"
            @update:modelValue="onInputLoadBalancerClassNames"
            @blur="v$.loadBalancerClassNames.$touch()"
            attach
            chips
            small-chips
            deletable-chips
            multiple
            variant="underlined"
          >
            <template #item="{ item }">
              <v-list-item-action >
                <v-icon :color="item.disabled ? 'grey' : ''">{{ isLoadBalancerClassSelected(item) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline'}}</v-icon>
              </v-list-item-action>
              <v-list-item-title :class="{ 'grey--text': item.disabled }">{{ item.text }}</v-list-item-title>
            </template>
          </v-select>
        </v-col>
      </template>
    </v-row>
  </v-container>
</template>

<script>
import { defineComponent } from 'vue'
import GCloudProfile from '@/components/GCloudProfile'
import GWildcardSelect from '@/components/GWildcardSelect'
import GSelectSecret from '@/components/Secrets/GSelectSecret'
import { required, requiredIf } from '@vuelidate/validators'
import { getValidationErrors } from '@/utils'
import { includesIfAvailable } from '@/utils/validators'
import sortBy from 'lodash/sortBy'
import head from 'lodash/head'
import get from 'lodash/get'
import map from 'lodash/map'
import isEmpty from 'lodash/isEmpty'
import includes from 'lodash/includes'
import forEach from 'lodash/forEach'
import intersection from 'lodash/intersection'
import find from 'lodash/find'
import { mapState, mapActions } from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import {
  useCloudProfileStore,
  useConfigStore,
  useGardenerExtensionStore,
  useSecretStore,
  useShootStagingStore,
} from '@/store'

export default defineComponent({
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  components: {
    GCloudProfile,
    GWildcardSelect,
    GSelectSecret,
  },
  props: {
    userInterActionBus: {
      type: Object,
      required: true,
    },
  },
  emits: [
    'valid',
  ],
  data () {
    return {
      infrastructureKind: undefined,
      cloudProfileName: undefined,
      secret: undefined,
      region: undefined,
      networkingType: undefined,
      floatingPoolName: undefined,
      // default validation status of subcomponents is true, as they are not shown in all cases
      floatingPoolValid: true,
      cloudProfileValid: true,
      secretValid: true,
      fpname: undefined,
      loadBalancerProviderName: undefined,
      loadBalancerClassNames: [],
      partitionID: undefined,
      firewallImage: undefined,
      firewallSize: undefined,
      firewallNetworks: undefined,
      projectID: undefined,
      valid: false,
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    ...mapState(useConfigStore, ['seedCandidateDeterminationStrategy']),
    ...mapState(useGardenerExtensionStore, ['networkingTypes']),
    validators () {
      return {
        region: {
          required,
        },
        networkingType: {
          required,
        },
        loadBalancerProviderName: {
          required: requiredIf(function () {
            return this.infrastructureKind === 'openstack'
          }),
        },
        loadBalancerClassNames: {
          required: requiredIf(function () {
            return this.infrastructureKind === 'vsphere'
          }),
          includesKey: includesIfAvailable('default', 'allLoadBalancerClassNames'),
        },
        partitionID: {
          required: requiredIf(function () {
            return this.infrastructureKind === 'metal'
          }),
        },
        firewallImage: {
          required: requiredIf(function () {
            return this.infrastructureKind === 'metal'
          }),
        },
        firewallSize: {
          required: requiredIf(function () {
            return this.infrastructureKind === 'metal'
          }),
        },
        firewallNetworks: {
          required: requiredIf(function () {
            return this.infrastructureKind === 'metal'
          }),
        },
        projectID: {
          required: requiredIf(function () {
            return this.infrastructureKind === 'metal'
          }),
        },
      }
    },
    validationErrors () {
      const validationErrors = {
        region: {
          required: 'Region is required',
        },
        networkingType: {
          required: 'Networking Type is required',
        },
        loadBalancerProviderName: {
          required: 'Load Balancer Providers required',
        },
        loadBalancerClassNames: {
          required: 'Load Balancer Classes required',
          includesKey: ({ key }) => `Load Balancer Class "${key}" must be selected`,
        },
        partitionID: {
          required: 'Partition ID is required',
        },
        projectID: {
          required: 'Project ID is required',
        },
        firewallImage: {
          required: 'Firewall Image is required',
        },
        firewallSize: {
          required: 'Firewall Size is required',
        },
        firewallNetworks: {
          required: 'Firewall Networks required',
        },
      }
      return validationErrors
    },
    cloudProfiles () {
      return sortBy(this.cloudProfilesByCloudProviderKind(this.infrastructureKind), [(item) => item.metadata.name])
    },
    infrastructureSecretsByProfileName () {
      return this.infrastructureSecretsByCloudProfileName(this.cloudProfileName)
    },
    regionsWithSeed () {
      return this.regionsWithSeedByCloudProfileName(this.cloudProfileName)
    },
    regionsWithoutSeed () {
      return this.regionsWithoutSeedByCloudProfileName(this.cloudProfileName)
    },
    showAllRegions () {
      return this.seedCandidateDeterminationStrategy !== 'SameRegion'
    },
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
    allLoadBalancerProviderNames () {
      return this.loadBalancerProviderNamesByCloudProfileNameAndRegion({ cloudProfileName: this.cloudProfileName, region: this.region })
    },
    allLoadBalancerClassNames () {
      return this.loadBalancerClassNamesByCloudProfileName(this.cloudProfileName)
    },
    partitionIDs () {
      return this.partitionIDsByCloudProfileNameAndRegion({ cloudProfileName: this.cloudProfileName, region: this.region })
    },
    firewallImages () {
      return this.firewallImagesByCloudProfileName(this.cloudProfileName)
    },
    firewallSizes () {
      const cloudProfileName = this.cloudProfileName
      const region = this.region
      const firewallSizes = this.firewallSizesByCloudProfileNameAndRegion({ cloudProfileName, region })
      return map(firewallSizes, 'name')
    },
    allFirewallNetworks () {
      return this.firewallNetworksByCloudProfileNameAndPartitionId({ cloudProfileName: this.cloudProfileName, partitionID: this.partitionID })
    },
    allLoadBalancerClasses () {
      const loadBalancerClasses = map(this.loadBalancerClassesByCloudProfileName(this.cloudProfileName), ({ name, ipPoolName }) => {
        return {
          text: name,
          value: name,
          disabled: name === 'default',
        }
      })
      return loadBalancerClasses
    },
    allFloatingPoolNames () {
      const cloudProfileName = this.cloudProfileName
      const region = this.region
      const secretDomain = get(this.secret, 'data.domainName')
      return this.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain })
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'cloudProfilesByCloudProviderKind',
      'regionsWithSeedByCloudProfileName',
      'regionsWithoutSeedByCloudProfileName',
      'loadBalancerProviderNamesByCloudProfileNameAndRegion',
      'loadBalancerClassesByCloudProfileName',
      'loadBalancerClassNamesByCloudProfileName',
      'floatingPoolNamesByCloudProfileNameAndRegionAndDomain',
      'partitionIDsByCloudProfileNameAndRegion',
      'firewallImagesByCloudProfileName',
      'firewallNetworksByCloudProfileNameAndPartitionId',
      'firewallSizesByCloudProfileNameAndRegion',
    ]),
    ...mapActions(useSecretStore, [
      'infrastructureSecretsByCloudProfileName',
    ]),
    ...mapActions(useShootStagingStore, [
      'setCloudProfileName',
    ]),
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    setDefaultsDependingOnCloudProfile () {
      // Reset subcomponent valid states
      // default validation status of subcomponents is true, as they are not shown in all cases
      this.floatingPoolValid = true
      this.cloudProfileValid = true

      this.onUpdateSecret(head(this.infrastructureSecretsByProfileName))
      this.region = head(this.regionsWithSeed)
      if (!this.region && this.showAllRegions) {
        this.region = head(this.regionsWithoutSeed)
      }
      this.onInputRegion()
      this.loadBalancerProviderName = head(this.allLoadBalancerProviderNames)
      this.onInputLoadBalancerProviderName()
      this.floatingPoolName = head(this.allFloatingPoolNames)
      if (!isEmpty(this.allLoadBalancerClassNames)) {
        this.loadBalancerClassNames = [
          includes(this.allLoadBalancerClassNames, 'default')
            ? 'default'
            : head(this.allLoadBalancerClassNames),
        ]
      } else {
        this.loadBalancerClassNames = []
      }
      this.onInputLoadBalancerClassNames()
      this.firewallImage = head(this.firewallImages)
      this.onInputFirewallImage()
      this.projectID = undefined
    },
    setDefaultCloudProfile () {
      this.cloudProfileName = get(head(this.cloudProfiles), 'metadata.name')
      this.onUpdateCloudProfileName()
    },
    isLoadBalancerClassSelected ({ value }) {
      return includes(this.loadBalancerClassNames, value)
    },
    onUpdateSecret (secret) {
      this.secret = secret
      this.userInterActionBus.emit('updateSecret', this.secret)
      this.validateInput()
    },
    onSecretValid (valid) {
      if (this.secretValid !== valid) {
        this.secretValid = valid
        this.validateInput()
      }
    },
    onInputRegion () {
      this.partitionID = head(this.partitionIDs)
      this.onInputPartitionID()
      this.floatingPoolName = head(this.allFloatingPoolNames)
      this.loadBalancerProviderName = head(this.allLoadBalancerProviderNames)
      this.onInputLoadBalancerProviderName()
      this.v$.region.$touch()
      this.userInterActionBus.emit('updateRegion', this.region)
      this.validateInput()
    },
    onFloatingPoolWildcardValid (valid) {
      this.floatingPoolValid = valid
      this.validateInput()
    },
    onInputLoadBalancerProviderName () {
      this.v$.loadBalancerProviderName.$touch()
      this.validateInput()
    },
    onInputLoadBalancerClassNames () {
      // sort loadBalancerClassNames in the same order as they are listed in the cloudProfile
      this.loadBalancerClassNames = intersection(this.allLoadBalancerClassNames, this.loadBalancerClassNames)
      this.v$.loadBalancerClassNames.$touch()
      this.validateInput()
    },
    onInputPartitionID () {
      this.v$.partitionID.$touch()
      this.firewallSize = head(this.firewallSizes)
      const firewallNetwork = find(this.allFirewallNetworks, { key: 'internet' })
      if (firewallNetwork) {
        this.firewallNetworks = [firewallNetwork.value]
      } else {
        this.firewallNetworks = undefined
      }
      this.validateInput()
    },
    onInputProjectID () {
      this.v$.projectID.$touch()
      this.validateInput()
    },
    onInputFirewallImage () {
      this.v$.firewallImage.$touch()
      this.validateInput()
    },
    onInputFirewallSize () {
      this.v$.firewallSize.$touch()
      this.validateInput()
    },
    onInputFirewallNetworks () {
      this.v$.firewallNetworks.$touch()
      this.validateInput()
    },
    onUpdateCloudProfileName () {
      this.setCloudProfileName(this.cloudProfileName)
      this.userInterActionBus.emit('updateCloudProfileName', this.cloudProfileName)
      this.setDefaultsDependingOnCloudProfile()
      this.validateInput()
    },
    onCloudProfileNameValid (valid) {
      if (this.cloudProfileValid !== valid) {
        this.cloudProfileValid = valid
        this.validateInput()
      }
    },
    validateInput () {
      const valid = !this.v$.$invalid && this.cloudProfileValid && this.floatingPoolValid && this.secretValid
      if (this.valid !== valid) {
        this.valid = valid
        this.$emit('valid', valid)
      }
    },
    getInfrastructureData () {
      return {
        infrastructureKind: this.infrastructureKind,
        cloudProfileName: this.cloudProfileName,
        secret: this.secret,
        region: this.region,
        networkingType: this.networkingType,
        floatingPoolName: this.floatingPoolName,
        loadBalancerProviderName: this.loadBalancerProviderName,
        loadBalancerClasses: map(this.loadBalancerClassNames, name => ({ name })),
        partitionID: this.partitionID,
        projectID: this.projectID,
        firewallImage: this.firewallImage,
        firewallSize: this.firewallSize,
        firewallNetworks: this.firewallNetworks,
      }
    },
    setInfrastructureData ({
      infrastructureKind,
      cloudProfileName,
      secret,
      region,
      networkingType,
      floatingPoolName,
      loadBalancerProviderName,
      loadBalancerClasses,
      partitionID,
      projectID,
      firewallImage,
      firewallSize,
      firewallNetworks,
    }) {
      this.infrastructureKind = infrastructureKind
      this.cloudProfileName = cloudProfileName
      this.secret = secret
      this.region = region
      this.networkingType = networkingType
      this.floatingPoolName = floatingPoolName
      this.loadBalancerProviderName = loadBalancerProviderName
      this.loadBalancerClassNames = map(loadBalancerClasses, 'name')
      this.partitionID = partitionID
      this.projectID = projectID
      this.firewallImage = firewallImage
      this.firewallSize = firewallSize
      this.firewallNetworks = firewallNetworks
      this.v$.projectID.$touch() // project id is a required field (for metal). We want to show the error immediatley
      this.validateInput()
    },
  },
  mounted () {
    this.userInterActionBus.on('updateInfrastructure', infrastructureKind => {
      this.infrastructureKind = infrastructureKind
      this.setDefaultCloudProfile()
    })
  },
})
</script>