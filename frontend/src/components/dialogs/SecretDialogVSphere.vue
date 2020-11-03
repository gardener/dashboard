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
    cloudProviderKind="vsphere"
    color="indigo darken-4"
    infraIcon="vsphere-white"
    backgroundSrc="/static/background_vsphere.svg"
    createTitle="Add new VMware vSphere Secret"
    replaceTitle="Replace VMware vSphere Secret"
    @input="onInput">

    <template v-slot:data-slot>
      <div>
        <v-text-field
        color="indigo darken-4"
        v-model="vsphereUsername"
        ref="vsphereUsername"
        label="vSphere Username"
        :error-messages="getErrorMessages('vsphereUsername')"
        @input="$v.vsphereUsername.$touch()"
        @blur="$v.vsphereUsername.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="indigo darken-4"
          v-model="vspherePassword"
          label="vSphere Password"
          :error-messages="getErrorMessages('vspherePassword')"
          :append-icon="hideVspherePassword ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideVspherePassword ? 'password' : 'text'"
          @click:append="() => (hideVspherePassword = !hideVspherePassword)"
          @input="$v.vspherePassword.$touch()"
          @blur="$v.vspherePassword.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
        color="indigo darken-4"
        v-model="nsxtUsername"
        label="NSX-T Username"
        :error-messages="getErrorMessages('nsxtUsername')"
        @input="$v.nsxtUsername.$touch()"
        @blur="$v.nsxtUsername.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="indigo darken-4"
          v-model="nsxtPassword"
          label="NSX-T Password"
          :error-messages="getErrorMessages('nsxtPassword')"
          :append-icon="hideNsxtPassword ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideNsxtPassword ? 'password' : 'text'"
          @click:append="() => (hideNsxtPassword = !hideNsxtPassword)"
          @input="$v.nsxtPassword.$touch()"
          @blur="$v.nsxtPassword.$touch()"
        ></v-text-field>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog'
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
