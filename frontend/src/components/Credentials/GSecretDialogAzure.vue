<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :secret-validations="v$"
    :binding="binding"
    :provider-type="providerType"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          v-model="clientId"
          color="primary"
          label="Client Id"
          :error-messages="getErrorMessages(v$.clientId)"
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
          :error-messages="getErrorMessages(v$.clientSecret)"
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
          :error-messages="getErrorMessages(v$.tenantId)"
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
          :error-messages="getErrorMessages(v$.subscriptionId)"
          variant="underlined"
          @update:model-value="v$.subscriptionId.$touch()"
          @blur="v$.subscriptionId.$touch()"
        />
      </div>
      <div v-if="isDNSSecret">
        <v-select
          v-model="azureCloud"
          color="primary"
          item-color="primary"
          label="Azure Cloud"
          :items="['AzurePublic', 'AzureChina', 'AzureGovernment']"
          variant="underlined"
        />
      </div>
    </template>
    <template #help-slot>
      <div v-if="providerType==='azure'">
        <p>
          Before you can provision and access a Kubernetes cluster on Azure, you need to add account/subscription credentials.
          The Gardener needs the credentials of a service principal assigned to an account/subscription to provision
          and operate the Azure infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Ensure that the service principal has the permissions defined
          <g-external-link url="https://github.com/gardener/gardener-extension-provider-azure/blob/master/docs/usage/azure-permissions.md">
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
      <div v-if="isDNSSecret">
        <p>
          Follow the steps as described in the Azure documentation to
          <g-external-link url="https://docs.microsoft.com/en-us/azure/dns/dns-sdk#create-a-service-principal-account">
            create a service principal account
          </g-external-link>
          and grant the service principal account 'DNS Zone Contributor' permissions to the resource group.
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { computed } from 'vue'

import GSecretDialog from '@/components/Credentials/GSecretDialog'
import GExternalLink from '@/components/GExternalLink'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import {
  withFieldName,
  guid,
} from '@/utils/validators'
import { getErrorMessages } from '@/utils'

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
    binding: {
      type: Object,
    },
    providerType: {
      type: String,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup (props) {
    const isDNSSecret = computed(() => {
      return props.providerType === 'azure-dns' || props.providerType === 'azure-private-dns'
    })

    const { secretStringDataRefs } = useProvideSecretContext()

    const {
      clientId,
      clientSecret,
      tenantId,
      subscriptionId,
      azureCloud,
    } = secretStringDataRefs({
      clientID: 'clientId',
      clientSecret: 'clientSecret',
      tenantID: 'tenantId',
      subscriptionID: 'subscriptionId',
      AZURE_CLOUD: 'azureCloud',
    })

    return {
      clientId,
      clientSecret,
      tenantId,
      subscriptionId,
      azureCloud,
      isDNSSecret,
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      hideSecret: true,
    }
  },
  validations () {
    return {
      clientId: withFieldName('Client ID', {
        required,
        guid,
      }),
      clientSecret: withFieldName('Client Secret', {
        required,
      }),
      tenantId: withFieldName('Tenant ID', {
        required,
        guid,
      }),
      subscriptionId: withFieldName('Subscription ID', {
        required,
        guid,
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
  },
  methods: {
    getErrorMessages,
  },
}
</script>
