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
      variant="underlined"
      @blur="v$.internalValue.$touch()"
    >
      <template #item="{ item, props }">
        <v-list-item
          v-bind="props"
          :title="undefined"
        >
          <g-credential-name :credential="item.raw" />
        </v-list-item>
      </template>
      <template #selection="{ item }">
        <g-credential-name :credential="item.raw" />
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

import { useCredentialStore } from '@/store/credential'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCloudProfileStore } from '@/store/cloudProfile'

import GSecretDialogWrapper from '@/components/Credentials/GSecretDialogWrapper'
import GCredentialName from '@/components/Credentials/GCredentialName'

import { useCloudProviderEntityList } from '@/composables/credential/useCloudProviderEntityList'

import { withFieldName } from '@/utils/validators'
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
    const credentialStore = useCredentialStore()
    const gardenerExtensionStore = useGardenerExtensionStore()
    const cloudProfileStore = useCloudProfileStore()

    const v$ = useVuelidate({
      $registerAs: props.registerVuelidateAs,
    })

    const providerType = toRef(props, 'providerType')
    const cloudProviderEntityList = useCloudProviderEntityList(providerType, { credentialStore, gardenerExtensionStore, cloudProfileStore })

    return {
      cloudProviderEntityList,
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
    return {
      internalValue: withFieldName('Secret', {
        required,
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
