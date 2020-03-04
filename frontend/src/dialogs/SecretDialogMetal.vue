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
    cloudProviderKind="metal"
    color="blue"
    infraIcon="metal-white"
    backgroundSrc="/static/background_metal.svg"
    createTitle="Add new Metal Secret"
    replaceTitle="Replace Metal Secret"
    @input="onInput">

    <template slot="data-slot">
      <v-layout row>
        <v-flex>
          <v-text-field
            color="blue"
            v-model="apiURL"
            ref="apiURL"
            label="API URL"
            :error-messages="getErrorMessages('apiURL')"
            @input="$v.apiURL.$touch()"
            @blur="$v.apiURL.$touch()"
          ></v-text-field>
        </v-flex>
      </v-layout>
      <v-layout row>
        <v-flex>
          <v-text-field
            color="blue"
            v-model="apiHMAC"
            label="API HMAC"
            :append-icon="hideSecret ? 'visibility' : 'visibility_off'"
            :type="hideSecret ? 'password' : 'text'"
            @click:append="() => (hideSecret = !hideSecret)"
            :error-messages="getErrorMessages('apiHMAC')"
            @input="$v.apiHMAC.$touch()"
            @blur="$v.apiHMAC.$touch()"
          ></v-text-field>
        </v-flex>
      </v-layout>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/dialogs/SecretDialog'
import { required, url } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'

const validationErrors = {
  apiHMAC: {
    required: 'You can\'t leave this empty.'
  },
  apiURL: {
    required: 'You can\'t leave this empty.',
    url: 'You must enter a valid URL'
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
      apiHMAC: undefined,
      apiURL: undefined,
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
        metalAPIHMac: this.apiHMAC,
        metalAPIURL: this.apiURL
      }
    },
    validators () {
      const validators = {
        apiHMAC: {
          required
        },
        apiURL: {
          required,
          url
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

      this.apiHMAC = ''
      this.apiURL = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'apiURL')
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
