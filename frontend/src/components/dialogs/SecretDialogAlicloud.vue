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
    cloudProviderKind="alicloud"
    color="grey darken-4"
    infraIcon="alicloud-white"
    backgroundSrc="/static/background_alicloud.svg"
    createTitle="Add new Alibaba Cloud Secret"
    replaceTitle="Replace Alibaba Cloud Secret"
    @input="onInput">

    <template v-slot:data-slot>
      <div>
        <v-text-field
          color="grey darken-4"
          v-model="accessKeyId"
          ref="accessKeyId"
          label="Access Key Id"
          :error-messages="getErrorMessages('accessKeyId')"
          @input="$v.accessKeyId.$touch()"
          @blur="$v.accessKeyId.$touch()"
          counter="128"
          hint="e.g. QNJebZ17v5Q7pYpP"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="grey darken-4"
          v-model="accessKeySecret"
          label="Access Key Secret"
          :error-messages="getErrorMessages('accessKeySecret')"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          @click:append="() => (hideSecret = !hideSecret)"
          @input="$v.accessKeySecret.$touch()"
          @blur="$v.accessKeySecret.$touch()"
          counter="30"
          hint="e.g. WJalrXUtnFEMIK7MDENG/bPxRfiCYz"
        ></v-text-field>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog'
import { required, minLength, maxLength } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'

const validationErrors = {
  accessKeyId: {
    required: 'You can\'t leave this empty.',
    minLength: 'It must contain at least 16 characters.',
    maxLength: 'It exceeds the maximum length of 128 characters.'
  },
  accessKeySecret: {
    required: 'You can\'t leave this empty.',
    minLength: 'It must contain at least 30 characters.'
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
      accessKeySecret: undefined,
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
        accessKeySecret: this.accessKeySecret
      }
    },
    validators () {
      const validators = {
        accessKeyId: {
          required,
          minLength: minLength(16),
          maxLength: maxLength(128)
        },
        accessKeySecret: {
          required,
          minLength: minLength(30)
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
      this.accessKeySecret = ''

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
