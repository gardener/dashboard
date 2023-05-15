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

    <template v-slot:secret-slot>
      <div>
        <v-textarea
          ref="data"
          color="primary"
          variant="filled"
          v-model="data"
          label="Secret Data"
          :error-messages="getErrorMessages('data')"
          @update:model-value="onInputSecretData"
          @blur="v$.data.$touch()"
        ></v-textarea>
      </div>
    </template>
    <template v-slot:help-slot>
      <div class="help-content">
        <p>
          This is a generic secret dialog.
        </p>
        <p>
          Please enter data required for {{vendor}}.
        </p>
      </div>
    </template>

  </g-secret-dialog>

</template>

<script>
import GSecretDialog from '@/components/Secrets/GSecretDialog'
import { defineComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'
import isObject from 'lodash/isObject'

const validationErrors = {
  data: {
    required: 'You can\'t leave this empty.',
    isYAML: 'You need to enter secret data as YAML key-value pairs',
  },
}

export default defineComponent({
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
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
    vendor: {
      type: String,
    },
  },
  emits: [
    'update:modelValue',
  ],
  data () {
    return {
      data: undefined,
      secretData: {},
      validationErrors,
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
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
    validators () {
      const validators = {
        data: {
          required,
          isYAML: () => Object.keys(this.secretData).length > 0,
        },
      }
      return validators
    },
    isCreateMode () {
      return !this.secret
    },
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    },
    async onInputSecretData () {
      this.secretData = {}

      try {
        this.secretData = await this.$yaml.load(this.data)
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
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
  },
})
</script>

<style lang="scss" scoped>

  ::v-deep .v-input__control textarea {
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
