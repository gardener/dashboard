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
      item-value="metadata.uid"
      item-title="metadata.name"
      return-object
      :error-messages="getErrorMessages(v$.internalValue)"
      persistent-hint
      :hint="credentialHint"
      variant="underlined"
      @blur="v$.internalValue.$touch()"
    >
      <template #item="{ item, props }">
        <v-list-item
          v-bind="props"
          :title="undefined"
        >
          <g-credential-name :binding="item.raw" />
        </v-list-item>
      </template>
      <template #selection="{ item }">
        <g-credential-name :binding="item.raw" />
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
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { useProjectStore } from '@/store/project'
import { useCredentialStore } from '@/store/credential'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import GSecretDialogWrapper from '@/components/Credentials/GSecretDialogWrapper'
import GCredentialName from '@/components/Credentials/GCredentialName'

import { useProjectCostObject } from '@/composables/useProjectCostObject'
import { useCloudProviderBindingList } from '@/composables/credential/useCloudProviderBindingList'
import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

import {
  withParams,
  withMessage,
  withFieldName,
} from '@/utils/validators'
import { getErrorMessages } from '@/utils'

import head from 'lodash/head'
import isEqual from 'lodash/isEqual'
import differenceWith from 'lodash/differenceWith'
import cloneDeep from 'lodash/cloneDeep'

export default {
  components: {
    GSecretDialogWrapper,
    GCredentialName,
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
      default: 'Credential',
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
    const gardenerExtensionStore = useGardenerExtensionStore()

    const v$ = useVuelidate({
      $registerAs: props.registerVuelidateAs,
    })

    const providerType = toRef(props, 'providerType')
    const cloudProviderBindingList = useCloudProviderBindingList(providerType, { credentialStore, gardenerExtensionStore })

    const binding = toRef(props, 'modelValue')
    const {
      isSharedCredential,
      selfTerminationDays,
    } = useCloudProviderBinding(binding)

    return {
      costObjectsSettingEnabled,
      costObjectErrorMessage,
      costObject,
      cloudProviderBindingList,
      isSharedCredential,
      selfTerminationDays,
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
      function requiresCostObjectIfEnabled () {
        return enabled
          ? !!this.costObject || this.isSharedCredential
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
        ?.filter(binding => {
          const name = binding.secretRef?.name || binding.cedentialsRef?.name
          return !this.notAllowedSecretNames.includes(name)
        })
    },
    credentialHint () {
      if (this.selfTerminationDays) {
        return `The selected secret has an associated quota that will cause the cluster to self terminate after ${this.selfTerminationDays} days`
      }
      return undefined
    },
  },
  mounted () {
    this.v$.internalValue.$touch()
  },
  methods: {
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
