<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :secret-validations="v$"
    :binding="binding"
    create-title="Add new PowerDNS Secret"
    update-title="Update PowerDNS Secret"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          v-model="server"
          color="primary"
          label="Server"
          :error-messages="getErrorMessages(v$.server)"
          variant="underlined"
          @update:model-value="v$.server.$touch()"
          @blur="v$.server.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="apiKey"
          color="primary"
          label="API Key"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          :error-messages="getErrorMessages(v$.apiKey)"
          variant="underlined"
          @click:append="() => (hideSecret = !hideSecret)"
          @update:model-value="v$.apiKey.$touch()"
          @blur="v$.apiKey.$touch()"
        />
      </div>
    </template>
    <template #help-slot>
      <div>
        <p>
          To use this provider you need to configure the PowerDNS API with an API key. A detailed documentation to generate an API key is available at
          <g-external-link url="https://doc.powerdns.com/authoritative/http-api/index.html#enabling-the-api" />
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
      server,
      apiKey,
    } = secretStringDataRefs({
      server: 'server',
      apiKey: 'apiKey',
    })

    return {
      server,
      apiKey,
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
      apiKey: withFieldName('API Key', {
        required,
      }),
      server: withFieldName('Server', {
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
