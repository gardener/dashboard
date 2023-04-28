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
    :create-title="`Add new ${name} Secret`"
    :replace-title="`Replace ${name} Secret`"
    @input="onInput">

    <template v-slot:secret-slot>
      <div>
        <v-text-field
          color="primary"
          v-model="clientId"
          ref="clientId"
          label="Client Id"
          :error-messages="getErrorMessages('clientId')"
          @update:model-value="$v.clientId.$touch()"
          @blur="$v.clientId.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="primary"
          v-model="clientSecret"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          label="Client Secret"
          :error-messages="getErrorMessages('clientSecret')"
          @click:append="() => (hideSecret = !hideSecret)"
          @update:model-value="$v.clientSecret.$touch()"
          @blur="$v.clientSecret.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="primary"
          v-model="tenantId"
          label="Tenant Id"
          :error-messages="getErrorMessages('tenantId')"
          @update:model-value="$v.tenantId.$touch()"
          @blur="$v.tenantId.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="primary"
          v-model="subscriptionId"
          label="Subscription Id"
          :error-messages="getErrorMessages('subscriptionId')"
          @update:model-value="$v.subscriptionId.$touch()"
          @blur="$v.subscriptionId.$touch()"
        ></v-text-field>
      </div>
    </template>
    <template v-slot:help-slot>
      <div v-if="vendor==='azure'">
        <p>
          Before you can provision and access a Kubernetes cluster on Azure, you need to add account/subscription credentials.
          The Gardener needs the credentials of a service principal assigned to an account/subscription to provision
          and operate the Azure infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Ensure that the service principal has the permissions defined
          <external-link url="https://github.com/gardener/gardener-extension-provider-azure/blob/master/docs/azure-permissions.md">
          here</external-link> within your subscription assigned.
          If no fine-grained permissions are required then assign the <strong>Contributor</strong> role.
        </p>
        <p>
          Read the
          <external-link url="https://docs.microsoft.com/azure/active-directory/role-based-access-control-configure">
          IAM Console help section</external-link> on how to manage your credentials and subscriptions.
        </p>
      </div>
      <div v-if="vendor==='azure-dns' || vendor==='azure-private-dns'">
        <p>Follow the steps as described in the Azure documentation to <external-link url="https://docs.microsoft.com/en-us/azure/dns/dns-sdk#create-a-service-principal-account">create a service principal account</external-link> and grant the service principal account 'DNS Zone Contributor' permissions to the resource group.</p>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog.vue'
import ExternalLink from '@/components/ExternalLink.vue'
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
    SecretDialog,
    ExternalLink
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
    name () {
      if (this.vendor === 'azure') {
        return 'Azure'
      }
      if (this.vendor === 'azure-dns') {
        return 'Azure DNS'
      }
      if (this.vendor === 'azure-private-dns') {
        return 'Azure Private DNS'
      }
      return undefined
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
