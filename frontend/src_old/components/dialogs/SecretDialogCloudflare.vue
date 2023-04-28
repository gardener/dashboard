<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <secret-dialog
    :value=value
    :data="secretData"
    :data-valid="valid"
    :secret="secret"
    vendor="cloudflare-dns"
    create-title="Add new Cloudflare Secret"
    replace-title="Replace Cloudflare Secret"
    @input="onInput">

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
          @update:model-value="$v.apiToken.$touch()"
          @blur="$v.apiToken.$touch()"
        ></v-text-field>
      </div>
    </template>

    <template v-slot:help-slot>
      <div>
        <p>
          To use this provider you need to generate an API token from the Cloudflare dashboard. A detailed documentation to generate an API token is available at <external-link url="https://support.cloudflare.com/hc/en-us/articles/200167836-Managing-API-Tokens-and-Keys"></external-link>.
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

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog.vue'
import ExternalLink from '@/components/ExternalLink.vue'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'

const validationErrors = {
  apiToken: {
    required: 'You can\'t leave this empty.'
  }
}

export default {
  components: {
    SecretDialog,
    ExternalLink
  },
  props: {
    value: {
      type: Boolean,
      required: true
    },
    secret: {
      type: Object
    }
  },
  data () {
    return {
      apiToken: undefined,
      hideApiToken: true,
      validationErrors
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
  },
  computed: {
    valid () {
      return !this.$v.$invalid
    },
    secretData () {
      return {
        apiToken: this.apiToken
      }
    },
    validators () {
      const validators = {
        apiToken: {
          required
        }
      }
      return validators
    },
    isCreateMode () {
      return !this.secret
    }
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    },
    reset () {
      this.$v.$reset()

      this.apiToken = ''
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    }
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()
      }
    }
  }
}
</script>
