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
    cloudProviderKind="openstack"
    color="black"
    infraIcon="openstack-white"
    backgroundSrc="/static/background_openstack.svg"
    createTitle="Add new OpenStack Secret"
    replaceTitle="Replace OpenStack Secret"
    @input="onInput">

    <template v-slot:data-slot>
      <div>
        <v-text-field
          color="black"
          v-model="domainName"
          ref="domainName"
          label="Domain Name"
          :error-messages="getErrorMessages('domainName')"
          @input="$v.domainName.$touch()"
          @blur="$v.domainName.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="black"
          v-model="tenantName"
          label="Project / Tenant Name"
          :error-messages="getErrorMessages('tenantName')"
          @input="$v.tenantName.$touch()"
          @blur="$v.tenantName.$touch()"
        ></v-text-field>
      </div>
      <div>
        <hint-colorizer hintColor="orange">
          <v-text-field
          color="black"
          v-model="username"
          label="Technical User"
          :error-messages="getErrorMessages('username')"
          @input="$v.username.$touch()"
          @blur="$v.username.$touch()"
          hint="Do not use personalized login credentials. Instead, use credentials of a technical user"
          ></v-text-field>
        </hint-colorizer>
      </div>
      <div>
        <hint-colorizer hintColor="orange">
          <v-text-field
            color="black"
            v-model="password"
            label="Password"
            :error-messages="getErrorMessages('password')"
            :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
            :type="hideSecret ? 'password' : 'text'"
            @click:append="() => (hideSecret = !hideSecret)"
            @input="$v.password.$touch()"
            @blur="$v.password.$touch()"
            hint="Do not use personalized login credentials. Instead, use credentials of a technical user"
          ></v-text-field>
        </hint-colorizer>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import { mapGetters } from 'vuex'
import SecretDialog from '@/components/dialogs/SecretDialog'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'
import HintColorizer from '@/components/HintColorizer'

const validationErrors = {
  domainName: {
    required: 'You can\'t leave this empty.'
  },
  tenantName: {
    required: 'You can\'t leave this empty.'
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
    SecretDialog,
    HintColorizer
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
    ...mapGetters([
      'cloudProfileByName'
    ]),
    valid () {
      return !this.$v.$invalid
    },
    secretData () {
      return {
        domainName: this.domainName,
        tenantName: this.tenantName,
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
      this.username = ''
      this.password = ''

      if (!this.isCreateMode) {
        if (this.secret.data) {
          this.domainName = this.secret.data.domainName
          this.tenantName = this.secret.data.tenantName
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
