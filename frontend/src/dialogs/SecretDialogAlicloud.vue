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
    cloudProviderKind="alicloud"
    color="grey darken-4"
    infraIcon="alicloud-white"
    backgroundSrc="/static/background_alicloud.svg"
    createTitle="Add new Alibaba Cloud Secret"
    replaceTitle="Replace Alibaba Cloud Secret"
    @input="onInput">

    <template slot="data-slot">
      <v-layout column>
        <v-flex>
          <v-text-field
            color="grey darken-4"
            ref="accessKeyId"
            v-model="accessKeyId"
            :label="accessKeyIdLabel"
            :error-messages="getErrorMessages('accessKeyId')"
            @input="$v.accessKeyId.$touch()"
            @blur="$v.accessKeyId.$touch()"
            counter="128"
            hint="e.g. QNJebZ17v5Q7pYpP"
          ></v-text-field>
        </v-flex>
        <v-flex>
          <v-text-field
            color="grey darken-4"
            v-model="accessKeySecret"
            :label="accessKeySecretLabel"
            :error-messages="getErrorMessages('accessKeySecret')"
            :append-icon="hideSecret ? 'visibility' : 'visibility_off'"
            :type="hideSecret ? 'password' : 'text'"
            @click:append="() => (hideSecret = !hideSecret)"
            @input="$v.accessKeySecret.$touch()"
            @blur="$v.accessKeySecret.$touch()"
            counter="30"
            hint="e.g. WJalrXUtnFEMIK7MDENG/bPxRfiCYz"
          ></v-text-field>
        </v-flex>
      </v-layout>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/dialogs/SecretDialog'
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
    },
    accessKeyIdLabel () {
      return this.isCreateMode ? 'Access Key Id' : 'New Access Key Id'
    },
    accessKeySecretLabel () {
      return this.isCreateMode ? 'Access Key Secret ' : 'New Access Key Secret'
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
