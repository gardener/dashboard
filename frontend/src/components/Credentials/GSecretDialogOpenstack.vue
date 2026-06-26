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
    :vendor-type="vendorType"
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
          <span class="text-body-large">Authentication Method:</span>
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
import { mapActions } from 'pinia'
import { useVuelidate } from '@vuelidate/core'

import { useConfigStore } from '@/store/config'

import GSecretDialog from '@/components/Credentials/GSecretDialog'
import GExternalLink from '@/components/GExternalLink'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import { getErrorMessages } from '@/utils'

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
    vendorType: {
      type: String,
      required: true,
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
      authenticationMethodInternal: 'USER',
    }
  },
  computed: {
    authenticationMethod: {
      get () {
        return this.authenticationMethodInternal
      },
      set (value) {
        this.authenticationMethodInternal = value
        this.username = undefined
        this.password = undefined
        this.applicationCredentialID = undefined
        this.applicationCredentialName = undefined
        this.applicationCredentialSecret = undefined

        this.v$.$reset()
      },
    },
    visible: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    fields () {
      return Object.fromEntries(this.providerFields.map(field => [field.key, field]))
    },
    providerFields () {
      return this.vendorDetails({
        type: this.vendorType,
        name: this.providerType,
      })?.secret?.fields ?? []
    },
    valid () {
      return !this.v$.$invalid
    },
    isCreateMode () {
      return !this.secret
    },
  },
  watch: {
    applicationCredentialID (value) {
      if (value) {
        this.authenticationMethodInternal = 'APPLICATION_CREDENTIALS'
      }
    },
  },
  methods: {
    ...mapActions(useConfigStore, ['vendorDetails']),
    getErrorMessages,
  },
}
</script>
