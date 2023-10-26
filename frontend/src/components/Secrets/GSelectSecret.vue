<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-select
      ref="secret"
      v-model="secret"
      color="primary"
      item-color="primary"
      label="Secret"
      :disabled="disabled"
      :items="secretList"
      item-value="metadata.name"
      item-title="metadata.name"
      return-object
      :error-messages="errors.secret"
      persistent-hint
      :hint="secretHint"
      variant="underlined"
      @update:model-value="v$.secret.$touch()"
      @blur="v$.secret.$touch()"
    >
      <template #item="{ item, props }">
        <v-list-item
          v-bind="props"
          :title="undefined"
          :subtitle="item.raw.description"
        >
          {{ get(item.raw, 'metadata.name') }}
          <v-icon v-if="!isOwnSecret(item.raw)">
            mdi-share
          </v-icon>
        </v-list-item>
      </template>
      <template #selection="{ item }">
        {{ get(item.raw, 'metadata.name') }}
        <v-icon v-if="!isOwnSecret(item.raw)">
          mdi-share
        </v-icon>
      </template>
      <template #append-item>
        <v-divider class="mb-2" />
        <v-btn
          text
          class="mx-2 text-primary"
          @click="openSecretDialog"
        >
          <v-icon class="mr-2">
            mdi-plus
          </v-icon>
          Add new Secret
        </v-btn>
      </template>
    </v-select>
    <g-secret-dialog-wrapper
      :visible-dialog="visibleSecretDialog"
      @dialog-closed="onSecretDialogClosed"
    />
  </div>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useSecretStore } from '@/store/secret'
import { useProjectStore } from '@/store/project'

import GSecretDialogWrapper from '@/components/Secrets/GSecretDialogWrapper'

import {
  requiresCostObjectIfEnabled,
  withMessage,
  allWithCauserParam,
} from '@/utils/validators'
import {
  getVuelidateErrors,
  isOwnSecret,
  selfTerminationDaysForSecret,
} from '@/utils'

import {
  cloneDeep,
  differenceWith,
  isEqual,
  isEmpty,
  head,
  get,
  toUpper,
} from '@/lodash'

export default {
  components: {
    GSecretDialogWrapper,
  },
  props: {
    modelValue: {
      type: Object,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    cloudProfileName: {
      type: String,
    },
    dnsProviderKind: {
      type: String,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      secretItemsBeforeAdd: undefined,
      visibleSecretDialog: undefined,
    }
  },
  validations () {
    const projectName = get(this.secret, 'metadata.projectName')
    const isSecretInProject = this.projectName === projectName

    const requiresCostObjectIfEnabledMessage = isSecretInProject
      ? `${this.costObjectTitle} is required. Go to the ADMINISTRATION page to edit the project and set the ${this.costObjectTitle}.`
      : `${this.costObjectTitle} is required and has to be set on the Project ${toUpper(projectName)}`
    return {
      secret: allWithCauserParam('Secret', {
        required,
        requiresCostObjectIfEnabled: withMessage(requiresCostObjectIfEnabledMessage, requiresCostObjectIfEnabled),
      }),
    }
  },
  computed: {
    ...mapState(useConfigStore, ['costObjectSettings']),
    ...mapState(useAuthzStore, ['namespace']),
    projectName () {
      return this.projectNameByNamespace(this.namespace)
    },
    secret: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    secretList () {
      if (this.cloudProfileName) {
        return this.infrastructureSecretsByCloudProfileName(this.cloudProfileName)
      }
      if (this.dnsProviderKind) {
        return this.dnsSecretsByProviderKind(this.dnsProviderKind)
      }
      return []
    },
    infrastructureKind () {
      if (this.dnsProviderKind) {
        return this.dnsProviderKind
      }

      if (!this.cloudProfileName) {
        return undefined
      }

      const cloudProfile = this.cloudProfileByName(this.cloudProfileName)
      if (!cloudProfile) {
        return undefined
      }
      return cloudProfile.metadata.cloudProviderKind
    },
    secretHint () {
      if (this.selfTerminationDays) {
        return `The selected secret has an associated quota that will cause the cluster to self terminate after ${this.selfTerminationDays} days`
      }
      return undefined
    },
    costObjectSettingEnabled () { // required internally for requiresCostObjectIfEnabled
      return !isEmpty(this.costObjectSettings)
    },
    costObjectTitle () {
      return get(this.costObjectSettings, 'title')
    },
    selfTerminationDays () {
      return selfTerminationDaysForSecret(this.secret)
    },
    errors () {
      return getVuelidateErrors(this.v$.$errors)
    },
  },
  watch: {
    modelValue () {
      this.v$.secret.$touch() // secret may not be valid (e.g. missing cost object). We want to show the error immediatley
    },
  },
  mounted () {
    this.v$.secret.$touch()
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'cloudProfileByName',
    ]),
    ...mapActions(useProjectStore, [
      'projectNameByNamespace',
    ]),
    ...mapActions(useSecretStore, [
      'infrastructureSecretsByCloudProfileName',
      'dnsSecretsByProviderKind',
    ]),
    get,
    isOwnSecret,
    openSecretDialog () {
      this.visibleSecretDialog = this.infrastructureKind
      this.secretItemsBeforeAdd = cloneDeep(this.secretList)
    },
    onSecretDialogClosed () {
      this.visibleSecretDialog = undefined
      const newSecret = head(differenceWith(this.secretList, this.secretItemsBeforeAdd, isEqual))
      if (newSecret) {
        this.secret = newSecret
      }
    },
  },
}
</script>
