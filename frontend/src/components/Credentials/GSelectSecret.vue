<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-select
      ref="secret"
      v-model="v$.internalValue.$model"
      color="primary"
      item-color="primary"
      :label="label"
      :disabled="disabled"
      :items="allowedBindings"
      item-value="metadata.name"
      item-title="metadata.name"
      return-object
      :error-messages="getErrorMessages(v$.internalValue)"
      persistent-hint
      :hint="secretHint"
      variant="underlined"
      @blur="v$.internalValue.$touch()"
    >
      <template #item="{ item, props }">
        <v-list-item
          v-bind="props"
          :title="undefined"
          :subtitle="item.raw.description"
        >
          {{ get(item.raw, 'metadata.name') }}
          <v-chip
            label
            size="x-small"
            color="primary"
            variant="tonal"
            class="ml-2"
          >
            {{ item.raw.kind }}
          </v-chip>
          <v-icon v-if="!hasOwnCredential(item.raw)">
            mdi-share
          </v-icon>
        </v-list-item>
      </template>
      <template #selection="{ item }">
        {{ get(item.raw, 'metadata.name') }}
        <v-icon v-if="!hasOwnCredential(item.raw)">
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
import { toRef } from 'vue'
import { mapActions } from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useProjectStore } from '@/store/project'
import { useCredentialStore } from '@/store/credential'

import GSecretDialogWrapper from '@/components/Credentials/GSecretDialogWrapper'

import { useProjectCostObject } from '@/composables/useProjectCostObject'
import { useCloudProviderBindingList } from '@/composables/useCloudProviderBindingList'

import {
  withParams,
  withMessage,
  withFieldName,
} from '@/utils/validators'
import {
  getErrorMessages,
  hasOwnCredential,
  selfTerminationDaysForSecret,
} from '@/utils'

import get from 'lodash/get'
import head from 'lodash/head'
import isEqual from 'lodash/isEqual'
import differenceWith from 'lodash/differenceWith'
import cloneDeep from 'lodash/cloneDeep'

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
    providerType: {
      type: String,
    },
    registerVuelidateAs: {
      type: String,
    },
    notAllowedSecretNames: {
      type: Array,
      default: () => [],
    },
    label: {
      type: String,
      default: 'Secret',
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup (props) {
    const projectStore = useProjectStore()
    const projectItem = toRef(projectStore, 'project')
    const {
      costObjectsSettingEnabled,
      costObjectErrorMessage,
      costObject,
    } = useProjectCostObject(projectItem)
    const credentialStore = useCredentialStore()

    const v$ = useVuelidate({
      $registerAs: props.registerVuelidateAs,
    })

    const providerType = toRef(props, 'providerType')
    const cloudProviderBindingList = useCloudProviderBindingList(providerType, { credentialStore })

    return {
      costObjectsSettingEnabled,
      costObjectErrorMessage,
      costObject,
      cloudProviderBindingList,
      v$,
    }
  },
  data () {
    return {
      secretItemsBeforeAdd: undefined,
      visibleSecretDialog: undefined,
    }
  },
  validations () {
    const requiresCostObjectIfEnabled = (enabled = false) => withParams(
      { type: 'requiresCostObjectIfEnabled', enabled },
      function requiresCostObjectIfEnabled (value) {
        return enabled
          ? !!this.costObject || !hasOwnCredential(value)
          : true
      },
    )

    return {
      internalValue: withFieldName('Secret', {
        required,
        requiresCostObjectIfEnabled: withMessage(
          'A Cost Object is required. Go to the ADMINISTRATION page to edit the project and set the Cost Object.',
          requiresCostObjectIfEnabled(this.costObjectsSettingEnabled),
        ),
      }),
    }
  },
  computed: {
    internalValue: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      },
    },
    allowedBindings () {
      return this.cloudProviderBindingList
        ?.filter(binding =>
          !this.notAllowedSecretNames.includes(binding.secretRef?.name) &&
        !this.notAllowedSecretNames.includes(binding.cedentialsRef?.name))
    },
    secretHint () {
      if (this.selfTerminationDays) {
        return `The selected secret has an associated quota that will cause the cluster to self terminate after ${this.selfTerminationDays} days`
      }
      return undefined
    },
    selfTerminationDays () {
      return selfTerminationDaysForSecret(this.internalValue)
    },
  },
  mounted () {
    this.v$.internalValue.$touch()
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'cloudProfileByName',
    ]),
    get,
    hasOwnCredential,
    openSecretDialog () {
      this.visibleSecretDialog = this.providerType
      this.secretItemsBeforeAdd = cloneDeep(this.allowedBindings)
    },
    onSecretDialogClosed () {
      this.visibleSecretDialog = undefined
      const value = head(differenceWith(this.allowedBindings, this.secretItemsBeforeAdd, isEqual))
      if (value) {
        this.internalValue = value
      }
    },
    getErrorMessages,
  },
}
</script>
