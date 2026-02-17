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
      <GGenericInputField
        v-if="providerType==='openstack-designate'"
        v-model="authURL"
        :field="fields['authURL']"
      />
      <GGenericInputField
        v-model="domainName"
        :field="fields['domainName']"
      />
      <GGenericInputField
        v-model="tenantName"
        :field="fields['tenantName']"
      />
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
      <v-container class="py-0">
        <template v-if="authenticationMethod === 'USER'">
          <GGenericInputField
            v-model="username"
            :field="fields['username']"
            :input-props="{ 'v-messages-color': { color: 'warning' } }"
          />
          <GGenericInputField
            v-model="password"
            :field="fields['password']"
            :input-props="{ 'v-messages-color': {color: 'warning' } }"
          />
        </template>
        <template v-else>
          <GGenericInputField
            v-model="applicationCredentialID"
            :field="fields['applicationCredentialID']"
          />
          <GGenericInputField
            v-model="applicationCredentialName"
            :field="fields['applicationCredentialName']"
          />
          <GGenericInputField
            v-model="applicationCredentialSecret"
            :field="fields['applicationCredentialSecret']"
          />
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

import GSecretDialog from '@/components/Credentials/GSecretDialog'
import GExternalLink from '@/components/GExternalLink'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import {
  getErrorMessages,
  setDelayedInputFocus,
} from '@/utils'

import GGenericInputField from '../GGenericInputField.vue'

export default {
  components: {
    GSecretDialog,
    GExternalLink,
    GGenericInputField,
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
      fields: {
        authURL: {
          label: 'Auth URL',
          type: 'text',
          validators: {
            required: {
              type: 'required',
            },
          },
        },
        domainName: {
          label: 'Domain Name',
          type: 'text',
          validators: {
            required: {
              type: 'required',
            },
          },
        },
        tenantName: {
          label: 'Project / Tenant Name',
          type: 'text',
          validators: {
            required: {
              type: 'required',
            },
          },
        },
        applicationCredentialID: {
          label: 'ID',
          type: 'text',
          validators: {
            required: {
              type: 'required',
            },
          },
        },
        applicationCredentialName: {
          label: 'Name',
          type: 'text',
          validators: {
            required: {
              type: 'required',
            },
          },
        },
        applicationCredentialSecret: {
          label: 'Secret',
          type: 'password',
          validators: {
            required: {
              type: 'required',
            },
          },
        },
        username: {
          label: 'Technical User',
          type: 'text',
          hint: 'Do not use personalized login credentials. Instead, use credentials of a technical user',
          validators: {
            required: {
              type: 'required',
            },
          },
        },
        password: {
          label: 'Password',
          type: 'password',
          hint: 'Do not use personalized login credentials. Instead, use credentials of a technical user',
          validators: {
            required: {
              type: 'required',
            },
          },
        },
      },
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
