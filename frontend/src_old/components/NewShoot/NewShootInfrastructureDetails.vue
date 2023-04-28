<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container  class="px-0 mx-0">
    <v-row >
      <v-col v-show="cloudProfiles.length > 1" cols="3">
        <cloud-profile
          ref="cloudProfile"
          v-model="cloudProfileName"
          create-mode
          :cloud-profiles="cloudProfiles"
          @valid="onCloudProfileNameValid"
          @input="onUpdateCloudProfileName"
          color="primary">
        </cloud-profile>
      </v-col>
      <v-col cols="3">
        <select-secret
         :cloudProfileName="cloudProfileName"
         :value="secret"
         @input="onUpdateSecret"
         :valid="secretValid"
         @update:valid="onSecretValid"></select-secret>
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
          @update:model-value="onInputRegion"
          @blur="$v.region.$touch()"
          ></v-select>
      </v-col>
      <v-col cols="3">
        <v-select
          color="primary"
          item-color="primary"
          label="Networking Type"
          :items="networkingTypeList"
          persistent-hint
          v-model="networkingType"
          :error-messages="getErrorMessages('networkingType')"
          @update:model-value="$v.networkingType.$touch()"
          @blur="$v.networkingType.$touch()"
          ></v-select>
      </v-col>
      <template v-if="infrastructureKind === 'openstack'">
        <v-col cols="3">
          <wildcard-select
            v-model="floatingPoolName"
            :wildcard-select-items="allFloatingPoolNames"
            wildcard-select-label="Floating Pool"
            @valid="onFloatingPoolWildcardValid"
            ></wildcard-select>
        </v-col>
        <v-col cols="3">
          <v-select
          color="primary"
          item-color="primary"
          label="Load Balancer Provider"
          :items="allLoadBalancerProviderNames"
          v-model="loadBalancerProviderName"
          :error-messages="getErrorMessages('loadBalancerProviderName')"
          @update:model-value="onInputLoadBalancerProviderName"
          @blur="$v.loadBalancerProviderName.$touch()"
          persistent-hint
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
            @update:model-value="onInputProjectID"
            @blur="$v.projectID.$touch()"
            hint="Clusters with same Project ID share IP ranges to allow load balancing accross multiple partitions"
            persistent-hint
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
            @update:model-value="onInputPartitionID"
            @blur="$v.partitionID.$touch()"
            hint="Partion ID equals zone on other infrastructures"
            persistent-hint
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
            @update:model-value="onInputFirewallImage"
            @blur="$v.firewallImage.$touch()"
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
            @update:model-value="onInputFirewallSize"
            @blur="$v.firewallImage.$touch()"
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
            @update:model-value="onInputFirewallNetworks"
            @blur="$v.firewallNetworks.$touch()"
            chips
            small-chips
            closable-chips
            multiple
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
            @update:model-value="onInputLoadBalancerClassNames"
            @blur="$v.loadBalancerClassNames.$touch()"
            attach
            chips
            small-chips
            closable-chips
            multiple
          >
            <template v-slot:item="{ item }">
                <v-list-item-action >
                  <v-icon :color="item.disabled ? 'grey' : ''">{{ isLoadBalancerClassSelected(item) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline'}}</v-icon>
                </v-list-item-action>
                <v-list-item-content :class="{ 'grey--text': item.disabled }">
                  <v-list-item-title>{{ item.text }}</v-list-item-title>
                </v-list-item-content>
            </template>
          </v-select>
        </v-col>
      </template>
    </v-row>
  </v-container>
</template>

<script>
import CloudProfile from '@/components/CloudProfile.vue'
import WildcardSelect from '@/components/WildcardSelect.vue'
import SelectSecret from '@/components/SelectSecret.vue'
import { required, requiredIf } from 'vuelidate/lib/validators'
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
import { mapGetters, mapState, mapActions } from 'vuex'

const validations = {
  region: {
    required
  },
  networkingType: {
    required
  },
  loadBalancerProviderName: {
    required: requiredIf(function () {
      return this.infrastructureKind === 'openstack'
    })
  },
  loadBalancerClassNames: {
    required: requiredIf(function () {
      return this.infrastructureKind === 'vsphere'
    }),
    includesKey: includesIfAvailable('default', 'allLoadBalancerClassNames')
  },
  partitionID: {
    required: requiredIf(function () {
      return this.infrastructureKind === 'metal'
    })
  },
  firewallImage: {
    required: requiredIf(function () {
      return this.infrastructureKind === 'metal'
    })
  },
  firewallSize: {
    required: requiredIf(function () {
      return this.infrastructureKind === 'metal'
    })
  },
  firewallNetworks: {
    required: requiredIf(function () {
      return this.infrastructureKind === 'metal'
    })
  },
  projectID: {
    required: requiredIf(function () {
      return this.infrastructureKind === 'metal'
    })
  }
}

export default {
  name: 'new-shoot-infrastructure',
  components: {
    CloudProfile,
    WildcardSelect,
    SelectSecret
  },
  props: {
    userInterActionBus: {
      type: Object,
      required: true
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
      valid: false
    }
  },
  validations,
  computed: {
    ...mapState([
      'cfg'
    ]),
    ...mapGetters([
      'cloudProfilesByCloudProviderKind',
      'infrastructureSecretsByCloudProfileName',
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
      'networkingTypeList'
    ]),
    validationErrors () {
      const validationErrors = {
        region: {
          required: 'Region is required'
        },
        networkingType: {
          required: 'Networking Type is required'
        },
        loadBalancerProviderName: {
          required: 'Load Balancer Providers required'
        },
        loadBalancerClassNames: {
          required: 'Load Balancer Classes required',
          includesKey: ({ key }) => `Load Balancer Class "${key}" must be selected`
        },
        partitionID: {
          required: 'Partition ID is required'
        },
        projectID: {
          required: 'Project ID is required'
        },
        firewallImage: {
          required: 'Firewall Image is required'
        },
        firewallSize: {
          required: 'Firewall Size is required'
        },
        firewallNetworks: {
          required: 'Firewall Networks required'
        }
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
      return this.cfg.seedCandidateDeterminationStrategy !== 'SameRegion'
    },
    regionItems () {
      const regionItems = []
      if (!isEmpty(this.regionsWithSeed)) {
        regionItems.push({ header: 'Recommended Regions (API servers in same region)' })
      }
      forEach(this.regionsWithSeed, region => {
        regionItems.push({ text: region })
      })
      if (this.showAllRegions && !isEmpty(this.regionsWithoutSeed)) {
        regionItems.push({ header: 'Supported Regions (API servers in another region)' })
        forEach(this.regionsWithoutSeed, region => {
          regionItems.push({ text: region })
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
          disabled: name === 'default'
        }
      })
      return loadBalancerClasses
    },
    allFloatingPoolNames () {
      const cloudProfileName = this.cloudProfileName
      const region = this.region
      const secretDomain = get(this.secret, 'data.domainName')
      return this.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain })
    }
  },
  methods: {
    ...mapActions('shootStaging', [
      'setCloudProfileName'
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
            : head(this.allLoadBalancerClassNames)
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
      this.$v.region.$touch()
      this.userInterActionBus.emit('updateRegion', this.region)
      this.validateInput()
    },
    onFloatingPoolWildcardValid (valid) {
      this.floatingPoolValid = valid
      this.validateInput()
    },
    onInputLoadBalancerProviderName () {
      this.$v.loadBalancerProviderName.$touch()
      this.validateInput()
    },
    onInputLoadBalancerClassNames () {
      // sort loadBalancerClassNames in the same order as they are listed in the cloudProfile
      this.loadBalancerClassNames = intersection(this.allLoadBalancerClassNames, this.loadBalancerClassNames)
      this.$v.loadBalancerClassNames.$touch()
      this.validateInput()
    },
    onInputPartitionID () {
      this.$v.partitionID.$touch()
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
      this.$v.projectID.$touch()
      this.validateInput()
    },
    onInputFirewallImage () {
      this.$v.firewallImage.$touch()
      this.validateInput()
    },
    onInputFirewallSize () {
      this.$v.firewallSize.$touch()
      this.validateInput()
    },
    onInputFirewallNetworks () {
      this.$v.firewallNetworks.$touch()
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
      const valid = !this.$v.$invalid && this.cloudProfileValid && this.floatingPoolValid && this.secretValid
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
        firewallNetworks: this.firewallNetworks
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
      firewallNetworks
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
      this.$v.projectID.$touch() // project id is a required field (for metal). We want to show the error immediatley
      this.validateInput()
    }
  },
  mounted () {
    this.userInterActionBus.on('updateInfrastructure', infrastructureKind => {
      this.infrastructureKind = infrastructureKind
      this.setDefaultCloudProfile()
    })
  }
}
</script>
