<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :data="secretData"
    :data-valid="valid"
    :secret="secret"
    vendor="netlify-dns"
    create-title="Add new Netlify Secret"
    replace-title="Replace Netlify Secret"
    >

    <template #secret-slot>
      <div>
        <v-text-field
          color="primary"
          v-model="apiToken"
          label="Netlify API Token"
          :error-messages="getErrorMessages('apiToken')"
          :append-icon="hideApiToken ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideApiToken ? 'password' : 'text'"
          @click:append="() => (hideApiToken = !hideApiToken)"
          @update:model-value="v$.apiToken.$touch()"
          @blur="v$.apiToken.$touch()"
          variant="underlined"
        ></v-text-field>
      </div>
    </template>

    <template #help-slot>
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
          For details see <g-external-link url="https://docs.netlify.com/cli/get-started/#obtain-a-token-in-the-netlify-ui"></g-external-link>
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
