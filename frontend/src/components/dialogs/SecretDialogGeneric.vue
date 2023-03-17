<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

 <template>
  <secret-dialog
    :value=value
    :data="secretData"
    :data-valid="valid"
    :secret="secret"
    :vendor="vendor"
    :create-title="`Add new ${vendor} Secret`"
    :replace-title="`Replace ${vendor} Secret`"
    @input="onInput">

    <template v-slot:secret-slot>
      <template v-if="customCloudProviderFields">
        <div v-for="{ key, label, hint, type } in customCloudProviderFields" :key="key">
          <v-text-field
            v-if="type === 'text' || type === 'password'"
            color="primary"
            v-model="customCloudProviderData[key]"
            :label="label"
            :error-messages="getErrorMessages(`customCloudProviderData.${key}`)"
            :append-icon="type === 'password' ? showSecrets[key] ? 'mdi-eye' : 'mdi-eye-off' : undefined"
            :type="type === 'password' && !showSecrets[key] ? 'password' : 'text'"
            @click:append="toggleShowSecrets(key)"
            @input="$v.customCloudProviderData[key].$touch()"
            @blur="$v.customCloudProviderData[key].$touch()"
            :hint="hint"
          ></v-text-field>
          <v-textarea
            v-if="type === 'yaml' || type === 'json'"
            color="primary"
            filled
            v-model="customCloudProviderData[key]"
            :label="label"
            :error-messages="getErrorMessages(`customCloudProviderData.${key}`)"
            @input="onInputTextarea(key, type)"
            @blur="$v.customCloudProviderData[key].$touch()"
            :hint="hint"
          ></v-textarea>
        </div>
      </template>
    </template>
    <template v-slot:help-slot>
      <div v-if="helpHtml" class="markdown" v-html="helpHtml"></div>
      <div v-else>
        <p>
          This is a generic provider service account dialog.
        </p>
        <p>
          Please enter data required for {{ vendor }}.
        </p>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog'
import { required, requiredIf } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus, transformHtml } from '@/utils'
import isObject from 'lodash/isObject'
import forEach from 'lodash/forEach'
import get from 'lodash/get'
import every from 'lodash/every'
import map from 'lodash/map'
import isEmpty from 'lodash/isEmpty'
import fromPairs from 'lodash/fromPairs'
import { mapState } from 'vuex'
import Vue from 'vue'

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
    },
    vendor: {
      type: String
    }
  },
  data () {
    return {
      customCloudProviderData: {},
      customCloudProviderParsedData: {},
      showSecrets: {}
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    validationErrors () {
      const allValidationErrors = {
        customCloudProviderData: {}
      }
      forEach(this.customCloudProviderFields, ({ key, validationErrors }) => {
        allValidationErrors.customCloudProviderData[key] = validationErrors
      })
      return allValidationErrors
    },
    validators () {
      const allValidators = {
        customCloudProviderData: {}
      }
      forEach(this.customCloudProviderFields, ({ key, validators }) => {
        const compiledValidators = {}
        forEach(validators, (validator, validatorName) => {
          switch (validator.type) {
            case 'required':
              compiledValidators[validatorName] = required
              break
            case 'requiredIf':
              compiledValidators[validatorName] = requiredIf(() => !every(map(validator.not, fieldKey => this.customCloudProviderData[fieldKey])))
              break
            case 'isValidObject':
              compiledValidators[validatorName] = () => isEmpty(this.customCloudProviderData[key]) || Object.keys(this.customCloudProviderParsedData[key]).length > 0
              break
            case 'regex':
              compiledValidators[validatorName] = value => !value || new RegExp(validator.value).test(value)
          }
        })
        allValidators.customCloudProviderData[key] = compiledValidators
      })

      return allValidators
    },
    customCloudProvider () {
      return get(this.cfg, ['customCloudProviders', this.vendor])
    },
    customCloudProviderFields () {
      const configuredFields = this.customCloudProvider?.secret?.fields
      if (configuredFields) {
        return configuredFields
      }
      return [
        {
          key: 'secret',
          label: 'Secret Data',
          hint: 'Provide secret data as YAML key-value pairs',
          type: 'yaml',
          validators: {
            required: {
              type: 'required'
            },
            isYAML: {
              type: 'isValidObject'
            }
          },
          validationErrors: {
            required: 'You can\'t leave this empty',
            isYAML: 'You need to enter secret data as YAML key-value pairs'
          }
        }
      ]
    },
    helpHtml () {
      return transformHtml(this.customCloudProvider?.secret?.help)
    },
    valid () {
      return !this.$v.$invalid
    },
    isCreateMode () {
      return !this.secret
    },
    secretData () {
      const data = fromPairs(map(this.customCloudProviderFields, ({ key, type }) => {
        if (type === 'json' || type === 'yaml') {
          return [key, this.customCloudProviderParsedData[key]]
        }
        return [key, this.customCloudProviderData[key]]
      }))

      return data
    }
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    },
    async onInputTextarea (key, type) {
      Vue.set(this.customCloudProviderParsedData, key, {})
      try {
        if (type === 'yaml') {
          this.customCloudProviderParsedData[key] = await this.$yaml.load(this.customCloudProviderData[key])
        } else if (type === 'json') {
          this.customCloudProviderParsedData[key] = JSON.parse(this.customCloudProviderData[key])
        }
      } catch (err) {
        /* ignore errors */
      } finally {
        if (!isObject(this.customCloudProviderParsedData[key])) {
          this.customCloudProviderParsedData[key] = {}
        }
      }
      this.$v.customCloudProviderData[key].$touch()
    },
    reset () {
      this.$v.$reset()

      this.customCloudProviderParsedData = {}
      this.customCloudProviderData = {}
      this.showSecrets = {}

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'textAreaData')
      }
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    toggleShowSecrets (key) {
      Vue.set(this.showSecrets, key, !this.showSecrets[key])
    }
  }
}
</script>

<style lang="scss" scoped>
.markdown {
  ::v-deep > p {
    margin: 0px;
  }
}
</style>
