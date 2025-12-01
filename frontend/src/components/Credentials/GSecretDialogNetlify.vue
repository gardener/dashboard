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
          v-model="apiToken"
          color="primary"
          label="Netlify API Token"
          :error-messages="getErrorMessages(v$.apiToken)"
          :append-icon="hideApiToken ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideApiToken ? 'password' : 'text'"
          variant="underlined"
          @click:append="() => (hideApiToken = !hideApiToken)"
          @update:model-value="v$.apiToken.$touch()"
          @blur="v$.apiToken.$touch()"
        />
      </div>
    </template>

    <template #help-slot>
      <div>
        <p>
          You need to provide an access token for Netlify to allow the dns-controller-manager to authenticate with the Netlify DNS API.
        </p>
        <p>
          Then, base64 encode the token. For example, if the generated token in 1234567890123456, use
        </p>
        <pre>$ echo -n '1234567890123456789' | base64</pre>
        <p>
          For details, see
          <g-external-link url="https://docs.netlify.com/cli/get-started/#obtain-a-token-in-the-netlify-ui" />
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import GSecretDialog from '@/components/Credentials/GSecretDialog'
import GExternalLink from '@/components/GExternalLink'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

export default {
  components: {
    GSecretDialog,
    GExternalLink,
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

    const { apiToken } = secretStringDataRefs({
      apiToken: 'apiToken',
    })

    return {
      apiToken,
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      hideApiToken: true,
    }
  },
  validations () {
    return {
      apiToken: withFieldName('API Token', {
        required,
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
