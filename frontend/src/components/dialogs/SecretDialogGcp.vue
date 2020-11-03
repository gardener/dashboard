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
    cloudProviderKind="gcp"
    color="green"
    infraIcon="gcp-white"
    backgroundSrc="/static/background_gcp.svg"
    createTitle="Add new Google Secret"
    replaceTitle="Replace Google Secret"
    @input="onInput">

    <template v-slot:data-slot>
      <div>
        <v-textarea
          ref="serviceAccountKey"
          color="green"
          filled
          v-model="serviceAccountKey"
          label="Service Account Key"
          :error-messages="getErrorMessages('serviceAccountKey')"
          @input="$v.serviceAccountKey.$touch()"
          @blur="$v.serviceAccountKey.$touch()"
          hint="Enter or drop a service account key in JSON format"
          persistent-hint
        ></v-textarea>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog'
import { required } from 'vuelidate/lib/validators'
import { serviceAccountKey } from '@/utils/validators'
import { handleTextFieldDrop, getValidationErrors, setDelayedInputFocus } from '@/utils'

const validationErrors = {
  serviceAccountKey: {
    required: 'You can\'t leave this empty.',
    serviceAccountKey: 'Not a valid Service Account Key'
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
      serviceAccountKey: undefined,
      validationErrors,
      dropHandlerInitialized: false
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
        'serviceaccount.json': this.serviceAccountKey
      }
    },
    validators () {
      const validators = {
        serviceAccountKey: {
          required,
          serviceAccountKey
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

      this.serviceAccountKey = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'serviceAccountKey')
      }
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    initializeDropHandlerOnce () {
      if (this.dropHandlerInitialized) {
        return
      }

      this.dropHandlerInitialized = true
      const onDrop = (value) => {
        this.serviceAccountKey = value
      }
      handleTextFieldDrop(this.$refs.serviceAccountKey, /json/, onDrop)
    }
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()

        // Mounted does not guarantee that all child components have also been mounted.
        // In addition, the serviceAccountKey ref is within a slot of a v-dialog, which is by default lazily loaded.
        // We initialize the drop handler once the dialog is shown by watching the `value`.
        // We use $nextTick to make sure the entire view has been rendered
        this.$nextTick(() => {
          this.initializeDropHandlerOnce()
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>

  ::v-deep .v-input__control textarea {
    font-family: monospace;
    font-size: 14px;
  }

</style>
