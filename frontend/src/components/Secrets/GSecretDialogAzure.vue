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
  >
    <template #secret-slot>
      <div>
        <v-text-field
          ref="clientId"
          v-model="clientId"
          color="primary"
          label="Client Id"
          :error-messages="getErrorMessages('clientId')"
          variant="underlined"
          @update:model-value="v$.clientId.$touch()"
          @blur="v$.clientId.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="clientSecret"
          color="primary"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          label="Client Secret"
          :error-messages="getErrorMessages('clientSecret')"
          variant="underlined"
          @click:append="() => (hideSecret = !hideSecret)"
          @update:model-value="v$.clientSecret.$touch()"
          @blur="v$.clientSecret.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="tenantId"
          color="primary"
          label="Tenant Id"
          :error-messages="getErrorMessages('tenantId')"
          variant="underlined"
          @update:model-value="v$.tenantId.$touch()"
          @blur="v$.tenantId.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="subscriptionId"
          color="primary"
          label="Subscription Id"
          :error-messages="getErrorMessages('subscriptionId')"
          variant="underlined"
          @update:model-value="v$.subscriptionId.$touch()"
          @blur="v$.subscriptionId.$touch()"
        />
      </div>
    </template>
    <template #help-slot>
      <div v-if="vendor==='azure'">
        <p>
          Before you can provision and access a Kubernetes cluster on Azure, you need to add account/subscription credentials.
          The Gardener needs the credentials of a service principal assigned to an account/subscription to provision
          and operate the Azure infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Ensure that the service principal has the permissions defined
          <g-external-link url="https://github.com/gardener/gardener-extension-provider-azure/blob/master/docs/azure-permissions.md">
            here
          </g-external-link> within your subscription assigned.
          If no fine-grained permissions are required then assign the <strong>Contributor</strong> role.
        </p>
        <p>
          Read the
          <g-external-link url="https://docs.microsoft.com/azure/active-directory/role-based-access-control-configure">
            IAM Console help section
          </g-external-link> on how to manage your credentials and subscriptions.
        </p>
      </div>
      <div v-if="vendor==='azure-dns' || vendor==='azure-private-dns'">
        <p>
          Follow the steps as described in the Azure documentation to <g-external-link url="https://docs.microsoft.com/en-us/azure/dns/dns-sdk#create-a-service-principal-account">
            create a service principal account
          </g-external-link> and grant the service principal account 'DNS Zone Contributor' permissions to the resource group.
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import GSecretDialog from '@/components/Secrets/GSecretDialog'
import GExternalLink from '@/components/GExternalLink'

import {
  getValidationErrors,
  setDelayedInputFocus,
} from '@/utils'

const validationErrors = {
  clientId: {
    required: 'You can\'t leave this empty.',
  },
  clientSecret: {
    required: 'You can\'t leave this empty.',
  },
  tenantId: {
    required: 'You can\'t leave this empty.',
  },
  subscriptionId: {
    required: 'You can\'t leave this empty.',
  },
}

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
    vendor: {
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
      clientId: undefined,
      clientSecret: undefined,
      tenantId: undefined,
      subscriptionId: undefined,
      hideSecret: true,
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
    secretData () {
      return {
        clientID: this.clientId,
        clientSecret: this.clientSecret,
        subscriptionID: this.subscriptionId,
        tenantID: this.tenantId,
      }
    },
    validators () {
      const validators = {
        clientId: {
          required,
        },
        clientSecret: {
          required,
        },
        tenantId: {
          required,
        },
        subscriptionId: {
          required,
        },
      }
      return validators
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
    },
  },
}
</script>
