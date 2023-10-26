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
    :vendor="vendor"
    :create-title="`Add new ${vendor} Secret`"
    :replace-title="`Replace ${vendor} Secret`"
  >
    <template #secret-slot>
      <div>
        <v-textarea
          ref="data"
          v-model="data"
          color="primary"
          variant="filled"
          label="Secret Data"
          :error-messages="errors.data"
          @update:model-value="onInputSecretData"
          @blur="v$.data.$touch()"
        />
      </div>
    </template>
    <template #help-slot>
      <div class="help-content">
        <p>
          This is a generic secret dialog.
        </p>
        <p>
          Please enter data required for {{ vendor }}.
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import GSecretDialog from '@/components/Secrets/GSecretDialog'

import {
  allWithCauserParam,
  withMessage,
} from '@/utils/validators'
import {
  getVuelidateErrors,
  setDelayedInputFocus,
} from '@/utils'

import { isObject } from '@/lodash'

export default {
  components: {
    GSecretDialog,
  },
  inject: ['yaml'],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    secret: {
      type: Object,
    },
    vendor: {
      type: String,
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
      data: undefined,
      secretData: {},
    }
  },
  validations () {
    return {
      data: allWithCauserParam('Secret Data', {
        required,
        isYAML: withMessage('You need to enter secret data as YAML key - value pairs', () => Object.keys(this.secretData).length > 0),
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
    errors () {
      return getVuelidateErrors(this.v$.$errors)
    },
  },
  methods: {
    async onInputSecretData () {
      this.secretData = {}

      try {
        this.secretData = await this.yaml.load(this.data)
      } catch (err) {
        /* ignore errors */
      } finally {
        if (!isObject(this.secretData)) {
          this.secretData = {}
        }
      }

      this.v$.data.$touch()
    },
    reset () {
      this.v$.$reset()

      this.data = ''
      this.secretData = {}

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'data')
      }
    },
  },
}
</script>

<style lang="scss" scoped>

  :deep(.v-input__control textarea) {
    font-family: monospace;
    font-size: 14px;
  }

  .help-content {
    ul {
      margin-top: 20px;
      margin-bottom: 20px;
      list-style-type: none;
      border-left: 4px solid #318334 !important;
      margin-left: 20px;
      padding-left: 24px;
      li {
        font-weight: 300;
        font-size: 16px;
      }
    }
  }

</style>
