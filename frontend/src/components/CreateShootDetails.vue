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
  <v-layout row>
    <v-flex xs3>
      <v-text-field
        ref="name"
        color="cyan darken-2"
        label="Cluster Name"
        counter="10"
        v-model="name"
        :error-messages="getErrorMessages('name')"
        @input="onInputName"
        @blur="$v.name.$touch()"
        ></v-text-field>
    </v-flex>
    <v-flex xs1>
    </v-flex>
    <v-flex xs3>
      <v-select
        color="cyan darken-2"
        label="Kubernetes"
        :items="sortedKubernetesVersions"
        v-model="kubernetesVersion"
        :error-messages="getErrorMessages('kubernetesVersion')"
        @input="onInputKubernetesVersion"
        @blur="$v.kubernetesVersion.$touch()"
        ></v-select>
    </v-flex>
    <v-flex xs1>
    </v-flex>
    <v-flex xs3>
      <v-select
        color="cyan darken-2"
        label="Purpose"
        :items="purposes"
        v-model="purpose"
        hint="Indicate the importance of the cluster"
        persistent-hint
        @input="onInputPurpose"
        @blur="$v.purpose.$touch()"
        ></v-select>
    </v-flex>
  </v-layout>
</template>

<script>

import { mapGetters } from 'vuex'
import { getValidationErrors, purposesForSecret, shortRandomString } from '@/utils'
import { required, maxLength } from 'vuelidate/lib/validators'
import { resourceName, noStartEndHyphen, noConsecutiveHyphen } from '@/utils/validators'
import cloneDeep from 'lodash/cloneDeep'
import head from 'lodash/head'

const semSort = require('semver-sort')

const validationErrors = {
  name: {
    required: 'Name is required',
    maxLength: 'Name ist too long',
    resourceName: 'Name must only be lowercase letters, numbers and hyphens',
    unique: 'Cluster name must be unique',
    noConsecutiveHyphen: 'Cluster name must not contain consecutive hyphens',
    noStartEndHyphen: 'Cluster name must not start or end with a hyphen'
  },
  kubernetesVersion: {
    required: 'Kubernetes version is required'
  },
  purpose: {
    required: ' Purpose is required'
  }
}

const validations = {
  name: {
    required,
    maxLength: maxLength(10),
    noConsecutiveHyphen,
    noStartEndHyphen, // Order is important for UI hints
    resourceName,
    unique (value) {
      return this.shootByNamespaceAndName({ namespace: this.namespace, name: value }) === undefined
    }
  },
  kubernetesVersion: {
    required
  },
  purpose: {
    required
  }
}

export default {
  name: 'create-shoot-details',
  components: {
  },
  props: {
    secret: {
      type: Object,
      required: false
    },
    cloudProfileName: {
      type: String,
      required: false
    }
  },
  data () {
    return {
      validationErrors,
      name: shortRandomString(10),
      kubernetesVersion: undefined,
      purpose: undefined,
      valid: false
    }
  },
  validations,
  computed: {
    ...mapGetters([
      'kubernetesVersions',
      'shootByNamespaceAndName'
    ]),
    sortedKubernetesVersions () {
      return semSort.desc(cloneDeep(this.kubernetesVersions(this.cloudProfileName)))
    },
    purposes () {
      return purposesForSecret(this.secret)
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputName () {
      this.$v.name.$touch()
      // this.$emit('updateName', this.name)
      this.validateInput()
    },
    onInputKubernetesVersion () {
      this.$v.kubernetesVersion.$touch()
      // this.$emit('updateKubernetesVersion', this.kubernetesVersion)
      this.validateInput()
    },
    onInputPurpose () {
      this.$v.name.$touch()
      this.$emit('updatePurpose', this.purpose)
      this.validateInput()
    },
    validateInput () {
      const valid = !this.$v.$invalid
      if (this.valid !== valid) {
        this.valid = valid
        this.$emit('valid', valid)
      }
    },
    setDefaultPurpose () {
      this.purpose = head(this.purposes)
      this.onInputPurpose()
    },
    setDefaultKubernetesVersion () {
      this.kubernetesVersion = head(this.sortedKubernetesVersions)
      this.onInputKubernetesVersion()
    },
    getDetailsData () {
      return {
        name: this.name,
        kubernetesVersion: this.kubernetesVersion,
        purpose: this.purpose
      }
    }
  },
  watch: {
    secret (newValue) {
      this.setDefaultPurpose()
    },
    cloudProfileName (newValue) {
      this.setDefaultKubernetesVersion()
    }
  }
}
</script>
