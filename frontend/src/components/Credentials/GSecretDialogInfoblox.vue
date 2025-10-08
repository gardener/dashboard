<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :secret-validations="v$"
    :binding="binding"
    create-title="Add new Infoblox Secret"
    update-title="Update Infoblox Secret"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          v-model="infobloxUsername"
          color="primary"
          label="Infoblox Username"
          :error-messages="getErrorMessages(v$.infobloxUsername)"
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
          :error-messages="getErrorMessages(v$.infobloxPassword)"
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

import GSecretDialog from '@/components/Credentials/GSecretDialog'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import { withFieldName } from '@/utils/validators'
import { getErrorMessages } from '@/utils'

export default {
  components: {
    GSecretDialog,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    binding: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    const { secretStringDataRefs } = useProvideSecretContext()

    const {
      infobloxUsername,
      infobloxPassword,
    } = secretStringDataRefs({
      USERNAME: 'infobloxUsername',
      PASSWORD: 'infobloxPassword',
    })

    return {
      infobloxUsername,
      infobloxPassword,
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      hideInfobloxPassword: true,
    }
  },
  validations () {
    return {
      infobloxUsername: withFieldName('Username', {
        required,
      }),
      infobloxPassword: withFieldName('Password', {
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
    isCreateMode () {
      return !this.secret
    },
  },
  methods: {
    getErrorMessages,
  },
}
</script>
