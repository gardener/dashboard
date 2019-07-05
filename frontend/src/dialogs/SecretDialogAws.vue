<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

<template>
  <secret-dialog
    :value=value
    :data="secretData"
    :dataValid="valid"
    :secret="secret"
    cloudProviderKind="aws"
    color="orange darken-2"
    infraIcon="aws-white"
    backgroundSrc="/static/background_aws.svg"
    createTitle="Add new AWS Secret"
    replaceTitle="Replace AWS Secret"
    @input="onInput">

    <template slot="data-slot">
      <v-layout column>
        <v-flex>
          <v-text-field
            color="orange darken-2"
            ref="accessKeyId"
            v-model="accessKeyId"
            :label="accessKeyIdLabel"
            :error-messages="getErrorMessages('accessKeyId')"
            @input="$v.accessKeyId.$touch()"
            @blur="$v.accessKeyId.$touch()"
            counter="128"
            hint="e.g. AKIAIOSFODNN7EXAMPLE"
          ></v-text-field>
        </v-flex>
        <v-flex>
          <v-text-field
            color="orange darken-2"
            v-model="secretAccessKey"
            :label="secretAccessKeyLabel"
            :error-messages="getErrorMessages('secretAccessKey')"
            :append-icon="hideSecret ? 'visibility' : 'visibility_off'"
            :type="hideSecret ? 'password' : 'text'"
            @click:append="() => (hideSecret = !hideSecret)"
            @input="$v.secretAccessKey.$touch()"
            @blur="$v.secretAccessKey.$touch()"
            counter="40"
            hint="e.g. wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY"
          ></v-text-field>
        </v-flex>
      </v-layout>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/dialogs/SecretDialog'
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
    },
    accessKeyIdLabel () {
      return this.isCreateMode ? 'Access Key Id' : 'New Access Key Id'
    },
    secretAccessKeyLabel () {
      return this.isCreateMode ? 'Secret Access Key' : 'New Secret Access Key'
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
