<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :data="secretData"
    :secret-validations="v$"
    :secret="secret"
    vendor="hcloud"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          ref="hcloudToken"
          v-model="hcloudToken"
          color="primary"
          label="Hetzner Cloud Token"
          :error-messages="getErrorMessages(v$.hcloudToken)"
          variant="underlined"
          @update:model-value="v$.hcloudToken.$touch()"
          @blur="v$.hcloudToken.$touch()"
        />
      </div>
    </template>

    <template #help-slot>
      <div>
        <p>
          Before you can provision and access a Kubernetes cluster on Hetzner Cloud, you need to add a Hetzner Cloud token.
          The Gardener needs these credentials to provision and operate Hetzner Cloud infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Please read the
          <g-external-link
            url="https://www.hetzner.com/cloud"
          >
            Hetzner Cloud Documentation
          </g-external-link>.
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import GSecretDialog from '@/components/Secrets/GSecretDialog'
import GExternalLink from '@/components/GExternalLink.vue'

import { withFieldName } from '@/utils/validators'
import {
  getErrorMessages,
  setDelayedInputFocus,
} from '@/utils'

export default {
  components: {
    GSecretDialog,
    GExternalLink,
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
      hcloudToken: undefined,
      hideHcloudToken: true,
    }
  },
  validations () {
    return {
      hcloudToken: withFieldName('Cloud Token', {
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
        hcloudToken: this.hcloudToken,
      }
    },
    isCreateMode () {
      return !this.secret
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

      this.hcloudToken = ''

      if (!this.isCreateMode) {
        if (this.secret.data) {
          this.hcloudToken = this.secret.data.hcloudToken
        }
        setDelayedInputFocus(this, 'hcloudToken')
      }
    },
    getErrorMessages,
  },
}
</script>
