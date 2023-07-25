<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="px-0 mx-0">
    <v-row>
      <v-col
        v-if="cloudProfiles.length > 1"
        cols="3"
      >
        <g-cloud-profile
          ref="cloudProfile"
          v-model="cloudProfileName"
          create-mode
          :cloud-profiles="cloudProfiles"
          color="primary"
          @valid="onCloudProfileNameValid"
          @update:model-value="onUpdateCloudProfileName"
        />
      </v-col>
      <v-col cols="3">
        <g-select-secret
          v-model="secret"
          v-model:valid="secretValid"
          :cloud-profile-name="cloudProfileName"
          @update:model-value="onUpdateSecret"
          @update:valid="onSecretValid"
        />
      </v-col>
      <v-col cols="3">
        <v-select
          v-model="region"
          color="primary"
          item-color="primary"
          label="Region"
          :items="regionItems"
          :hint="regionHint"
          persistent-hint
          :error-messages="getErrorMessages('region')"
          variant="underlined"
          @update:model-value="onInputRegion"
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
      <v-col cols="3">
        <v-select
          v-model="networkingType"
          color="primary"
          item-color="primary"
          label="Networking Type"
          :items="networkingTypes"
          persistent-hint
          :error-messages="getErrorMessages('networkingType')"
          variant="underlined"
          @update:model-value="v$.networkingType.$touch()"
          @blur="v$.networkingType.$touch()"
        />
      </v-col>
      <template v-if="infrastructureKind === 'openstack'">
        <v-col cols="3">
          <g-wildcard-select
            v-model="floatingPoolName"
            :wildcard-select-items="allFloatingPoolNames"
            wildcard-select-label="Floating Pool"
            @valid="onFloatingPoolWildcardValid"
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="loadBalancerProviderName"
            color="primary"
            item-color="primary"
            label="Load Balancer Provider"
            :items="allLoadBalancerProviderNames"
            :error-messages="getErrorMessages('loadBalancerProviderName')"
            persistent-hint
            variant="underlined"
            @update:model-value="onInputLoadBalancerProviderName"
            @blur="v$.loadBalancerProviderName.$touch()"
          />
        </v-col>
      </template>
      <template v-else-if="infrastructureKind === 'metal'">
        <v-col cols="3">
          <v-text-field
            v-model="projectID"
            color="primary"
            item-color="primary"
            label="Project ID"
            :error-messages="getErrorMessages('projectID')"
            hint="Clusters with same Project ID share IP ranges to allow load balancing accross multiple partitions"
            persistent-hint
            variant="underlined"
            @update:model-value="onInputProjectID"
            @blur="v$.projectID.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="partitionID"
            color="primary"
            item-color="primary"
            label="Partition ID"
            :items="partitionIDs"
            :error-messages="getErrorMessages('partitionID')"
            hint="Partion ID equals zone on other infrastructures"
            persistent-hint
            variant="underlined"
            @update:model-value="onInputPartitionID"
            @blur="v$.partitionID.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="firewallImage"
            color="primary"
            item-color="primary"
            label="Firewall Image"
            :items="firewallImages"
            :error-messages="getErrorMessages('firewallImage')"
            variant="underlined"
            @update:model-value="onInputFirewallImage"
            @blur="v$.firewallImage.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="firewallSize"
            color="primary"
            item-color="primary"
            label="Firewall Size"
            :items="firewallSizes"
            :error-messages="getErrorMessages('firewallSize')"
            variant="underlined"
            @update:model-value="onInputFirewallSize"
            @blur="v$.firewallImage.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="firewallNetworks"
            color="primary"
            item-color="primary"
            label="Firewall Networks"
            :items="allFirewallNetworks"
            :error-messages="getErrorMessages('firewallNetworks')"
            chips
            closable-chips
            multiple
            variant="underlined"
            @update:model-value="onInputFirewallNetworks"
            @blur="v$.firewallNetworks.$touch()"
          />
        </v-col>
      </template>
      <template v-else-if="infrastructureKind === 'vsphere'">
        <v-col cols="3">
          <v-select
            v-model="loadBalancerClassNames"
            color="primary"
            item-color="primary"
            label="Load Balancer Classes"
            :items="allLoadBalancerClasses"
            :error-messages="getErrorMessages('loadBalancerClassNames')"
            attach
            chips
            closable-chips
            multiple
            variant="underlined"
            @update:model-value="onInputLoadBalancerClassNames"
            @blur="v$.loadBalancerClassNames.$touch()"
          >
            <template #item="{ item }">
              <v-list-item-action>
                <v-icon :color="item.disabled ? 'grey' : ''">
                  {{ isLoadBalancerClassSelected(item) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
                </v-icon>
              </v-list-item-action>
              <v-list-item-title :class="{ 'text-grey': item.disabled }">
                {{ item.text }}
              </v-list-item-title>
            </template>
          </v-select>
        </v-col>
      </template>
    </v-row>
  </v-container>
</template>

<script>
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

export default {
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
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
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
  mounted () {
    this.userInterActionBus.on('updateInfrastructure', infrastructureKind => {
      this.infrastructureKind = infrastructureKind
      this.setDefaultCloudProfile()
    })
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
      this.secretValid = valid
      this.validateInput()
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
      this.cloudProfileValid = valid
      this.validateInput()
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
}
</script>
