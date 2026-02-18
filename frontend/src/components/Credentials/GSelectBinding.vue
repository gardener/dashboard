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
      label="Credential"
      :disabled="disabled"
      :items="allowedCredentials"
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
          <g-binding-name :binding="item.raw" />
        </v-list-item>
      </template>
      <template #selection="{ item }">
        <g-binding-name :binding="item.raw" />
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
    <v-alert
      v-if="changeInfraBinding && isSecretBinding"
      type="info"
      variant="tonal"
      class="mt-2"
    >
      You can only migrate to a CredentialsBinding that references the same Secret as the deprecated SecretBinding.
    </v-alert>
    <v-alert
      v-else-if="changeInfraBinding && isUnsupportedBinding"
      type="error"
      variant="tonal"
      class="mt-2"
    >
      The selected CredentialsBinding references a Secret with name <code>{{ credentialName }}</code>.<br>
      You can only migrate to a CredentialsBinding that references the same Secret as the deprecated SecretBinding: <code>{{ initialSecretBindingName }}</code>.
    </v-alert>
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
import { useCloudProfileStore } from '@/store/cloudProfile'

import GSecretDialogWrapper from '@/components/Credentials/GSecretDialogWrapper'
import GBindingName from '@/components/Credentials/GBindingName'

import { useProjectCostObject } from '@/composables/useProjectCostObject'
import { useCloudProviderEntityList } from '@/composables/credential/useCloudProviderEntityList'
import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import {
  isCredentialsBinding,
  isSecretBinding,
} from '@/composables/credential/helper'

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
    GBindingName,
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
    changeInfraBinding: {
      type: Boolean,
      default: false,
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
    const cloudProfileStore = useCloudProfileStore()

    const v$ = useVuelidate({
      $registerAs: props.registerVuelidateAs,
    })

    const providerType = toRef(props, 'providerType')
    const credential = toRef(props, 'modelValue')

    const cloudProviderEntityList = useCloudProviderEntityList(providerType, { credentialStore, gardenerExtensionStore, cloudProfileStore })

    const {
      isSharedBinding,
      selfTerminationDays,
      isSecretBinding,
      credentialName,
      bindingCredentialRef,
    } = useCloudProviderBinding(credential)

    return {
      costObjectsSettingEnabled,
      costObjectErrorMessage,
      costObject,
      cloudProviderEntityList,
      isSharedBinding,
      isSecretBinding,
      credentialName,
      bindingCredentialRef,
      selfTerminationDays,
      v$,
    }
  },
  data () {
    return {
      secretItemsBeforeAdd: undefined,
      visibleSecretDialog: undefined,
      initialBinding: undefined,
    }
  },
  validations () {
    const requiresCostObjectIfEnabled = (enabled = false) => withParams(
      { type: 'requiresCostObjectIfEnabled', enabled },
      function requiresCostObjectIfEnabled () {
        return enabled
          ? !!this.costObject || this.isSharedBinding
          : true
      },
    )

    const secretBinding = () => !(this.changeInfraBinding && this.isSecretBinding)
    const unsupportedBinding = () => !(this.changeInfraBinding && this.isUnsupportedBinding)

    return {
      internalValue: withFieldName('Secret', {
        required,
        requiresCostObjectIfEnabled: withMessage(
          'A Cost Object is required. Go to the ADMINISTRATION page to edit the project and set the Cost Object.',
          requiresCostObjectIfEnabled(this.costObjectsSettingEnabled),
        ),
        secretBinding: withMessage(
          'The selected credential is a SecretBinding, which is deprecated. Please migrate to a CredentialsBinding.',
          secretBinding,
        ),
        unsupportedBinding: withMessage(
          'The selected CredentialsBinding is not compatible. Please select a different CredentialsBinding.',
          unsupportedBinding,
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
    allowedCredentials () {
      let credentialList = this.cloudProviderEntityList || []
      if (this.changeInfraBinding) {
        credentialList = credentialList.filter(credential => isCredentialsBinding(credential) || credential.metadata.uid === this.initialBinding?.metadata?.uid)
      }
      return credentialList
    },
    credentialHint () {
      if (this.selfTerminationDays) {
        return `The selected credential has an associated quota that will cause the cluster to self terminate after ${this.selfTerminationDays} days`
      }
      return undefined
    },
    isInitialSecretBinding () {
      return isSecretBinding(this.initialBinding)
    },
    initialSecretBindingName () {
      if (isSecretBinding(this.initialBinding)) {
        return this.initialBinding?.secretRef?.name
      }
      return undefined
    },
    isUnsupportedBinding () {
      if (!isSecretBinding(this.initialBinding)) {
        return false
      }
      const { name, namespace } = this.initialBinding?.secretRef || {}
      return this.bindingCredentialRef?.name !== name || this.bindingCredentialRef?.namespace !== namespace
    },
  },
  mounted () {
    this.initialBinding = this.modelValue
    this.v$.internalValue.$touch()
  },
  methods: {
    openSecretDialog () {
      this.visibleSecretDialog = this.providerType
      this.secretItemsBeforeAdd = cloneDeep(this.allowedCredentials)
    },
    onSecretDialogClosed () {
      this.visibleSecretDialog = undefined
      const value = head(differenceWith(this.allowedCredentials, this.secretItemsBeforeAdd, isEqual))
      if (value) {
        this.internalValue = value
      }
    },
    getErrorMessages,
  },
}
</script>
