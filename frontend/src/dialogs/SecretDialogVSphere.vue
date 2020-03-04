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
    cloudProviderKind="vsphere"
    color="indigo darken-4"
    infraIcon="vsphere-white"
    backgroundSrc="/static/background_vsphere.svg"
    createTitle="Add new VMware vSphere Secret"
    replaceTitle="Replace VMware vSphere Secret"
    @input="onInput">

    <template slot="data-slot">
      <v-layout column>
        <v-flex class="mt-3">
          <v-text-field
          color="indigo darken-4"
          v-model="vsphereUsername"
          ref="vsphereUsername"
          label="vSphere Username"
          :error-messages="getErrorMessages('vsphereUsername')"
          @input="$v.vsphereUsername.$touch()"
          @blur="$v.vsphereUsername.$touch()"
          ></v-text-field>
        </v-flex>
        <v-flex>
          <v-text-field
            color="indigo darken-4"
            v-model="vspherePassword"
            label="vSphere Password"
            :error-messages="getErrorMessages('vspherePassword')"
            :append-icon="hideVspherePassword ? 'visibility' : 'visibility_off'"
            :type="hideVspherePassword ? 'password' : 'text'"
            @click:append="() => (hideVspherePassword = !hideVspherePassword)"
            @input="$v.vspherePassword.$touch()"
            @blur="$v.vspherePassword.$touch()"
          ></v-text-field>
        </v-flex>
        <v-flex class="mt-3">
          <v-text-field
          color="indigo darken-4"
          v-model="nsxtUsername"
          label="NSX-T Username"
          :error-messages="getErrorMessages('nsxtUsername')"
          @input="$v.nsxtUsername.$touch()"
          @blur="$v.nsxtUsername.$touch()"
          ></v-text-field>
        </v-flex>
        <v-flex>
          <v-text-field
            color="indigo darken-4"
            v-model="nsxtPassword"
            label="NSX-T Password"
            :error-messages="getErrorMessages('nsxtPassword')"
            :append-icon="hideNsxtPassword ? 'visibility' : 'visibility_off'"
            :type="hideNsxtPassword ? 'password' : 'text'"
            @click:append="() => (hideNsxtPassword = !hideNsxtPassword)"
            @input="$v.nsxtPassword.$touch()"
            @blur="$v.nsxtPassword.$touch()"
          ></v-text-field>
        </v-flex>
      </v-layout>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/dialogs/SecretDialog'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'

const validationErrors = {
  vsphereUsername: {
    required: 'You can\'t leave this empty.'
  },
  vspherePassword: {
    required: 'You can\'t leave this empty.'
  },
  nsxtUsername: {
    required: 'You can\'t leave this empty.'
  },
  nsxtPassword: {
    required: 'You can\'t leave this empty.'
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
      vsphereUsername: undefined,
      vspherePassword: undefined,
      hideVspherePassword: true,
      nsxtUsername: undefined,
      nsxtPassword: undefined,
      hideNsxtPassword: true,
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
        vsphereUsername: this.vsphereUsername,
        vspherePassword: this.vspherePassword,
        nsxtUsername: this.nsxtUsername,
        nsxtPassword: this.nsxtPassword
      }
    },
    validators () {
      const validators = {
        vsphereUsername: {
          required
        },
        vspherePassword: {
          required
        },
        nsxtUsername: {
          required
        },
        nsxtPassword: {
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

      this.vsphereUsername = ''
      this.vspherePassword = ''
      this.nsxtUsername = ''
      this.nsxtPassword = ''

      if (!this.isCreateMode) {
        if (this.secret.data) {
          this.vsphereUsername = this.secret.data.vsphereUsername
          this.nsxtUsername = this.secret.data.nsxtUsername
        }
        setDelayedInputFocus(this, 'vsphereUsername')
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
