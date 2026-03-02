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
          v-model="v$.shootName.$model"
          color="primary"
          label="Cluster Name"
          :counter="maxShootNameLength"
          :error-messages="getErrorMessages(v$.shootName)"
          hint="Maximum name length depends on project name"
          variant="underlined"
          @blur="v$.shootName.$touch()"
        />
      </v-col>
      <v-col cols="3">
        <v-select
          v-model="v$.kubernetesVersion.$model"
          color="primary"
          item-color="primary"
          label="Kubernetes Version"
          item-title="version"
          item-value="version"
          :items="unexpiredKubernetesVersions"
          :error-messages="getErrorMessages(v$.kubernetesVersion)"
          :hint="versionHint"
          persistent-hint
          variant="underlined"
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
          v-model="purpose"
          :purposes="allPurposes"
        />
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
} from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  maxLength,
} from '@vuelidate/validators'
import semver from 'semver'

import { useConfigStore } from '@/store/config'
import { useShootStore } from '@/store/shoot'

import GMultiMessage from '@/components/GMultiMessage'

import { useShootContext } from '@/composables/useShootContext'
import { isSecretBinding } from '@/composables/credential/helper'

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

import filter from 'lodash/filter'
import join from 'lodash/join'
import find from 'lodash/find'

export default {
  components: {
    GPurpose: defineAsyncComponent(() => import('@/components/GPurpose')),
    GMultiMessage,
  },
  setup () {
    const {
      shootName,
      kubernetesVersion,
      purpose,
      workerless,
      shootNamespace,
      shootProjectName,
      maintenanceAutoUpdateKubernetesVersion,
      sortedKubernetesVersions,
      kubernetesVersionIsNotLatestPatch,
      infrastructureBinding,
      allPurposes,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      shootName,
      kubernetesVersion,
      purpose,
      workerless,
      shootNamespace,
      shootProjectName,
      maintenanceAutoUpdateKubernetesVersion,
      sortedKubernetesVersions,
      kubernetesVersionIsNotLatestPatch,
      infrastructureBinding,
      allPurposes,
    }
  },
  validations () {
    const rules = {}

    const shootNameRules = {
      required,
      maxLength: maxLength(this.maxShootNameLength),
      noConsecutiveHyphen,
      noStartEndHyphen,
      lowerCaseAlphaNumHyphen,
      unique: withMessage('A cluster with this name already exists in this project',
        value => !this.shootByNamespaceAndName({
          namespace: this.shootNamespace,
          name: value,
        }),
      ),
    }
    rules.shootName = withFieldName('Cluster Name', shootNameRules)

    const kubernetesVersionRules = {
      required,
      noSecretBindingForSelectedVersion: withMessage('The selected version requires a CredentialsBinding. You can migrate your SecretBinding to a CredentialsBinding on the Credentials page', function (version) {
        if (!version || !semver.valid(version)) {
          return true
        }
        const currentMinorVersion = semver.minor(version)
        const usesSecretBinding = isSecretBinding(this.infrastructureBinding)
        const requiresCredentialsBinding = currentMinorVersion >= 34
        const noSecretBindingForSelectedVersion = !this.workerless && usesSecretBinding && requiresCredentialsBinding
        return !noSecretBindingForSelectedVersion
      }),
    }
    rules.kubernetesVersion = withFieldName('Kubernetes Version', kubernetesVersionRules)

    return rules
  },
  computed: {
    ...mapState(useConfigStore, [
      'sla',
    ]),
    unexpiredKubernetesVersions () {
      return filter(this.sortedKubernetesVersions, ({ isExpired }) => !isExpired)
    },
    versionHint () {
      const version = find(this.unexpiredKubernetesVersions, ['version', this.kubernetesVersion])
      if (!version) {
        return
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
      if (this.maintenanceAutoUpdateKubernetesVersion && this.kubernetesVersionIsNotLatestPatch) {
        hints.push({
          type: 'text',
          hint: 'You selected a version that is eligible for an automatic update. You should disable automatic Kubernetes updates if you want to maintain this specific version',
          severity: 'info',
        })
      }
      return JSON.stringify(hints)
    },
    slaDescriptionHtml () {
      return transformHtml(this.sla.description)
    },
    slaTitle () {
      return this.sla.title
    },
    maxShootNameLength () {
      return 21 - this.shootProjectName.length
    },
  },
  mounted () {
    setDelayedInputFocus(this, 'name')
    this.v$.kubernetesVersion.$touch() // show version related errors immediately
  },
  methods: {
    ...mapActions(useShootStore, [
      'shootByNamespaceAndName',
    ]),
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
