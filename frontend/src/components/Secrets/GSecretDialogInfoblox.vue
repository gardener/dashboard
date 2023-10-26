<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :data="secretData"
    :data-valid="valid"
    :secret="secret"
    vendor="infoblox-dns"
    create-title="Add new Infoblox Secret"
    replace-title="Replace Infoblox Secret"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          ref="infobloxUsername"
          v-model="infobloxUsername"
          color="primary"
          label="Infoblox Username"
          :error-messages="errors.infobloxUsername"
          variant="underlined"
          @update:model-value="v$.infobloxUsername.$touch()"
          @blur="v$.infobloxUsername.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="infobloxPassword"
          color="primary"
          label="Infoblox Password"
          :error-messages="errors.infobloxPassword"
          :append-icon="hideInfobloxPassword ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideInfobloxPassword ? 'password' : 'text'"
          variant="underlined"
          @click:append="() => (hideInfobloxPassword = !hideInfobloxPassword)"
          @update:model-value="v$.infobloxPassword.$touch()"
          @blur="v$.infobloxPassword.$touch()"
        />
      </div>
    </template>

    <template #help-slot>
      <div>
        <p>Before you can use Infoblox DNS provider, you need to add account credentials.</p>
        <p>Please enter account information for a technical user.</p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import GSecretDialog from '@/components/Secrets/GSecretDialog'

import { allWithCauserParam } from '@/utils/validators'
import {
  getVuelidateErrors,
  setDelayedInputFocus,
} from '@/utils'

export default {
  components: {
    GSecretDialog,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    secret: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      infobloxUsername: undefined,
      infobloxPassword: undefined,
      hideInfobloxPassword: true,
    }
  },
  validations () {
    return {
      infobloxUsername: allWithCauserParam('Username', {
        required,
      }),
      infobloxPassword: allWithCauserParam('Password', {
        required,
      }),
    }
  },
  computed: {
    visible: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    valid () {
      return !this.v$.$invalid
    },
    secretData () {
      return {
        USERNAME: this.infobloxUsername,
        PASSWORD: this.infobloxPassword,
      }
    },
    isCreateMode () {
      return !this.secret
    },
    errors () {
      return getVuelidateErrors(this.v$.$errors)
    },
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()
      }
    },
  },
  methods: {
    reset () {
      this.v$.$reset()

      this.infobloxUsername = ''
      this.infobloxPassword = ''

      if (!this.isCreateMode) {
        if (this.secret.data) {
          this.infobloxUsername = this.secret.data.USERNAME
        }
        setDelayedInputFocus(this, 'infobloxUsername')
      }
    },
  },
}
</script>
