<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :secret-validations="v$"
    :binding="binding"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          v-model="apiUrl"
          color="primary"
          label="API URL"
          :error-messages="getErrorMessages(v$.apiUrl)"
          variant="underlined"
          @update:model-value="v$.apiUrl.$touch()"
          @blur="v$.apiUrl.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="apiHmac"
          color="primary"
          label="API HMAC"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          :error-messages="getErrorMessages(v$.apiHmac)"
          variant="underlined"
          @click:append="() => (hideSecret = !hideSecret)"
          @update:model-value="v$.apiHmac.$touch()"
          @blur="v$.apiHmac.$touch()"
        />
      </div>
    </template>
    <template #help-slot>
      <div>
        <p>
          Before you can provision and access a Kubernetes cluster on Metal Stack, you need to provide HMAC credentials and the endpoint of your Metal API.
          The Gardener needs the credentials to provision and operate the Metal Stack infrastructure for your Kubernetes cluster.
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  url,
} from '@vuelidate/validators'

import GSecretDialog from '@/components/Credentials/GSecretDialog'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

export default {
  components: {
    GSecretDialog,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    binding: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    const { secretStringDataRefs } = useProvideSecretContext()

    const {
      apiHmac,
      apiUrl,
    } = secretStringDataRefs({
      metalAPIHMac: 'apiHmac',
      metalAPIURL: 'apiUrl',
    })

    return {
      apiHmac,
      apiUrl,
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      hideSecret: true,
    }
  },
  validations () {
    return {
      apiHmac: withFieldName('API HMAC', {
        required,
      }),
      apiUrl: withFieldName('API URL', {
        required,
        url,
      }),
    }
  },
  computed: {
    visible: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    valid () {
      return !this.v$.$invalid
    },
    isCreateMode () {
      return !this.secret
    },
  },
  methods: {
    getErrorMessages,
  },
}
</script>
