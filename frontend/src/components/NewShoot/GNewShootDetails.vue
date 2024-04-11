<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="px-0 mx-0">
    <v-row>
      <v-col cols="3">
        <v-text-field
          ref="name"
          v-model="name"
          color="primary"
          label="Cluster Name"
          :counter="maxShootNameLength"
          :error-messages="getErrorMessages(v$.name)"
          hint="Maximum name length depends on project name"
          variant="underlined"
          @input="onInputName"
          @blur="v$.name.$touch()"
        />
      </v-col>
      <v-col cols="3">
        <v-select
          v-model="kubernetesVersion"
          color="primary"
          item-color="primary"
          label="Kubernetes Version"
          item-title="version"
          item-value="version"
          :items="sortedKubernetesVersionsList"
          :error-messages="getErrorMessages(v$.kubernetesVersion)"
          :hint="versionHint"
          persistent-hint
          variant="underlined"
          @update:model-value="onInputKubernetesVersion"
          @blur="v$.kubernetesVersion.$touch()"
        >
          <template #item="{ item, props }">
            <v-list-item
              v-bind="props"
              :subtitle="versionItemDescription(item.raw)"
            />
          </template>
          <template #message="{ message }">
            <g-multi-message :message="message" />
          </template>
        </v-select>
      </v-col>
      <v-col cols="3">
        <g-purpose
          ref="purposeRef"
          :secret="secret"
          @update-purpose="onUpdatePurpose"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <g-static-token-kubeconfig-switch v-model="enableStaticTokenKubeconfig" />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <v-checkbox
          v-model="workerless"
          label="Workerless Cluster"
          color="primary"
          density="compact"
          hint="Create nodeless cluster without worker groups"
          persistent-hint
        />
      </v-col>
    </v-row>
    <v-row v-if="slaDescriptionHtml">
      <v-col cols="12">
        <label>{{ slaTitle }}</label>
        <!-- eslint-disable vue/no-v-html -->
        <p
          class="text-subtitle-1"
          v-html="slaDescriptionHtml"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import {
  mapActions,
  mapState,
  mapWritableState,
} from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  maxLength,
} from '@vuelidate/validators'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useProjectStore } from '@/store/project'
import { useShootStore } from '@/store/shoot'
import { useShootStagingStore } from '@/store/shootStaging'
import { useCloudProfileStore } from '@/store/cloudProfile'

import GStaticTokenKubeconfigSwitch from '@/components/GStaticTokenKubeconfigSwitch'
import GMultiMessage from '@/components/GMultiMessage'

import { useAsyncRef } from '@/composables/useAsyncRef'

import {
  withFieldName,
  lowerCaseAlphaNumHyphen,
  noStartEndHyphen,
  noConsecutiveHyphen,
  withMessage,
} from '@/utils/validators'
import {
  getErrorMessages,
  transformHtml,
  setDelayedInputFocus,
} from '@/utils'

import {
  get,
  find,
  join,
  filter,
} from '@/lodash'

