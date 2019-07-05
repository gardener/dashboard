<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

 <template>
  <secret-dialog
    :value=value
    :data="secretData"
    :dataValid="valid"
    :secret="secret"
    cloudProviderKind="azure"
    color="blue"
    infraIcon="azure-white"
    backgroundSrc="/static/background_azure.svg"
    createTitle="Add new Azure Secret"
    replaceTitle="Replace Azure Secret"
    @input="onInput">

    <template slot="data-slot">
      <v-layout column>
        <v-flex>
          <v-text-field
            color="blue"
            ref="clientId"
            v-model="clientId"
            :label="clientIdLabel"
            :error-messages="getErrorMessages('clientId')"
            @input="$v.clientId.$touch()"
            @blur="$v.clientId.$touch()"
          ></v-text-field>
        </v-flex>
        <v-flex>
          <v-text-field
            color="blue"
            v-model="clientSecret"
            :append-icon="hideSecret ? 'visibility' : 'visibility_off'"
            :type="hideSecret ? 'password' : 'text'"
            :label="clientSecretLabel"
            :error-messages="getErrorMessages('clientSecret')"
            @click:append="() => (hideSecret = !hideSecret)"
            @input="$v.clientSecret.$touch()"
            @blur="$v.clientSecret.$touch()"
          ></v-text-field>
        </v-flex>
        <v-flex>
          <v-text-field
            color="blue"
            v-model="tenantId"
            :label="tenantIdLabel"
            :error-messages="getErrorMessages('tenantId')"
            @input="$v.tenantId.$touch()"
            @blur="$v.tenantId.$touch()"
          ></v-text-field>
        </v-flex>
        <v-flex>
          <v-text-field
            color="blue"
            v-model="subscriptionId"
            :label="subscriptionIdLabel"
            :error-messages="getErrorMessages('subscriptionId')"
            @input="$v.subscriptionId.$touch()"
            @blur="$v.subscriptionId.$touch()"
          ></v-text-field>
        </v-flex>
      </v-layout>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/dialogs/SecretDialog'
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
    },
    clientIdLabel () {
      return this.isCreateMode ? 'Client Id' : 'New Client Id'
    },
    clientSecretLabel () {
      return this.isCreateMode ? 'Client Secret' : 'New Client Secret'
    },
    tenantIdLabel () {
      return this.isCreateMode ? 'Tenant Id' : 'New Tenant Id'
    },
    subscriptionIdLabel () {
      return this.isCreateMode ? 'Subscription Id' : 'New Subscription Id'
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
