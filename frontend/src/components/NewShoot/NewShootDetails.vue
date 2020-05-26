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
  <v-container class="pa-0 ma-0">
    <v-row >
      <v-col cols="3">
        <v-text-field
          ref="name"
          color="cyan darken-2"
          label="Cluster Name"
          :counter="maxShootNameLength"
          v-model="name"
          :error-messages="getErrorMessages('name')"
          @input="onInputName"
          @blur="$v.name.$touch()"
          hint="Maximum name length depends on project name"
          ></v-text-field>
      </v-col>
      <v-col cols="3">
        <hint-colorizer hintColor="orange">
          <v-select
            color="cyan darken-2"
            item-color="cyan darken-2"
            label="Kubernetes Version"
            item-text="version"
            item-value="version"
            :items="sortedKubernetesVersionsList"
            v-model="kubernetesVersion"
            :error-messages="getErrorMessages('kubernetesVersion')"
            @input="onInputKubernetesVersion"
            @blur="$v.kubernetesVersion.$touch()"
            :hint="versionHint"
            persistent-hint
            >
            <template v-slot:item="{ item }">
              <v-list-item-content>
                <v-list-item-title>{{item.version}}</v-list-item-title>
                <v-list-item-subtitle v-if="item.expirationDateString">
                  <span>Expires: {{item.expirationDateString}}</span>
                </v-list-item-subtitle>
              </v-list-item-content>
            </template>
          </v-select>
        </hint-colorizer>
      </v-col>
      <v-col cols="3">
        <purpose
          ref="purpose"
          :secret="secret"
          @updatePurpose="onUpdatePurpose"
          @valid="onPurposeValid">
        </purpose>
      </v-col>
    </v-row>
    <v-row  v-if="slaDescriptionCompiledMarkdown">
      <v-col cols="12">
        <label class="caption grey--text text--darken-2">{{slaTitle}}</label>
        <p class="subtitle-1" v-html="slaDescriptionCompiledMarkdown" />
      </v-col>
    </v-row>
</v-container>
</template>

<script>

import HintColorizer from '@/components/HintColorizer'
import Purpose from '@/components/Purpose'
import { mapGetters, mapState } from 'vuex'
import { getValidationErrors, compileMarkdown, setDelayedInputFocus } from '@/utils'
import { required, maxLength } from 'vuelidate/lib/validators'
import { resourceName, noStartEndHyphen, noConsecutiveHyphen } from '@/utils/validators'
import head from 'lodash/head'
import get from 'lodash/get'
import find from 'lodash/find'
import semver from 'semver'

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
  }
}

export default {
  name: 'new-shoot-details',
  components: {
    HintColorizer,
    Purpose
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
      name: undefined,
      kubernetesVersion: undefined,
      purpose: undefined,
      valid: false,
      purposeValid: false,
      cloudProfileName: undefined,
      secret: undefined,
      updateK8sMaintenance: undefined
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    ...mapState([
      'namespace',
      'cfg'
    ]),
    ...mapGetters([
      'sortedKubernetesVersions',
      'shootByNamespaceAndName',
      'projectList'
    ]),
    sortedKubernetesVersionsList () {
      return this.sortedKubernetesVersions(this.cloudProfileName)
    },
    versionHint () {
      if (this.updateK8sMaintenance && this.versionIsNotLatestPatch) {
        return 'If you select a version which is not the latest patch version, you may want to disable automatic Kubernetes updates'
      }
      return undefined
    },
    versionIsNotLatestPatch () {
      return !!find(this.sortedKubernetesVersionsList, ({ version }) => {
        return semver.diff(version, this.kubernetesVersion) === 'patch' && semver.gt(version, this.kubernetesVersion)
      })
    },
    sla () {
      return this.cfg.sla || {}
    },
    slaDescriptionCompiledMarkdown () {
      return compileMarkdown(this.sla.description)
    },
    slaTitle () {
      return this.sla.title
    },
    projectName () {
      const predicate = item => item.metadata.namespace === this.namespace
      const project = find(this.projectList, predicate)
      return project.metadata.name
    },
    maxShootNameLength () {
      return 21 - this.projectName.length
    },
    validators () {
      return {
        name: {
          required,
          maxLength: maxLength(this.maxShootNameLength),
          noConsecutiveHyphen,
          noStartEndHyphen, // Order is important for UI hints
          resourceName,
          unique (value) {
            return this.shootByNamespaceAndName({ namespace: this.namespace, name: value }) === undefined
          }
        },
        kubernetesVersion: {
          required
        }
      }
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputName () {
      this.$v.name.$touch()
      this.validateInput()
    },
    onInputKubernetesVersion () {
      this.$v.kubernetesVersion.$touch()
      this.validateInput()
    },
    onUpdatePurpose (purpose) {
      this.purpose = purpose
      this.userInterActionBus.emit('updatePurpose', this.purpose)
      this.validateInput()
    },
    onPurposeValid (value) {
      this.purposeValid = value
    },
    validateInput () {
      const valid = !this.$v.$invalid && this.purposeValid
      if (this.valid !== valid) {
        this.valid = valid
        this.$emit('valid', valid)
      }
    },
    setDefaultKubernetesVersion () {
      this.kubernetesVersion = get(head(this.sortedKubernetesVersionsList), 'version')
      this.onInputKubernetesVersion()
    },
    getDetailsData () {
      return {
        name: this.name,
        kubernetesVersion: this.kubernetesVersion,
        purpose: this.purpose
      }
    },
    setDetailsData ({ name, kubernetesVersion, purpose, cloudProfileName, secret, updateK8sMaintenance }) {
      this.name = name
      this.cloudProfileName = cloudProfileName
      this.secret = secret
      this.kubernetesVersion = kubernetesVersion
      this.updateK8sMaintenance = updateK8sMaintenance

      this.$refs.purpose.setPurpose(purpose)

      this.validateInput()
    }
  },
  mounted () {
    this.userInterActionBus.on('updateSecret', secret => {
      this.secret = secret
      this.$refs.purpose.setDefaultPurpose()
    })
    this.userInterActionBus.on('updateCloudProfileName', cloudProfileName => {
      this.cloudProfileName = cloudProfileName
      this.setDefaultKubernetesVersion()
    })
    this.userInterActionBus.on('updateK8sMaintenance', updateK8sMaintenance => {
      this.updateK8sMaintenance = updateK8sMaintenance
    })

    setDelayedInputFocus(this, 'name')
  }
}
</script>
