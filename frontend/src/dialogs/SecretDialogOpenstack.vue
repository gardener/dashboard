<!--
Copyright 2018 by The Gardener Authors.

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
    cloudProviderKind="openstack"
    color="orange"
    infraIcon="mdi-server-network"
    backgroundSrc="/static/background_openstack.svg"
    createTitle="Add new Openstack Secret"
    replaceTitle="Replace Openstack Secret"
    @input="onInput">

    <template slot="data-slot">
      <v-layout row>
        <v-flex xs8>
          <v-text-field
            color="blue"
            ref="domainName"
            v-model="domainName"
            label="Domain Name"
            :error-messages="getErrorMessages('domainName')"
            @input="$v.domainName.$touch()"
            @blur="$v.domainName.$touch()"
          ></v-text-field>
        </v-flex>
      </v-layout>

      <v-layout row>
        <v-flex xs8>
          <v-text-field
            color="blue"
            ref="tenantName"
            v-model="tenantName"
            label="Tenant Name"
            :error-messages="getErrorMessages('tenantName')"
            @input="$v.tenantName.$touch()"
            @blur="$v.tenantName.$touch()"
          ></v-text-field>
        </v-flex>
      </v-layout>

      <v-layout row>
        <v-flex xs8>
          <v-text-field
            color="blue"
            ref="authUrl"
            v-model="authUrl"
            label="Auth URL"
            :error-messages="getErrorMessages('authUrl')"
            @input="$v.authUrl.$touch()"
            @blur="$v.authUrl.$touch()"
          ></v-text-field>
        </v-flex>
      </v-layout>

      <v-layout row>
        <v-flex xs8>
          <v-text-field
          color="blue"
          v-model="username"
          :label="usernameLabel"
          :error-messages="getErrorMessages('username')"
          @input="$v.username.$touch()"
          @blur="$v.username.$touch()"
          ></v-text-field>
        </v-flex>
      </v-layout>

      <v-layout row>
        <v-flex xs8>
          <v-text-field
            color="blue"
            v-model="password"
            :label="passwordLabel"
            :error-messages="getErrorMessages('password')"
            :append-icon="hideSecret ? 'visibility' : 'visibility_off'"
            :append-icon-cb="() => (hideSecret = !hideSecret)"
            :type="hideSecret ? 'password' : 'text'"
            @input="$v.password.$touch()"
            @blur="$v.password.$touch()"
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
    domainName: {
      required: 'You can\'t leave this empty.'
    },
    tenantName: {
      required: 'You can\'t leave this empty.'
    },
    authUrl: {
      required: 'You can\'t leave this empty.',
      url: 'Must be a valid URL'
    },
    username: {
      required: 'You can\'t leave this empty.'
    },
    password: {
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
        domainName: undefined,
        tenantName: undefined,
        authUrl: undefined,
        username: undefined,
        password: undefined,
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
          domainName: this.domainName,
          tenantName: this.tenantName,
          authUrl: this.authUrl,
          username: this.username,
          password: this.password
        }
      },
      validators () {
        const validators = {
          domainName: {
            required
          },
          tenantName: {
            required
          },
          authUrl: {
            required,
            url
          },
          username: {
            required
          },
          password: {
            required
          }
        }
        return validators
      },
      isCreateMode () {
        return !this.secret
      },
      usernameLabel () {
        return this.isCreateMode ? 'Username' : 'New Username'
      },
      passwordLabel () {
        return this.isCreateMode ? 'Password' : 'New Password'
      }
    },
    methods: {
      onInput (value) {
        this.$emit('input', value)
      },
      reset () {
        this.$v.$reset()

        this.domainName = ''
        this.tenantName = ''
        this.authUrl = ''
        this.username = ''
        this.password = ''

        if (!this.isCreateMode) {
          if (this.secret.data) {
            this.domainName = this.secret.data.domainName
            this.tenantName = this.secret.data.tenantName
            this.authUrl = this.secret.data.authUrl
          }
          setDelayedInputFocus(this, 'domainName')
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

