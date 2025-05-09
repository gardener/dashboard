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
    :create-title="`Add new ${name} Secret`"
    :update-title="`Update ${name} Secret`"
  >
    <template #secret-slot>
      <div v-if="providerType==='openstack-designate'">
        <v-text-field
          v-model="authURL"
          color="primary"
          label="Auth URL"
          :error-messages="getErrorMessages(v$.authURL)"
          variant="underlined"
          @update:model-value="v$.authURL.$touch()"
          @blur="v$.authURL.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="domainName"
          color="primary"
          label="Domain Name"
          :error-messages="getErrorMessages(v$.domainName)"
          variant="underlined"
          @update:model-value="v$.domainName.$touch()"
          @blur="v$.domainName.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="tenantName"
          color="primary"
          label="Project / Tenant Name"
          :error-messages="getErrorMessages(v$.tenantName)"
          variant="underlined"
          @update:model-value="v$.tenantName.$touch()"
          @blur="v$.tenantName.$touch()"
        />
      </div>
      <div>
        <v-radio-group
          v-model="authenticationMethod"
          row
        >
          <template #label>
            <span class="text-body-1">Authentication Method:</span>
          </template>
          <v-radio
            label="Technical User"
            value="USER"
          />
          <v-radio
            label="Application Credentials"
            value="APPLICATION_CREDENTIALS"
          />
        </v-radio-group>
      </div>
      <v-container class="py-0">
        <template v-if="authenticationMethod === 'APPLICATION_CREDENTIALS'">
          <div>
            <v-text-field
              v-model="applicationCredentialID"
              color="primary"
              label="ID"
              :error-messages="getErrorMessages(v$.applicationCredentialID)"
              variant="underlined"
              @update:model-value="v$.applicationCredentialID.$touch()"
              @blur="v$.applicationCredentialID.$touch()"
            />
          </div>
          <div>
            <v-text-field
              v-model="applicationCredentialName"
              color="primary"
              label="Name"
              :error-messages="getErrorMessages(v$.applicationCredentialName)"
              variant="underlined"
              @update:model-value="v$.applicationCredentialName.$touch()"
              @blur="v$.applicationCredentialName.$touch()"
            />
          </div>
          <div>
            <v-text-field
              v-model="applicationCredentialSecret"
              color="primary"
              label="Password"
              :error-messages="getErrorMessages(v$.applicationCredentialSecret)"
              :append-icon="hideApplicationCredentialSecret ? 'mdi-eye' : 'mdi-eye-off'"
              :type="hideApplicationCredentialSecret ? 'password' : 'text'"
              variant="underlined"
              @click:append="() => (hideApplicationCredentialSecret = !hideApplicationCredentialSecret)"
              @update:model-value="v$.applicationCredentialSecret.$touch()"
              @blur="v$.applicationCredentialSecret.$touch()"
            />
          </div>
        </template>
        <template v-else>
          <div>
            <v-text-field
              v-model="username"
              v-messages-color="{ color: 'primary' }"
              color="primary"
              label="Technical User"
              :error-messages="getErrorMessages(v$.username)"
              hint="Do not use personalized login credentials. Instead, use credentials of a technical user"
              variant="underlined"
              @update:model-value="v$.username.$touch()"
              @blur="v$.username.$touch()"
            />
          </div>
          <div>
            <v-text-field
              v-model="password"
              v-messages-color="{ color: 'warning' }"
              color="primary"
              label="Password"
              :error-messages="getErrorMessages(v$.password)"
              :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
              :type="hideSecret ? 'password' : 'text'"
              hint="Do not use personalized login credentials. Instead, use credentials of a technical user"
              variant="underlined"
              @click:append="() => (hideSecret = !hideSecret)"
              @update:model-value="v$.password.$touch()"
              @blur="v$.password.$touch()"
            />
          </div>
        </template>
      </v-container>
    </template>

    <template #help-slot>
      <div v-if="providerType==='openstack'">
        <p>
          Before you can provision and access a Kubernetes cluster on OpenStack, you need to add account credentials.
          The Gardener needs the credentials to provision and operate the OpenStack infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Ensure that the user has privileges to <strong>create, modify and delete VMs</strong>.
        </p>
      </div>
      <div v-if="providerType==='openstack-designate'">
        <p>Make sure that you configure your account for DNS usage.</p>
        <p>Required Roles: dns_viewer, dns_webmaster</p>
      </div>
      <p>
        Read the
        <g-external-link url="https://docs.openstack.org/horizon/latest/admin/admin-manage-roles.html">
          OpenStack help section
        </g-external-link> on how to create and manage roles.
      </p>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  requiredIf,
} from '@vuelidate/validators'

