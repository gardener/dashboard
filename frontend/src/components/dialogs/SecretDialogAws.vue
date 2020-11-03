<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <secret-dialog
    :value=value
    :data="secretData"
    :dataValid="valid"
    :secret="secret"
    cloudProviderKind="aws"
    color="orange darken-1"
    infraIcon="aws-white"
    backgroundSrc="/static/background_aws.svg"
    createTitle="Add new AWS Secret"
    replaceTitle="Replace AWS Secret"
    @input="onInput">

    <template v-slot:data-slot>
      <div>
        <v-text-field
          color="orange darken-1"
          v-model="accessKeyId"
          ref="accessKeyId"
          label="Access Key Id"
          :error-messages="getErrorMessages('accessKeyId')"
          @input="$v.accessKeyId.$touch()"
          @blur="$v.accessKeyId.$touch()"
          counter="128"
          hint="e.g. AKIAIOSFODNN7EXAMPLE"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="orange darken-1"
          v-model="secretAccessKey"
          label="Secret Access Key"
          :error-messages="getErrorMessages('secretAccessKey')"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          @click:append="() => (hideSecret = !hideSecret)"
          @input="$v.secretAccessKey.$touch()"
          @blur="$v.secretAccessKey.$touch()"
          counter="40"
          hint="e.g. wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY"
        ></v-text-field>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog'
import { required, minLength, maxLength } from 'vuelidate/lib/validators'
import { alphaNumUnderscore, base64 } from '@/utils/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'

const validationErrors = {
  accessKeyId: {
    required: 'You can\'t leave this empty.',
    minLength: 'It must contain at least 16 characters.',
    maxLength: 'It exceeds the maximum length of 128 characters.',
    alphaNumUnderscore: 'Please use only alphanumeric characters and underscore.'
  },
  secretAccessKey: {
    required: 'You can\'t leave this empty.',
    minLength: 'It must contain at least 40 characters.',
    base64: 'Invalid secret access key.'
  }
}

export default {
  components: {
    SecretDialog
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
      accessKeyId: undefined,
      secretAccessKey: undefined,
      hideSecret: true,
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
        accessKeyID: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      }
    },
    validators () {
      const validators = {
        accessKeyId: {
          required,
          minLength: minLength(16),
          maxLength: maxLength(128),
          alphaNumUnderscore
        },
        secretAccessKey: {
          required,
          minLength: minLength(40),
          base64
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

      this.accessKeyId = ''
      this.secretAccessKey = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'accessKeyId')
      }
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
