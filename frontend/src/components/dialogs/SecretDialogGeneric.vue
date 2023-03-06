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
    :vendor="vendor"
    :create-title="`Add new ${vendor} Secret`"
    :replace-title="`Replace ${vendor} Secret`"
    @input="onInput">

    <template v-slot:secret-slot>
      <template v-if="customCloudProviderFields">
        <div v-for="{ key, label, hint, password } in customCloudProviderFields" :key="key">
          <v-text-field
            color="primary"
            v-model="customCloudProviderData[key]"
            :label="label"
            :error-messages="getErrorMessages(`customCloudProviderData.${key}`)"
            :append-icon="password ? showSecrets[key] ? 'mdi-eye' : 'mdi-eye-off' : undefined"
            :type="password && !showSecrets[key] ? 'password' : 'text'"
            @click:append="toggleShowSecrets(key)"
            @input="$v.customCloudProviderData[key].$touch()"
            @blur="$v.customCloudProviderData[key].$touch()"
            :hint="hint"
          ></v-text-field>
        </div>
      </template>
      <v-textarea
        v-else
        ref="textAreaData"
        color="primary"
        filled
        v-model="textAreaData"
        label="Secret Data"
        :error-messages="getErrorMessages('textAreaData')"
        @input="$v.textAreaData.$touch()"
        @blur="$v.textAreaData.$touch()"
      ></v-textarea>
    </template>
    <template v-slot:help-slot>
      <div v-if="helpHtml" class="markdown" v-html="helpHtml"></div>
      <div v-else>
        <p>
          This is a generic provider service account dialog.
        </p>
        <p>
          Please enter data required for this provider type.
        </p>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog'
import { requiredIf } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus, transformHtml } from '@/utils'
import isObject from 'lodash/isObject'
import forEach from 'lodash/forEach'
import get from 'lodash/get'
import { mapState } from 'vuex'
import Vue from 'vue'
const yaml = require('js-yaml')

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
      textAreaData: undefined,
      customCloudProviderData: {},
      showSecrets: {}
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    validationErrors () {
      const allValidationErrors = {
        textAreaData: {
          required: 'You can\'t leave this empty.',
          isYAML: 'You need to enter secret data as valid YAML object'
        },
        customCloudProviderData: {}
      }
      forEach(this.customCloudProviderFields, ({ key, validationErrors }) => {
        allValidationErrors.customCloudProviderData[key] = validationErrors
      })
      return allValidationErrors
    },
    validators () {
      const allValidators = {
        textAreaData: {
          required: requiredIf(() => !this.customCloudProviderFields),
          isYAML: () => this.customCloudProviderFields || isObject(this.textAreaYAML)
        },
        customCloudProviderData: {}
      }
      forEach(this.customCloudProviderFields, ({ key, validators }) => {
        const compiledValidators = {}
        forEach(validators, (validator, key) => {
          compiledValidators[key] = value => new RegExp(validator).test(value)
        })
        allValidators.customCloudProviderData[key] = compiledValidators
      })

      return allValidators
    },
    customCloudProvider () {
      return get(this.cfg, ['customCloudProviders', this.vendor])
    },
    customCloudProviderFields () {
      return this.customCloudProvider?.secret?.fields
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
    textAreaYAML () {
      try {
        return yaml.load(this.textAreaData)
      } catch (e) {
        return undefined
      }
    },
    secretData () {
      if (this.customCloudProviderFields) {
        return this.customCloudProviderData
      }
      return isObject(this.textAreaYAML) ? this.textAreaYAML : {}
    }
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    },
    reset () {
      this.$v.$reset()

      this.textAreaData = ''

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
