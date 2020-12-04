<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
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
                <v-list-item-subtitle v-if="versionItemDescription(item).length">
                  {{versionItemDescription(item)}}
                </v-list-item-subtitle>
              </v-list-item-content>
            </template>
          </v-select>
        </hint-colorizer>
      </v-col>
      <v-col cols="3">
        <purpose
          :secret="secret"
          @updatePurpose="onUpdatePurpose"
          @valid="onPurposeValid"
          ref="purpose"
          v-on="$purpose.hooks"
        ></purpose>
      </v-col>
    </v-row>
    <v-row  v-if="slaDescriptionHtml">
      <v-col cols="12">
        <label class="caption grey--text text--darken-2">{{slaTitle}}</label>
        <p class="subtitle-1" v-html="slaDescriptionHtml" />
      </v-col>
    </v-row>
</v-container>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import get from 'lodash/get'
import find from 'lodash/find'
import join from 'lodash/join'
import filter from 'lodash/filter'
import { required, maxLength } from 'vuelidate/lib/validators'

import HintColorizer from '@/components/HintColorizer'

import asyncRef from '@/mixins/asyncRef'

import { getValidationErrors, transformHtml, setDelayedInputFocus, k8sVersionIsNotLatestPatch } from '@/utils'
import { resourceName, noStartEndHyphen, noConsecutiveHyphen } from '@/utils/validators'

const Purpose = () => import('@/components/Purpose')

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
  mixins: [
    asyncRef('purpose')
  ],
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
      'defaultKubernetesVersionForCloudProfileName',
      'shootByNamespaceAndName',
      'projectList'
    ]),
    sortedKubernetesVersionsList () {
      return filter(this.sortedKubernetesVersions(this.cloudProfileName), ({ isExpired }) => {
        return !isExpired
      })
    },
    versionHint () {
      const version = find(this.sortedKubernetesVersionsList, { version: this.kubernetesVersion })
      if (!version) {
        return undefined
      }
      const hintText = []
      if (version.expirationDate) {
        hintText.push(`Kubernetes version expires on: ${version.expirationDateString}. Kubernetes update will be enforced after that date.`)
      }
      if (this.updateK8sMaintenance && this.versionIsNotLatestPatch) {
        hintText.push('If you select a version which is not the latest patch version (except for preview versions), you should disable automatic Kubernetes updates')
      }
      if (version.isPreview) {
        hintText.push('Preview versions have not yet undergone thorough testing. There is a higher probability of undiscovered issues and are therefore not recommended for production usage')
      }
      return join(hintText, ' / ')
    },
    versionIsNotLatestPatch () {
      return k8sVersionIsNotLatestPatch(this.kubernetesVersion, this.cloudProfileName)
    },
    sla () {
      return this.cfg.sla || {}
    },
    slaDescriptionHtml () {
      return transformHtml(this.sla.description)
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
      this.kubernetesVersion = get(this.defaultKubernetesVersionForCloudProfileName(this.cloudProfileName), 'version')
      this.onInputKubernetesVersion()
    },
    getDetailsData () {
      return {
        name: this.name,
        kubernetesVersion: this.kubernetesVersion,
        purpose: this.purpose
      }
    },
    async setDetailsData ({ name, kubernetesVersion, purpose, cloudProfileName, secret, updateK8sMaintenance }) {
      this.name = name
      this.cloudProfileName = cloudProfileName
      this.secret = secret
      this.kubernetesVersion = kubernetesVersion
      this.updateK8sMaintenance = updateK8sMaintenance

      await this.$purpose.dispatch('setPurpose', purpose)

      this.validateInput()
    },
    versionItemDescription (version) {
      const itemDescription = []
      if (version.classification) {
        itemDescription.push(`Classification: ${version.classification}`)
      }
      if (version.expirationDate) {
        itemDescription.push(`Expiration Date: ${version.expirationDateString}`)
      }
      return join(itemDescription, ' | ')
    }
  },
  mounted () {
    this.userInterActionBus.on('updateSecret', secret => {
      this.secret = secret
      this.$purpose.dispatch('setDefaultPurpose')
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