export default {
  components: {
    GPurpose: defineAsyncComponent(() => import('@/components/GPurpose')),
    GStaticTokenKubeconfigSwitch,
    GMultiMessage,
  },
  props: {
    userInterActionBus: {
      type: Object,
      required: true,
    },
  },
  setup () {
    return {
      v$: useVuelidate(),
      ...useAsyncRef('purpose'),
    }
  },
  data () {
    return {
      name: undefined,
      kubernetesVersion: undefined,
      purposeValue: undefined,
      cloudProfileName: undefined,
      secret: undefined,
      updateK8sMaintenance: undefined,
      enableStaticTokenKubeconfig: undefined,
    }
  },
  validations () {
    const rules = {}

    const nameRules = {
      required,
      maxLength: maxLength(this.maxShootNameLength),
      noConsecutiveHyphen,
      noStartEndHyphen,
      lowerCaseAlphaNumHyphen,
      unique: withMessage('A cluster with this name already exists in this project',
        value => !this.shootByNamespaceAndName({ namespace: this.namespace, name: value }),
      ),
    }
    rules.name = withFieldName('Cluster Name', nameRules)

    const kubernetesVersionRules = {
      required,
    }
    rules.kubernetesVersion = withFieldName('Kubernetes Version', kubernetesVersionRules)

    return rules
  },
  computed: {
    ...mapWritableState(useShootStagingStore, ['workerless']),
    ...mapState(useProjectStore, ['projectList']),
    ...mapState(useAuthzStore, ['namespace']),
    ...mapState(useConfigStore, ['sla']),
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
      const hints = []
      if (version.isExpirationWarning) {
        hints.push({
          type: 'text',
          hint: `Kubernetes version expires on: ${version.expirationDateString}. Kubernetes update will be enforced after that date.`,
          severity: 'warning',
        })
      }
      if (version.isPreview) {
        hints.push({
          type: 'text',
          hint: 'Preview versions have not yet undergone thorough testing. There is a higher probability of undiscovered issues and are therefore not recommended for production usage',
          severity: 'warning',
        })
      }
      if (version.isDeprecated) {
        const hint = version.expirationDate
          ? `This Kubernetes version is deprecated. It will expire on ${version.expirationDateString}`
          : 'This Kubernetes version is deprecated'
        hints.push({
          type: 'text',
          hint,
          severity: 'warning',
        })
      }
      if (this.updateK8sMaintenance && this.versionIsNotLatestPatch) {
        hints.push({
          type: 'text',
          hint: 'You selected a version that is eligible for an automatic update.You should disable automatic Kubernetes updates if you want to maintain this specific version',
          severity: 'info',
        })
      }
      return JSON.stringify(hints)
    },
    versionIsNotLatestPatch () {
      return this.kubernetesVersionIsNotLatestPatch(this.kubernetesVersion, this.cloudProfileName)
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
  },
  mounted () {
    this.userInterActionBus.on('updateSecret', secret => {
      this.secret = secret
      this.purpose.dispatch('resetPurpose')
    })
    this.userInterActionBus.on('updateCloudProfileName', cloudProfileName => {
      this.cloudProfileName = cloudProfileName
      this.setDefaultKubernetesVersion()
    })
    this.userInterActionBus.on('updateK8sMaintenance', updateK8sMaintenance => {
      this.updateK8sMaintenance = updateK8sMaintenance
    })

    setDelayedInputFocus(this, 'name')
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'sortedKubernetesVersions',
      'defaultKubernetesVersionForCloudProfileName',
      'kubernetesVersionIsNotLatestPatch',
    ]),
    ...mapActions(useShootStore, [
      'shootByNamespaceAndName',
    ]),
    onInputName () {
      this.v$.name.$touch()
    },
    onInputKubernetesVersion () {
      this.v$.kubernetesVersion.$touch()
      this.userInterActionBus.emit('updateKubernetesVersion', this.kubernetesVersion)
    },
    onUpdatePurpose (purpose) {
      this.purposeValue = purpose
      this.userInterActionBus.emit('updatePurpose', this.purposeValue)
    },
    setDefaultKubernetesVersion () {
      this.kubernetesVersion = get(this.defaultKubernetesVersionForCloudProfileName(this.cloudProfileName), 'version')
      this.onInputKubernetesVersion()
    },
    getDetailsData () {
      return {
        name: this.name,
        kubernetesVersion: this.kubernetesVersion,
        purpose: this.purposeValue,
        enableStaticTokenKubeconfig: this.enableStaticTokenKubeconfig,
      }
    },
    async setDetailsData ({ name, kubernetesVersion, purpose, cloudProfileName, secret, updateK8sMaintenance, enableStaticTokenKubeconfig }) {
      this.name = name
      this.cloudProfileName = cloudProfileName
      this.secret = secret
      this.kubernetesVersion = kubernetesVersion
      this.updateK8sMaintenance = updateK8sMaintenance
      this.enableStaticTokenKubeconfig = enableStaticTokenKubeconfig

      await this.purpose.dispatch('setPurpose', purpose)
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
    },
    getErrorMessages,
  },
}
</script>
