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
          <g-credential-name
            v-if="isDnsProvider"
            :credential="item.raw"
          />
          <g-credential-name
            v-else
            :binding="item.raw"
          />
        </v-list-item>
      </template>
      <template #selection="{ item }">
        <g-credential-name
          v-if="isDnsProvider"
          :credential="item.raw"
        />
        <g-credential-name
          v-else
          :binding="item.raw"
        />
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
  toRef,
  computed,
} from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { storeToRefs } from 'pinia'

import { useProjectStore } from '@/store/project'
import { useCredentialStore } from '@/store/credential'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCloudProfileStore } from '@/store/cloudProfile'

import GSecretDialogWrapper from '@/components/Credentials/GSecretDialogWrapper'
import GCredentialName from '@/components/Credentials/GCredentialName'

import { useProjectCostObject } from '@/composables/useProjectCostObject'
import { useCloudProviderEntityList } from '@/composables/credential/useCloudProviderEntityList'
import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import { useCloudProviderCredential } from '@/composables/credential/useCloudProviderCredential'

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
    const cloudProfileStore = useCloudProfileStore()

    const v$ = useVuelidate({
      $registerAs: props.registerVuelidateAs,
    })

    const providerType = toRef(props, 'providerType')
    const credential = toRef(props, 'modelValue')

    const cloudProviderEntityList = useCloudProviderEntityList(providerType, { credentialStore, gardenerExtensionStore, cloudProfileStore })

    const { dnsProviderTypes } = storeToRefs(gardenerExtensionStore)
    const isDnsProvider = computed(() => dnsProviderTypes.value.includes(providerType.value))
    let composable
    if (isDnsProvider.value) {
      composable = useCloudProviderCredential(credential)
    } else {
      composable = useCloudProviderBinding(credential)
    }
    const {
      isSharedBinding,
      selfTerminationDays,
    } = composable

    return {
      costObjectsSettingEnabled,
      costObjectErrorMessage,
      costObject,
      cloudProviderEntityList,
      isSharedBinding,
      selfTerminationDays,
      isDnsProvider,
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
          ? !!this.costObject || this.isSharedBinding
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
    allowedCredentials () {
      return this.cloudProviderEntityList
        ?.filter(credentialEntity => {
          const name = credentialEntity.secretRef?.name || credentialEntity.cedentialsRef?.name || credentialEntity.metadata?.name
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
