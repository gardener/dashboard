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
  <div>
    <v-layout row>
      <v-flex xs3 v-show="cloudProfiles.length > 1">
        <cloud-profile
          ref="cloudProfile"
          v-model="cloudProfileName"
          :isCreateMode="true"
          :cloudProfiles="cloudProfiles"
          @valid="onCloudProfileNameValid"
          @input="onUpdateCloudProfileName"
          color="cyan darken-2">
        </cloud-profile>
      </v-flex>
      <v-flex xs3 :offset-xs1="cloudProfiles.length > 1">
        <v-select
          color="cyan darken-2"
          label="Secret"
          :items="secretItems"
          v-model="secret"
          :error-messages="getErrorMessages('secret')"
          @input="onInputSecret"
          @blur="$v.secret.$touch()"
          persistent-hint
          :hint="secretHint"
          >
          <template slot="item" slot-scope="data">
            <template v-if="isAddNewSecret(data.item)">
              <v-icon>mdi-plus</v-icon>
              <span class="pl-2">{{get(data.item, 'title')}}</span>
            </template>
            <template v-else>
              {{get(data.item, 'metadata.name')}}
              <v-icon v-if="!isOwnSecretBinding(data.item)">mdi-share</v-icon>
            </template>
          </template>
          <template slot="selection" slot-scope="data">
            <span class="black--text">
              {{get(data.item, 'metadata.name')}}
            </span>
            <v-icon v-if="!isOwnSecretBinding(data.item)">mdi-share</v-icon>
          </template>
        </v-select>
      </v-flex>
    </v-layout>
    <v-layout row>
      <v-flex xs3>
        <v-select
          color="cyan darken-2"
          label="Region"
          :items="regionItems"
          :hint="regionHint"
          persistent-hint
          v-model="region"
          :error-messages="getErrorMessages('region')"
          @input="onInputRegion"
          @blur="$v.region.$touch()"
          ></v-select>
      </v-flex>
      <v-flex xs3 offset-xs1 v-if="infrastructureKind !== 'azure'">
        <v-select
          color="cyan darken-2"
          label="Zone"
          :items="allZones"
          :error-messages="getErrorMessages('zones')"
          v-model="zones"
          @input="onInputZones"
          @blur="$v.zones.$touch()"
          multiple
          ></v-select>
      </v-flex>
    </v-layout>
    <template v-if="infrastructureKind === 'openstack'">
      <v-layout row>
        <v-flex xs3>
          <v-select
          color="cyan darken-2"
          label="Floating Pools"
          :items="allFloatingPoolNames"
          v-model="floatingPoolName"
          :error-messages="getErrorMessages('floatingPoolName')"
          @input="onInputFloatingPoolName"
          @blur="$v.floatingPoolName.$touch()"
          ></v-select>
        </v-flex>
        <v-flex xs3 offset-xs1>
          <v-select
          color="cyan darken-2"
          label="Load Balancer Providers"
          :items="allLoadBalancerProviderNames"
          v-model="loadBalancerProviderName"
          :error-messages="getErrorMessages('loadBalancerProviderName')"
          @input="onInputLoadBalancerProviderName"
          @blur="$v.loadBalancerProviderName.$touch()"
          persistent-hint
          ></v-select>
        </v-flex>
      </v-layout>
    </template>
    <secret-dialog-wrapper :dialogState="addSecretDialogState" @dialogClosed="onSecretDialogClosed"></secret-dialog-wrapper>
  </div>
</template>

<script>
import CloudProfile from '@/components/CloudProfile'
import SecretDialogWrapper from '@/dialogs/SecretDialogWrapper'
import { required, requiredIf } from 'vuelidate/lib/validators'
import { getValidationErrors, isOwnSecretBinding, selfTerminationDaysForSecret } from '@/utils'
import sortBy from 'lodash/sortBy'
import head from 'lodash/head'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import sample from 'lodash/sample'
import concat from 'lodash/concat'
import find from 'lodash/find'
import includes from 'lodash/includes'
import forEach from 'lodash/forEach'
import cloneDeep from 'lodash/cloneDeep'
import differenceWith from 'lodash/differenceWith'
import isEqual from 'lodash/isEqual'
import { mapGetters, mapState } from 'vuex'

