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
    cloudProviderKind="azure"
    color="blue darken-1"
    infraIcon="azure-white"
    backgroundSrc="/static/background_azure.svg"
    createTitle="Add new Azure Secret"
    replaceTitle="Replace Azure Secret"
    @input="onInput">

    <template v-slot:data-slot>
      <div>
        <v-text-field
          color="blue darken-1"
          v-model="clientId"
          ref="clientId"
          label="Client Id"
          :error-messages="getErrorMessages('clientId')"
          @input="$v.clientId.$touch()"
          @blur="$v.clientId.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="blue darken-1"
          v-model="clientSecret"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          label="Client Secret"
          :error-messages="getErrorMessages('clientSecret')"
          @click:append="() => (hideSecret = !hideSecret)"
          @input="$v.clientSecret.$touch()"
          @blur="$v.clientSecret.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="blue darken-1"
          v-model="tenantId"
          label="Tenant Id"
          :error-messages="getErrorMessages('tenantId')"
          @input="$v.tenantId.$touch()"
          @blur="$v.tenantId.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="blue darken-1"
          v-model="subscriptionId"
          label="Subscription Id"
          :error-messages="getErrorMessages('subscriptionId')"
          @input="$v.subscriptionId.$touch()"
          @blur="$v.subscriptionId.$touch()"
        ></v-text-field>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'
import { required } from 'vuelidate/lib/validators'

const validationErrors = {
  clientId: {
    required: 'You can\'t leave this empty.'
  },
  clientSecret: {
    required: 'You can\'t leave this empty.'
  },
  tenantId: {
    required: 'You can\'t leave this empty.'
  },
  subscriptionId: {
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
      clientId: undefined,
      clientSecret: undefined,
      tenantId: undefined,
      subscriptionId: undefined,
      hideSecret: true,
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
        clientID: this.clientId,
        clientSecret: this.clientSecret,
        subscriptionID: this.subscriptionId,
        tenantID: this.tenantId
      }
    },
    validators () {
      const validators = {
        clientId: {
          required
        },
        clientSecret: {
          required
        },
        tenantId: {
          required
        },
        subscriptionId: {
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

      this.clientId = ''
      this.clientSecret = ''
      this.subscriptionId = ''
      this.tenantId = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'clientId')
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
