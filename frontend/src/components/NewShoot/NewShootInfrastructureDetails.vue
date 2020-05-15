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
  <v-container  class="pa-0 ma-0">
    <v-row >
      <v-col v-show="cloudProfiles.length > 1" cols="3">
        <cloud-profile
          ref="cloudProfile"
          v-model="cloudProfileName"
          :isCreateMode="true"
          :cloudProfiles="cloudProfiles"
          @valid="onCloudProfileNameValid"
          @input="onUpdateCloudProfileName"
          color="cyan darken-2">
        </cloud-profile>
      </v-col>
      <v-col cols="3">
        <v-select
          ref="secret"
          color="cyan darken-2"
          item-color="cyan darken-2"
          label="Secret"
          :items="secretItems"
          item-value="metadata.name"
          return-object
          v-model="secret"
          :error-messages="getErrorMessages('secret')"
          @input="onInputSecret"
          @blur="$v.secret.$touch()"
          persistent-hint
          :hint="secretHint"
          >
          <template v-slot:item="{ item }">
            <template v-if="isAddNewSecret(item)">
              <v-icon>mdi-plus</v-icon>
              <span class="pl-2">{{get(item, 'title')}}</span>
            </template>
            <template v-else>
              <span>{{get(item, 'metadata.name')}}</span>
              <v-icon v-if="!isOwnSecretBinding(item)">mdi-share</v-icon>
            </template>
          </template>
          <template v-slot:selection="{ item }">
            <span>
              {{get(item, 'metadata.name')}}
            </span>
            <v-icon v-if="!isOwnSecretBinding(item)">mdi-share</v-icon>
          </template>
        </v-select>
      </v-col>
      <v-col cols="3">
        <v-select
          color="cyan darken-2"
          item-color="cyan darken-2"
          label="Region"
          :items="regionItems"
          :hint="regionHint"
          persistent-hint
          v-model="region"
          :error-messages="getErrorMessages('region')"
          @input="onInputRegion"
          @blur="$v.region.$touch()"
          ></v-select>
      </v-col>
      <template v-if="infrastructureKind === 'openstack'">
        <v-col cols="3">
          <wildcard-select
            v-model="floatingPoolName"
            :wildcardSelectItems="allFloatingPoolNames"
            wildcardSelectLabel="Floating Pool"
            @valid="onFloatingPoolWildcardValid"
            ></wildcard-select>
        </v-col>
        <v-col cols="3">
          <v-select
          color="cyan darken-2"
          item-color="cyan darken-2"
          label="Load Balancer Provider"
          :items="allLoadBalancerProviderNames"
          v-model="loadBalancerProviderName"
          :error-messages="getErrorMessages('loadBalancerProviderName')"
          @input="onInputLoadBalancerProviderName"
          @blur="$v.loadBalancerProviderName.$touch()"
          persistent-hint
          ></v-select>
        </v-col>
      </template>
      <template v-else-if="infrastructureKind === 'metal'">
        <v-col cols="3">
          <v-text-field
            color="cyan darken-2"
            item-color="cyan darken-2"
            label="Project ID"
            v-model="projectID"
            :error-messages="getErrorMessages('projectID')"
            @input="onInputProjectID"
            @blur="$v.projectID.$touch()"
            hint="Clusters with same Project ID share IP ranges to allow load balancing accross multiple partitions"
            persistent-hint
            ></v-text-field>
        </v-col>
        <v-col cols="3">
          <v-select
            color="cyan darken-2"
            item-color="cyan darken-2"
            label="Partition ID"
            :items="partitionIDs"
            v-model="partitionID"
            :error-messages="getErrorMessages('partitionID')"
            @input="onInputPartitionID"
            @blur="$v.partitionID.$touch()"
            hint="Partion ID equals zone on other infrastructures"
            persistent-hint
          ></v-select>
        </v-col>
        <v-col cols="3">
          <v-select
            color="cyan darken-2"
            item-color="cyan darken-2"
            label="Firewall Image"
            :items="firewallImages"
            v-model="firewallImage"
            :error-messages="getErrorMessages('firewallImage')"
            @input="onInputFirewallImage"
            @blur="$v.firewallImage.$touch()"
          ></v-select>
        </v-col>
        <v-col cols="3">
          <v-select
            color="cyan darken-2"
            item-color="cyan darken-2"
            label="Firewall Size"
            :items="firewallSizes"
            v-model="firewallSize"
            :error-messages="getErrorMessages('firewallSize')"
            @input="onInputFirewallSize"
            @blur="$v.firewallImage.$touch()"
          ></v-select>
        </v-col>
        <v-col cols="3">
          <v-select
            color="cyan darken-2"
            item-color="cyan darken-2"
            label="Firewall Networks"
            :items="allFirewallNetworks"
            v-model="firewallNetworks"
            :error-messages="getErrorMessages('firewallNetworks')"
            @input="onInputFirewallNetworks"
            @blur="$v.firewallNetworks.$touch()"
            chips
            small-chips
            deletable-chips
            multiple
          ></v-select>
        </v-col>
      </template>
      <template v-else-if="infrastructureKind === 'vsphere'">
        <v-col cols="3">
          <v-select
            color="cyan darken-2"
            item-color="cyan darken-2"
            label="Load Balancer Classes"
            :items="allLoadBalancerClasses"
            v-model="loadBalancerClassNames"
            :error-messages="getErrorMessages('loadBalancerClassNames')"
            @input="onInputLoadBalancerClassNames"
            @blur="$v.loadBalancerClassNames.$touch()"
            attach
            chips
            small-chips
            deletable-chips
            multiple
          >
            <template v-slot:item="{ item }">
                <v-list-item-action >
                  <v-icon :color="item.disabled ? 'grey' : ''">{{ isLoadBalancerClassSelected(item) ? 'check_box' : 'check_box_outline_blank'}}</v-icon>
                </v-list-item-action>
                <v-list-item-content :class="{ 'grey--text': item.disabled }">
                  <v-list-item-title>{{ item.text }}</v-list-item-title>
                </v-list-item-content>
            </template>
          </v-select>
        </v-col>
      </template>
    </v-row>
    <secret-dialog-wrapper :dialogState="addSecretDialogState" @dialogClosed="onSecretDialogClosed"></secret-dialog-wrapper>
  </v-container>
