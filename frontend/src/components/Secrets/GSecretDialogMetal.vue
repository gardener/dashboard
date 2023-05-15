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
    vendor="metal"
    create-title="Add new Metal Secret"
    replace-title="Replace Metal Secret"
    >

    <template v-slot:secret-slot>
      <div>
        <v-text-field
          color="primary"
          v-model="apiUrl"
          ref="apiUrl"
          label="API URL"
          :error-messages="getErrorMessages('apiUrl')"
          @update:model-value="v$.apiUrl.$touch()"
          @blur="v$.apiUrl.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="primary"
          v-model="apiHmac"
          label="API HMAC"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          @click:append="() => (hideSecret = !hideSecret)"
          :error-messages="getErrorMessages('apiHmac')"
          @update:model-value="v$.apiHmac.$touch()"
          @blur="v$.apiHmac.$touch()"
        ></v-text-field>
      </div>
    </template>
    <template v-slot:help-slot>
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
import GSecretDialog from '@/components/Secrets/GSecretDialog'
import { defineComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, url } from '@vuelidate/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'

const validationErrors = {
  apiHmac: {
    required: 'You can\'t leave this empty.',
  },
  apiUrl: {
    required: 'You can\'t leave this empty.',
    url: 'You must enter a valid URL',
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
      apiHmac: undefined,
      apiUrl: undefined,
      hideSecret: true,
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
        metalAPIHMac: this.apiHmac,
        metalAPIURL: this.apiUrl,
      }
    },
    validators () {
      const validators = {
        apiHmac: {
          required,
        },
        apiUrl: {
          required,
          url,
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

      this.apiHmac = ''
      this.apiUrl = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'apiUrl')
      }
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
