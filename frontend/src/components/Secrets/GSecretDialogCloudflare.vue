<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :data="secretData"
    :data-valid="valid"
    :secret="secret"
    vendor="cloudflare-dns"
    create-title="Add new Cloudflare Secret"
    replace-title="Replace Cloudflare Secret"
    >

    <template v-slot:secret-slot>
      <div>
        <v-text-field
          color="primary"
          v-model="apiToken"
          label="Cloudflare API Token"
          :error-messages="getErrorMessages('apiToken')"
          :append-icon="hideApiToken ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideApiToken ? 'password' : 'text'"
          @click:append="() => (hideApiToken = !hideApiToken)"
          @update:model-value="v$.apiToken.$touch()"
          @blur="v$.apiToken.$touch()"
        ></v-text-field>
      </div>
    </template>

    <template v-slot:help-slot>
      <div>
        <p>
          To use this provider you need to generate an API token from the Cloudflare dashboard. A detailed documentation to generate an API token is available at <g-external-link url="https://support.cloudflare.com/hc/en-us/articles/200167836-Managing-API-Tokens-and-Keys"></g-external-link>.
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
        <p>
          <pre>$ echo -n '1234567890123456789' | base64</pre>
        </p>
        <p>
          to get the base64 encoded token. In this eg. this would be MTIzNDU2Nzg5MDEyMzQ1Njc4OQ==.
        </p>
      </div>
    </template>

  </g-secret-dialog>

</template>

<script>
import GSecretDialog from '@/components/Secrets/GSecretDialog'
import GExternalLink from '@/components/GExternalLink'
import { defineComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { getValidationErrors } from '@/utils'

const validationErrors = {
  apiToken: {
    required: 'You can\'t leave this empty.',
  },
}

export default defineComponent({
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  components: {
    GSecretDialog,
    GExternalLink,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    secret: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
  ],
  data () {
    return {
      apiToken: undefined,
      hideApiToken: true,
      validationErrors,
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
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
    secretData () {
      return {
        apiToken: this.apiToken,
      }
    },
    validators () {
      const validators = {
        apiToken: {
          required,
        },
      }
      return validators
    },
    isCreateMode () {
      return !this.secret
    },
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    },
    reset () {
      this.v$.$reset()

      this.apiToken = ''
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()
      }
    },
  },
})
</script>
