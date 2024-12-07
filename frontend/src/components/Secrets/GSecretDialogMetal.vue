<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :secret-validations="v$"
    :secret-binding="secretBinding"
    create-title="Add new Metal Secret"
    replace-title="Replace Metal Secret"
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
import { ref } from 'vue'

import GSecretDialog from '@/components/Secrets/GSecretDialog'

import { useProvideSecretDialogData } from '@/composables/useSecretDialogData'

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
    secretBinding: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    const apiHmac = ref(undefined)
    const apiUrl = ref(undefined)

    useProvideSecretDialogData({
      data: {
        apiHmac,
        apiUrl,
      },
      keyMapping: {
        apiHmac: 'metalAPIHMac',
        apiUrl: 'metalAPIURL',
      },
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