</template>

<script>
import CloudProfile from '@/components/CloudProfile'
import WildcardSelect from '@/components/WildcardSelect'
import SecretDialogWrapper from '@/components/dialogs/SecretDialogWrapper'
import { required, requiredIf } from 'vuelidate/lib/validators'
import { getValidationErrors, isOwnSecretBinding, selfTerminationDaysForSecret } from '@/utils'
import { includesIfAvailable, requiresCostObjectIfEnabled } from '@/utils/validators'
import sortBy from 'lodash/sortBy'
import head from 'lodash/head'
import get from 'lodash/get'
import map from 'lodash/map'
import isEmpty from 'lodash/isEmpty'
import concat from 'lodash/concat'
import includes from 'lodash/includes'
import forEach from 'lodash/forEach'
import cloneDeep from 'lodash/cloneDeep'
import differenceWith from 'lodash/differenceWith'
import intersection from 'lodash/intersection'
import isEqual from 'lodash/isEqual'
import find from 'lodash/find'
import toUpper from 'lodash/toUpper'
import { mapGetters, mapState } from 'vuex'

const validations = {
  secret: {
    required,
    requiresCostObjectIfEnabled
  },
  region: {
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
    SecretDialogWrapper
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
      floatingPoolName: undefined,
      floatingPoolValid: true,
      fpname: undefined,
      loadBalancerProviderName: undefined,
      loadBalancerClassNames: [],
      partitionID: undefined,
      firewallImage: undefined,
      firewallSize: undefined,
      firewallNetworks: undefined,
      projectID: undefined,
      valid: false,
      cloudProfileValid: true, // selection not shown in all cases, default to true
      addSecretDialogState: {
        aws: {
          visible: false,
          help: false
        },
        azure: {
          visible: false,
          help: false
        },
        gcp: {
          visible: false,
          help: false
        },
        openstack: {
          visible: false,
          help: false
        },
        alicloud: {
          visible: false,
          help: false
        },
        metal: {
          visible: false,
          help: false
        },
        vsphere: {
          visible: false,
          help: false
        }
      },
      secretItemsBeforeAdd: undefined
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
      'floatingPoolNamesByCloudProfileNameAndRegion',
      'partitionIDsByCloudProfileNameAndRegion',
      'firewallImagesByCloudProfileName',
      'firewallNetworksByCloudProfileNameAndPartitionId',
      'firewallSizesByCloudProfileNameAndRegionAndZones',
      'projectFromProjectList',
      'costObjectSettings'
    ]),
    validationErrors () {
      const validationErrors = {
        secret: {
          required: 'Secret is required',
          requiresCostObjectIfEnabled: () => {
            const projectName = get(this.secret, 'metadata.projectName')
            const project = this.projectFromProjectList
            const isSecretInProject = project.metadata.name === projectName

            return isSecretInProject ? `${this.costObjectTitle} is required. Go to the ADMINISTRATION page to edit the project and set the ${this.costObjectTitle}.` : `${this.costObjectTitle} is required and has to be set on the Project ${toUpper(projectName)}`
          }
        },
        region: {
          required: 'Region is required'
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
    costObjectSettingEnabled () { // required internally for requiresCostObjectIfEnabled
      return !isEmpty(this.costObjectSettings)
    },
    costObjectTitle () {
      return get(this.costObjectSettings, 'title')
    },
    cloudProfiles () {
      return sortBy(this.cloudProfilesByCloudProviderKind(this.infrastructureKind), [(item) => item.metadata.name])
    },
    infrastructureSecretsByProfileName () {
      return this.infrastructureSecretsByCloudProfileName(this.cloudProfileName)
    },
    secretItems () {
      if (!isEmpty(this.infrastructureKind)) {
        return concat(this.infrastructureSecretsByProfileName, {
          value: 'ADD_NEW_SECRET',
          title: 'Add new Secret'
        })
      } else {
        return this.infrastructureSecretsByProfileName
      }
    },
    secretHint () {
      if (this.selfTerminationDays) {
        return `The selected secret has an associated quota that will cause the cluster to self terminate after ${this.selfTerminationDays} days`
      } else {
        return undefined
      }
    },
    regionsWithSeed () {
      return this.regionsWithSeedByCloudProfileName(this.cloudProfileName)
    },
    regionsWithoutSeed () {
      return this.regionsWithoutSeedByCloudProfileName(this.cloudProfileName)
    },
    regionItems () {
      const showAllRegions = !isEmpty(this.cfg.seedCandidateDeterminationStrategy) && this.cfg.seedCandidateDeterminationStrategy !== 'SameRegion'
      const regionItems = []
      if (!isEmpty(this.regionsWithSeed)) {
        regionItems.push({ header: 'Recommended Regions (API servers in same region)' })
      }
      forEach(this.regionsWithSeed, region => {
        regionItems.push({ text: region })
      })
      if (showAllRegions && !isEmpty(this.regionsWithoutSeed)) {
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
    isOwnSecretBinding () {
      return (secret) => {
        return isOwnSecretBinding(secret)
      }
    },
    allLoadBalancerProviderNames () {
      return this.loadBalancerProviderNamesByCloudProfileNameAndRegion(this.cloudProfileName, this.region)
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
      const zones = [this.partitionID]
      const firewallSizes = this.firewallSizesByCloudProfileNameAndRegionAndZones({ cloudProfileName, region, zones })
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
      return this.floatingPoolNamesByCloudProfileNameAndRegion(this.cloudProfileName, this.region)
    },
    selfTerminationDays () {
      return selfTerminationDaysForSecret(this.secret)
    }
  },
  methods: {
    get (object, path, defaultValue) {
      return get(object, path, defaultValue)
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    setDefaultsDependingOnCloudProfile () {
      this.secret = head(this.infrastructureSecretsByProfileName)
      this.onInputSecret()
      this.region = head(this.regionsWithSeed)
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
    onInputSecret () {
      if (this.isAddNewSecret(this.secret)) {
        this.onAddSecret()
      } else {
        this.$v.secret.$touch()
        this.validateInput()
        this.userInterActionBus.emit('updateSecret', this.secret)
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
      const valid = !this.$v.$invalid && this.cloudProfileValid && this.floatingPoolValid
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
      this.floatingPoolName = floatingPoolName
      this.loadBalancerProviderName = loadBalancerProviderName
      this.loadBalancerClassNames = map(loadBalancerClasses, 'name')
      this.partitionID = partitionID
      this.projectID = projectID
      this.firewallImage = firewallImage
      this.firewallSize = firewallSize
      this.firewallNetworks = firewallNetworks
      this.$v.secret.$touch() // secret may not be valid (e.g. missing cost object). We want to show the error immediatley
      this.validateInput()
    },
    isAddNewSecret (item) {
      return (item && item.value === 'ADD_NEW_SECRET') || item === 'ADD_NEW_SECRET'
    },
    onAddSecret () {
      this.secret = undefined
      this.$nextTick(() => {
        // need to set in next ui loop as it would not render correctly otherwise
        this.secret = head(this.infrastructureSecretsByProfileName)
        this.onInputSecret()
      })
      this.secretItemsBeforeAdd = cloneDeep(this.secretItems)
      this.addSecretDialogState[this.infrastructureKind].visible = true
    },
    onSecretDialogClosed (infrastructureKind) {
      const newSecret = head(differenceWith(this.secretItems, this.secretItemsBeforeAdd, isEqual))
      if (newSecret) {
        this.secret = newSecret
        this.onInputSecret()
      }
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
