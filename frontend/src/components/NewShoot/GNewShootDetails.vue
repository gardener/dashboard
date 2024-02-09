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
          v-messages-color="{ color: 'warning' }"
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
        </v-select>
      </v-col>
      <v-col cols="3">
        <g-purpose
          ref="purposeRef"
          v-model="purpose"
          :purposes="purposes"
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
import {
  useShootStore,
  useShootCreationStore,
} from '@/store/shoot'
import { useShootStagingStore } from '@/store/shootStaging'

import GStaticTokenKubeconfigSwitch from '@/components/GStaticTokenKubeconfigSwitch'

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
  find,
  join,
  filter,
} from '@/lodash'

export default {
  components: {
    GPurpose: defineAsyncComponent(() => import('@/components/GPurpose')),
    GStaticTokenKubeconfigSwitch,
  },
  setup () {
    return {
      v$: useVuelidate(),
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
    ...mapWritableState(useShootStagingStore, [
      'workerless',
    ]),
    ...mapWritableState(useShootCreationStore, [
      'name',
      'kubernetesVersion',
      'cloudProfileName',
      'enableStaticTokenKubeconfig',
      'purpose',
    ]),
    ...mapState(useShootCreationStore, [
      'k8sUpdates',
      'sortedKubernetesVersions',
      'kubernetesVersionIsNotLatestPatch',
      'purposes',
    ]),
    ...mapState(useProjectStore, [
      'projectList',
    ]),
    ...mapState(useAuthzStore, [
      'namespace',
    ]),
    ...mapState(useConfigStore, [
      'sla',
    ]),
    sortedKubernetesVersionsList () {
      return filter(this.sortedKubernetesVersions, ({ isExpired }) => !isExpired)
    },
    versionHint () {
      const version = find(this.sortedKubernetesVersionsList, ['version', this.kubernetesVersion])
      if (!version) {
        return undefined
      }
      const hintText = []
      if (version.expirationDate) {
        hintText.push(`Kubernetes version expires on: ${version.expirationDateString}. Kubernetes update will be enforced after that date.`)
      }
      if (this.k8sUpdates && this.kubernetesVersionIsNotLatestPatch) {
        hintText.push('If you select a version which is not the latest patch version (except for preview versions), you should disable automatic Kubernetes updates')
      }
      if (version.isPreview) {
        hintText.push('Preview versions have not yet undergone thorough testing. There is a higher probability of undiscovered issues and are therefore not recommended for production usage')
      }
      return join(hintText, ' / ')
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
    setDelayedInputFocus(this, 'name')
  },
  methods: {
    ...mapActions(useShootStore, [
      'shootByNamespaceAndName',
    ]),
    onInputName () {
      this.v$.name.$touch()
    },
    onInputKubernetesVersion () {
      this.v$.kubernetesVersion.$touch()
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