import GSecretDialog from '@/components/Credentials/GSecretDialog'
import GExternalLink from '@/components/GExternalLink'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import {
  withMessage,
  withFieldName,
} from '@/utils/validators'
import {
  getErrorMessages,
  setDelayedInputFocus,
} from '@/utils'

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
  setup () {
    const { secretStringDataRefs } = useProvideSecretContext()

    const {
      domainName,
      tenantName,
      applicationCredentialID,
      applicationCredentialName,
      applicationCredentialSecret,
      username,
      password,
      authURL,
    } = secretStringDataRefs({
      domainName: 'domainName',
      tenantName: 'tenantName',
      applicationCredentialID: 'applicationCredentialID',
      applicationCredentialName: 'applicationCredentialName',
      applicationCredentialSecret: 'applicationCredentialSecret',
      username: 'username',
      password: 'password',
      authURL: 'authURL',
    })

    return {
      domainName,
      tenantName,
      applicationCredentialID,
      applicationCredentialName,
      applicationCredentialSecret,
      username,
      password,
      authURL,
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      hideSecret: true,
      hideApplicationCredentialSecret: true,
      authenticationMethod: 'USER',
    }
  },
  validations () {
    const requiredUserMessage = 'Required for technical user authentication'
    const requiredApplicationCredentialsMessage = 'Required for application credentials authentication'

    const rules = {}

    rules.domainName = withFieldName('Domain Name', {
      required,
    })

    rules.tenantName = withFieldName('Project / Tenant Name', {
      required,
    })

    const usernameRules = {
      required: withMessage(requiredUserMessage,
        requiredIf(() => this.authenticationMethod === 'USER'),
      ),
    }
    rules.username = withFieldName('Technical User', usernameRules)

    const passwordRules = {
      required: withMessage(requiredUserMessage,
        requiredIf(() => this.authenticationMethod === 'USER'),
      ),
    }
    rules.password = withFieldName('Password', passwordRules)

    const authURLRules = {
      required: requiredIf(() => this.providerType === 'openstack-designate'),
    }
    rules.authURL = withFieldName('Auth URL', authURLRules)

    const applicationCredentialIDRules = {
      required: withMessage(requiredApplicationCredentialsMessage,
        requiredIf(() => this.authenticationMethod === 'APPLICATION_CREDENTIALS'),
      ),
    }
    rules.applicationCredentialID = withFieldName('Application Credentials ID', applicationCredentialIDRules)

    const applicationCredentialNameRules = {
      required: withMessage(requiredApplicationCredentialsMessage,
        requiredIf(() => this.authenticationMethod === 'APPLICATION_CREDENTIALS'),
      ),
    }
    rules.applicationCredentialName = withFieldName('Application Credentials Name', applicationCredentialNameRules)

    const applicationCredentialSecretRules = {
      required: withMessage(requiredApplicationCredentialsMessage,
        requiredIf(() => this.authenticationMethod === 'APPLICATION_CREDENTIALS'),
      ),
    }
    rules.applicationCredentialSecret = withFieldName('Application Credentials Secret', applicationCredentialSecretRules)

    return rules
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
    name () {
      if (this.providerType === 'openstack') {
        return 'OpenStack'
      }
      if (this.providerType === 'openstack-designate') {
        return 'OpenStack Designate'
      }
      return undefined
    },
  },
  watch: {
    authenticationMethod () {
      this.username = undefined
      this.password = undefined
      this.applicationCredentialID = undefined
      this.applicationCredentialName = undefined
      this.applicationCredentialSecret = undefined
      this.v$.$reset()
    },
  },
  methods: {
    reset () {
      this.v$.$reset()

      this.domainName = ''
      this.tenantName = ''
      this.username = ''
      this.password = ''
      this.authURL = ''
      this.applicationCredentialID = ''
      this.applicationCredentialName = ''
      this.applicationCredentialSecret = ''

      if (!this.isCreateMode) {
        if (this.secret.data) {
          this.domainName = this.secret.data.domainName
          this.tenantName = this.secret.data.tenantName
        }
        setDelayedInputFocus(this, 'domainName')
      }
    },
    getErrorMessages,
  },
}
</script>
