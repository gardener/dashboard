<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :data="secretData"
    :secret-validations="v$"
    :secret="secret"
    :vendor="vendor"
    :create-title="`Add new ${name} Secret`"
    :replace-title="`Replace ${name} Secret`"
  >
    <template #secret-slot>
      <div v-if="vendor==='openstack-designate'">
        <v-text-field
          v-model="authURL"
          color="primary"
          label="Auth URL"
          :error-messages="errors.authURL"
          variant="underlined"
          @update:model-value="v$.authURL.$touch()"
          @blur="v$.authURL.$touch()"
        />
      </div>
      <div>
        <v-text-field
          ref="domainName"
          v-model="domainName"
          color="primary"
          label="Domain Name"
          :error-messages="errors.domainName"
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
          :error-messages="errors.tenantName"
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
              :error-messages="errors.applicationCredentialID"
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
              :error-messages="errors.applicationCredentialName"
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
              :error-messages="errors.applicationCredentialSecret"
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
              :error-messages="errors.username"
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
              :error-messages="errors.password"
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
      <div v-if="vendor==='openstack'">
        <p>
          Before you can provision and access a Kubernetes cluster on OpenStack, you need to add account credentials.
          The Gardener needs the credentials to provision and operate the OpenStack infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Ensure that the user has privileges to <strong>create, modify and delete VMs</strong>.
        </p>
      </div>
      <div v-if="vendor==='openstack-designate'">
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
import { mapActions } from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  requiredIf,
} from '@vuelidate/validators'

import { useCloudProfileStore } from '@/store/cloudProfile'

import GSecretDialog from '@/components/Secrets/GSecretDialog'
import GExternalLink from '@/components/GExternalLink'

import {
  withMessage,
  withFieldName,
} from '@/utils/validators'
import {
  getVuelidateErrors,
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
    secret: {
      type: Object,
    },
    vendor: {
      type: String,
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
      domainName: undefined,
      tenantName: undefined,
      username: undefined,
      password: undefined,
      hideSecret: true,
      authURL: undefined,
      applicationCredentialID: undefined,
      applicationCredentialName: undefined,
      applicationCredentialSecret: undefined,
      hideApplicationCredentialSecret: true,
      authenticationMethod: 'USER',
    }
  },
  validations () {
    const requiredUserMessage = 'Required for technical user authentication'
    const requiredApplicationCredentialsMessage = 'Required for application credentials authentication'
    return {
      domainName: withFieldName('Domain Name', {
        required,
      }),
      tenantName: withFieldName('Project / Tenant Name', {
        required,
      }),
      username: withFieldName('Technical User', {
        required: withMessage(requiredUserMessage,
          requiredIf(function () {
            return this.authenticationMethod === 'USER'
          }),
        ),
      }),
      password: withFieldName('Password', {
        required: withMessage(requiredUserMessage,
          requiredIf(function () {
            return this.authenticationMethod === 'USER'
          }),
        ),
      }),
      authURL: withFieldName('Auth URL', {
        required: requiredIf(function () {
          return this.vendor === 'openstack-designate'
        }),
      }),
      applicationCredentialID: withFieldName('Application Credentials ID', {
        required: withMessage(requiredApplicationCredentialsMessage,
          requiredIf(function () {
            return this.authenticationMethod === 'APPLICATION_CREDENTIALS'
          }),
        ),
      }),
      applicationCredentialName: withFieldName('Application Credentials Name', {
        required: withMessage(requiredApplicationCredentialsMessage,
          requiredIf(function () {
            return this.authenticationMethod === 'APPLICATION_CREDENTIALS'
          }),
        ),
      }),
      applicationCredentialSecret: withFieldName('Application Credentials Secret', {
        required: withMessage(requiredApplicationCredentialsMessage,
          requiredIf(function () {
            return this.authenticationMethod === 'APPLICATION_CREDENTIALS'
          }),
        ),
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
    secretData () {
      const data = {
        domainName: this.domainName,
        tenantName: this.tenantName,
        applicationCredentialID: this.applicationCredentialID,
        applicationCredentialName: this.applicationCredentialName,
        applicationCredentialSecret: this.applicationCredentialSecret,
        username: this.username,
        password: this.password,
      }
      if (this.authURL) {
        data.OS_AUTH_URL = this.authURL
      }

      return data
    },
    isCreateMode () {
      return !this.secret
    },
    name () {
      if (this.vendor === 'openstack') {
        return 'OpenStack'
      }
      if (this.vendor === 'openstack-designate') {
        return 'OpenStack Designate'
      }
      return undefined
    },
    errors () {
      return getVuelidateErrors(this.v$.$errors)
    },
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()
      }
    },
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
    ...mapActions(useCloudProfileStore, ['cloudProfileByName']),
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
  },
}
</script>
