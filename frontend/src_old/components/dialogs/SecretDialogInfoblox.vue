<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <secret-dialog
    :value=value
    :data="secretData"
    :data-valid="valid"
    :secret="secret"
    vendor="infoblox-dns"
    create-title="Add new Infoblox Secret"
    replace-title="Replace Infoblox Secret"
    @input="onInput">

    <template v-slot:secret-slot>
      <div>
        <v-text-field
        color="primary"
        v-model="infobloxUsername"
        ref="infobloxUsername"
        label="Infoblox Username"
        :error-messages="getErrorMessages('infobloxUsername')"
        @update:model-value="$v.infobloxUsername.$touch()"
        @blur="$v.infobloxUsername.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="primary"
          v-model="infobloxPassword"
          label="Infoblox Password"
          :error-messages="getErrorMessages('infobloxPassword')"
          :append-icon="hideInfobloxPassword ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideInfobloxPassword ? 'password' : 'text'"
          @click:append="() => (hideInfobloxPassword = !hideInfobloxPassword)"
          @update:model-value="$v.infobloxPassword.$touch()"
          @blur="$v.infobloxPassword.$touch()"
        ></v-text-field>
      </div>
    </template>

    <template v-slot:help-slot>
      <div>
        <p>Before you can use Infoblox DNS provider, you need to add account credentials.</p>
        <p>Please enter account information for a technical user.</p>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog.vue'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'

const validationErrors = {
  infobloxUsername: {
    required: 'You can\'t leave this empty.'
  },
  infobloxPassword: {
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
      infobloxUsername: undefined,
      infobloxPassword: undefined,
      hideInfobloxPassword: true,
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
        USERNAME: this.infobloxUsername,
        PASSWORD: this.infobloxPassword
      }
    },
    validators () {
      const validators = {
        infobloxUsername: {
          required
        },
        infobloxPassword: {
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

      this.infobloxUsername = ''
      this.infobloxPassword = ''

      if (!this.isCreateMode) {
        if (this.secret.data) {
          this.infobloxUsername = this.secret.data.USERNAME
        }
        setDelayedInputFocus(this, 'infobloxUsername')
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
