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
    color="vsphere-bgcolor"
    infraIcon="vsphere-white"
    backgroundSrc="/static/background_vsphere.svg"
    createTitle="Add new VMware vShpere Secret"
    replaceTitle="Replace VMware vShpere Secret"
    @input="onInput"
    @cloudProfileName="onCloudProfileNameUpdate">

    <template slot="data-slot">
      <v-layout column>
        <v-flex class="mt-3">
          <v-text-field
          color="black"
          v-model="vsphereUsername"
          :label="vsphereUsernameLabel"
          :error-messages="getErrorMessages('vsphereUsername')"
          @input="$v.username.$touch()"
          @blur="$v.username.$touch()"
          ></v-text-field>
        </v-flex>
        <v-flex>
          <v-text-field
            color="black"
            v-model="vspherePassword"
            :label="vspherePasswordLabel"
            :error-messages="getErrorMessages('vspherePassword')"
            :append-icon="hideVspherePassword ? 'visibility' : 'visibility_off'"
            :type="hideVspherePassword ? 'password' : 'text'"
            @click:append="() => (hideVspherePassword = !hideVspherePassword)"
            @input="$v.password.$touch()"
            @blur="$v.password.$touch()"
          ></v-text-field>
        </v-flex>
        <v-flex class="mt-3">
          <v-text-field
          color="black"
          v-model="nsxtUsername"
          :label="nsxtUsernameLabel"
          :error-messages="getErrorMessages('nsxtUsername')"
          @input="$v.username.$touch()"
          @blur="$v.username.$touch()"
          ></v-text-field>
        </v-flex>
        <v-flex>
          <v-text-field
            color="black"
            v-model="nsxtPassword"
            :label="nsxtPasswordLabel"
            :error-messages="getErrorMessages('nsxtPassword')"
            :append-icon="hideNsxtPassword ? 'visibility' : 'visibility_off'"
            :type="hideNsxtPassword ? 'password' : 'text'"
            @click:append="() => (hideNsxtPassword = !hideNsxtPassword)"
            @input="$v.password.$touch()"
            @blur="$v.password.$touch()"
          ></v-text-field>
        </v-flex>
      </v-layout>
    </template>

  </secret-dialog>

</template>

<script>
import { mapGetters } from 'vuex'
import SecretDialog from '@/dialogs/SecretDialog'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'
import get from 'lodash/get'

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
    ...mapGetters([
      'cloudProfileByName'
    ]),
    valid () {
      return !this.$v.$invalid
    },
    secretData () {
      return {
        vsphereUsername: undefined,
        vspherePassword: undefined,
        nsxtUsername: undefined,
        nsxtPassword: undefined
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
    },
    vsphereUsernameLabel () {
      return this.isCreateMode ? 'vSphere Username' : 'New vSphere Username'
    },
    vspherePasswordLabel () {
      return this.isCreateMode ? 'vSphere Password' : 'New vSphere Password'
    },
    nsxtUsernameLabel () {
      return this.isCreateMode ? 'NSX-T Username' : 'New NSX-T Username'
    },
    nsxtPasswordLabel () {
      return this.isCreateMode ? 'NSX-T Password' : 'New NSX-T Password'
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