const validationErrors = {
  secret: {
    required: 'Secret is required'
  },
  region: {
    required: 'Region is required'
  },
  zones: {
    required: 'Zone is required'
  },
  floatingPoolName: {
    required: 'Floating Pools required'
  },
  loadBalancerProviderName: {
    required: 'Load Balancer Providers required'
  }
}

const validations = {
  secret: {
    required
  },
  region: {
    required
  },
  zones: {
    required: requiredIf(function () {
      return this.infrastructureKind === 'azure'
    })
  },
  floatingPoolName: {
    required: requiredIf(function () {
      return this.infrastructureKind === 'openstack'
    })
  },
  loadBalancerProviderName: {
    required: requiredIf(function () {
      return this.infrastructureKind === 'openstack'
    })
  }
}

export default {
  name: 'create-shoot-infrastructure',
  components: {
    CloudProfile,
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
      validationErrors,
      infrastructureKind: undefined,
      cloudProfileName: undefined,
      secret: undefined,
      zones: undefined,
      region: undefined,
      floatingPoolName: undefined,
      loadBalancerProviderName: undefined,
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
      'cloudProfileByName',
      'loadBalancerProviderNamesByCloudProfileName',
      'floatingPoolNamesByCloudProfileName'
    ]),
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
    allZones () {
      const cloudProfile = this.cloudProfileByName(this.cloudProfileName)
      const predicate = item => item.region === this.region
      return get(find(get(cloudProfile, 'data.zones'), predicate), 'names')
    },
    isOwnSecretBinding () {
      return (secret) => {
        return isOwnSecretBinding(secret)
      }
    },
    allLoadBalancerProviderNames () {
      return this.loadBalancerProviderNamesByCloudProfileName(this.cloudProfileName)
    },
    allFloatingPoolNames () {
      return this.floatingPoolNamesByCloudProfileName(this.cloudProfileName)
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
      this.onInputZones()
      this.loadBalancerProviderName = head(this.allLoadBalancerProviderNames)
      this.onInputLoadBalancerProviderName()
      this.floatingPoolName = head(this.allFloatingPoolNames)
      this.onInputFloatingPoolName()
    },
    setDefaultCloudProfile () {
      this.cloudProfileName = get(head(this.cloudProfiles), 'metadata.name')
      this.onUpdateCloudProfileName()
      this.setDefaultsDependingOnCloudProfile()
    },
    setDefaultZone () {
      this.zones = [sample(this.allZones)]
    },
    onInputSecret () {
      if (this.isAddNewSecret(this.secret)) {
        this.onAddSecret()
        this.$nextTick(() => {
          this.secret = head(this.infrastructureSecretsByProfileName)
        })
      } else {
        this.$v.secret.$touch()
        this.userInterActionBus.emit('updateSecret', this.secret)
        this.validateInput()
      }
    },
    onInputRegion () {
      this.$v.secret.$touch()
      this.setDefaultZone()
      this.validateInput()
    },
    onInputZones () {
      this.$v.secret.$touch()
      this.validateInput()
    },
    onInputFloatingPoolName () {
      this.$v.floatingPoolName.$touch()
      this.validateInput()
    },
    onInputLoadBalancerProviderName () {
      this.$v.loadBalancerProviderName.$touch()
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
      const valid = !this.$v.$invalid && this.cloudProfileValid
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
        zones: this.zones,
        region: this.region,
        floatingPoolName: this.floatingPoolName,
        loadBalancerProviderName: this.loadBalancerProviderName
      }
    },
    setInfrastructureData ({ infrastructureKind, cloudProfileName, secret, zones, region, floatingPoolName, loadBalancerProviderName }) {
      this.infrastructureKind = infrastructureKind
      this.cloudProfileName = cloudProfileName
      this.secret = secret
      this.zones = zones
      this.region = region
      this.floatingPoolName = floatingPoolName
      this.loadBalancerProviderName = loadBalancerProviderName

      this.validateInput()
    },
    isAddNewSecret (item) {
      return (item && item.value === 'ADD_NEW_SECRET') || item === 'ADD_NEW_SECRET'
    },
    onAddSecret () {
      this.secretItemsBeforeAdd = cloneDeep(this.secretItems)
      this.addSecretDialogState[this.infrastructureKind].visible = true
    },
    onSecretDialogClosed (infrastructureKind) {
      const newSecret = head(differenceWith(this.secretItems, this.secretItemsBeforeAdd, isEqual))
      if (newSecret) {
        this.secret = newSecret
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
