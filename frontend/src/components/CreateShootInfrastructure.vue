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
      <v-flex xs3>
        <v-select
          color="cyan darken-2"
          label="Infrastructure"
          :items="sortedCloudProviderKindList"
          v-model="infrastructureKind"
          :error-messages="getErrorMessages('infrastructureKind')"
          @input="onInputInfrastructureKind"
          @blur="$v.infrastructureKind.$touch()"
          >
          <template slot="item" slot-scope="data">
            <v-list-tile-action>
              <img v-if="data.item === 'alicloud'" src="@/assets/alicloud.svg" width="24">
              <infra-icon v-else v-model="data.item"></infra-icon>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title>{{data.item}}</v-list-tile-title>
            </v-list-tile-content>
          </template>
          <template slot="selection" slot-scope="data">
            <img v-if="data.item === 'alicloud'" src="@/assets/alicloud.svg" width="24" class="mr-2">
            <v-avatar v-else size="30px">
              <infra-icon v-model="data.item"></infra-icon>
            </v-avatar>
            <span class="black--text">
              {{data.item}}
            </span>
          </template>
        </v-select>
      </v-flex>
      <v-flex xs1 v-show="cloudProfiles.length > 1">
      </v-flex>
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
      <v-flex xs1>
      </v-flex>
      <v-flex xs3>
        <v-select
          color="cyan darken-2"
          label="Secret"
          :items="infrastructureSecretsByProfileName"
          v-model="secret"
          :error-messages="getErrorMessages('secret')"
          @input="onInputSecret"
          @blur="$v.secret.$touch()"
          persistent-hint
          :hint="secretHint"
          >
          <template slot="item" slot-scope="data">
            {{get(data.item, 'metadata.name')}}
            <v-icon v-if="!isOwnSecretBinding(data.item)">mdi-share</v-icon>
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
          :items="allRegions"
          v-model="region"
          :error-messages="getErrorMessages('region')"
          @input="onInputRegion"
          @blur="$v.region.$touch()"
          ></v-select>
      </v-flex>
      <v-flex xs1>
      </v-flex>
      <v-flex xs3 v-if="infrastructureKind !== 'azure'">
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
        <v-flex xs1>
        </v-flex>
        <v-flex xs3>
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
  </div>
</template>

<script>
import CloudProfile from '@/components/CloudProfile'
import InfraIcon from '@/components/InfrastructureIcon'
import { required, requiredIf } from 'vuelidate/lib/validators'
import { getValidationErrors, isOwnSecretBinding, selfTerminationDaysForSecret } from '@/utils'
import sortBy from 'lodash/sortBy'
import head from 'lodash/head'
import get from 'lodash/get'
import sample from 'lodash/sample'
import find from 'lodash/find'
import intersection from 'lodash/intersection'
import { mapGetters } from 'vuex'

const validationErrors = {
  infrastructureKind: {
    required: 'Infrastructure is required'
  },
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
  infrastructureKind: {
    required
  },
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
    InfraIcon
  },
  props: {

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
      cloudProfileValid: true // selection not shown in all cases, default to true
    }
  },
  validations,
  computed: {
    ...mapGetters([
      'cloudProviderKindList',
      'cloudProfilesByCloudProviderKind',
      'infrastructureSecretsByCloudProfileName',
      'regionsByCloudProfileName',
      'cloudProfileByName',
      'loadBalancerProviderNamesByCloudProfileName',
      'floatingPoolNamesByCloudProfileName'
    ]),
    sortedCloudProviderKindList () {
      return intersection(['aws', 'azure', 'gcp', 'openstack', 'alicloud'], this.cloudProviderKindList)
    },
    cloudProfiles () {
      return sortBy(this.cloudProfilesByCloudProviderKind(this.infrastructureKind), [(item) => item.metadata.name])
    },
    infrastructureSecretsByProfileName () {
      return this.infrastructureSecretsByCloudProfileName(this.cloudProfileName)
    },
    secretHint () {
      if (this.selfTerminationDays) {
        return `The selected secret has an associated quota that will cause the cluster to self terminate after ${this.selfTerminationDays} days`
      } else {
        return undefined
      }
    },
    allRegions () {
      return this.regionsByCloudProfileName(this.cloudProfileName)
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
      this.region = head(this.allRegions)
      this.onInputRegion()
      this.zones = [sample(this.allZones)]
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
    onInputInfrastructureKind () {
      this.$v.infrastructureKind.$touch()
      // this.$emit('updateInfrastructureKind', this.infrastructureKind)
      this.setDefaultCloudProfile()
      this.validateInput()
    },
    onInputSecret () {
      this.$v.secret.$touch()
      this.$emit('updateSecret', this.secret)
      this.validateInput()
    },
    onInputRegion () {
      this.$v.secret.$touch()
      // this.$emit('updateInfrastructureRegion', this.region)
      this.validateInput()
    },
    onInputZones () {
      this.$v.secret.$touch()
      // this.$emit('updateInfrastructureZones', this.zones)
      this.validateInput()
    },
    onInputFloatingPoolName () {
      this.$v.floatingPoolName.$touch()
      // this.$emit('updateFloatingPoolName', this.floatingPoolName)
      this.validateInput()
    },
    onInputLoadBalancerProviderName () {
      this.$v.loadBalancerProviderName.$touch()
      // this.$emit('updateLoadBalancerProvider', this.loadBalancerProviderName)
      this.validateInput()
    },
    onUpdateCloudProfileName () {
      this.$emit('updateCloudProfileName', this.cloudProfileName)
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
    }
  }
}
</script>
