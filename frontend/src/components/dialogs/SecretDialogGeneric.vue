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
      <div>
        <v-textarea
          ref="data"
          color="primary"
          filled
          v-model="data"
          label="Secret Data"
          :error-messages="getErrorMessages('data')"
          @input="$v.data.$touch()"
          @blur="$v.data.$touch()"
        ></v-textarea>
      </div>
    </template>
    <template v-slot:help-slot>
      <div class="help-content">
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
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'
import isObject from 'lodash/isObject'
const yaml = require('js-yaml')

const validationErrors = {
  data: {
    required: 'You can\'t leave this empty.',
    isYAML: 'You need to enter secret data as valid YAML object'
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
    },
    vendor: {
      type: String
    }
  },
  data () {
    return {
      data: undefined,
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
    validators () {
      const validators = {
        data: {
          required,
          isYAML: () => isObject(this.secretYAML)
        }
      }
      return validators
    },
    isCreateMode () {
      return !this.secret
    },
    secretYAML () {
      try {
        return yaml.load(this.data)
      } catch (e) {
        return undefined
      }
    },
    secretData () {
      return isObject(this.secretYAML) ? this.secretYAML : {}
    }
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    },
    reset () {
      this.$v.$reset()

      this.data = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'data')
      }
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    }
  }
}
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
