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
          label="Cloudflare API Token"
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
          To use this provider you need to generate an API token from the Cloudflare dashboard. A detailed documentation to generate an API token is available at
          <g-external-link url="https://support.cloudflare.com/hc/en-us/articles/200167836-Managing-API-Tokens-and-Keys" />.
        </p>
        <p class="font-weight-bold">
          Note: You need to generate an API token and not an API key.
        </p>
        <p>
          To generate the token make sure the token has permission of Zone:Read and DNS:Edit for all zones. Optionally you can exclude certain zones.
        </p>
        <p class="font-weight-bold">
          Note: You need to Include All zones in the Zone Resources section. Setting Specific zone doesn't work. But you can still add one or more Excludes.
        </p>
        <p>
          Generate the token and keep this key safe as it won't be shown again.
        </p>
        <pre>$ echo -n '1234567890123456789' | base64</pre>
        <p>
          to get the base64 encoded token. In this eg. this would be MTIzNDU2Nzg5MDEyMzQ1Njc4OQ==.
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
