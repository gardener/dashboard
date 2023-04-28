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
    vendor="netlify-dns"
    create-title="Add new Netlify Secret"
    replace-title="Replace Netlify Secret"
    @input="onInput">

    <template v-slot:secret-slot>
      <div>
        <v-text-field
          color="primary"
          v-model="apiToken"
          label="Netlify API Token"
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
          You need to provide an access token for Netlify to allow the dns-controller-manager to authenticate to Netlify DNS API.
        </p>
        <p>
          Then base64 encode the token. For eg. if the generated token in 1234567890123456, use
        </p>
        <p>
          <pre>$ echo -n '1234567890123456789' | base64</pre>
        </p>
        <p>
          For details see <external-link url="https://docs.netlify.com/cli/get-started/#obtain-a-token-in-the-netlify-ui"></external-link>
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
