<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :secret-validations="v$"
    :binding="binding"
    create-title="Add new VMware vSphere Secret"
    update-title="Update VMware vSphere Secret"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          v-model="vsphereUsername"
          color="primary"
          label="vSphere Username"
          :error-messages="getErrorMessages(v$.vsphereUsername)"
          variant="underlined"
          @update:model-value="v$.vsphereUsername.$touch()"
          @blur="v$.vsphereUsername.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="vspherePassword"
          color="primary"
          label="vSphere Password"
          :error-messages="getErrorMessages(v$.vspherePassword)"
          :append-icon="hideVspherePassword ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideVspherePassword ? 'password' : 'text'"
          variant="underlined"
          @click:append="() => (hideVspherePassword = !hideVspherePassword)"
          @update:model-value="v$.vspherePassword.$touch()"
          @blur="v$.vspherePassword.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="nsxtUsername"
          color="primary"
          label="NSX-T Username"
          :error-messages="getErrorMessages(v$.nsxtUsername)"
          variant="underlined"
          @update:model-value="v$.nsxtUsername.$touch()"
          @blur="v$.nsxtUsername.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="nsxtPassword"
          color="primary"
          label="NSX-T Password"
          :error-messages="getErrorMessages(v$.nsxtPassword)"
          :append-icon="hideNsxtPassword ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideNsxtPassword ? 'password' : 'text'"
          variant="underlined"
          @click:append="() => (hideNsxtPassword = !hideNsxtPassword)"
          @update:model-value="v$.nsxtPassword.$touch()"
          @blur="v$.nsxtPassword.$touch()"
        />
      </div>
    </template>

    <template #help-slot>
      <div>
        <p>
          Before you can provision and access a Kubernetes cluster on VMware vSphere, you need to add vSphere and NSX-T account credentials.
          The Gardener needs these credentials to provision and operate the VMware vSphere infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Ensure that these accounts have privileges to <strong>create, modify and delete VMs and Networking resources</strong>.
        </p>
        <p>
          Please read the
          <g-external-link url="https://docs.vmware.com/de/VMware-vSphere/index.html">
            VMware vSphere Documentation
          </g-external-link>
          and the
          <g-external-link url="https://docs.vmware.com/en/VMware-NSX-T-Data-Center/index.html">
            VMware NSX-T Data Center Documentation
          </g-external-link>.
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import GSecretDialog from '@/components/Credentials/GSecretDialog'
import GExternalLink from '@/components/GExternalLink.vue'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

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
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    const { secretStringDataRefs } = useProvideSecretContext()

    const {
      vsphereUsername,
      vspherePassword,
      nsxtUsername,
      nsxtPassword,
    } = secretStringDataRefs({
      vSphereUsername: 'vsphereUsername',
      vSpherePassword: 'vspherePassword',
      NSXTUsername: 'nsxtUsername',
      NSXTPassword: 'nsxtPassword',
    })

    return {
      vsphereUsername,
      vspherePassword,
      nsxtUsername,
      nsxtPassword,
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      hideVspherePassword: true,
      hideNsxtPassword: true,
    }
  },
  validations () {
    return {
      vsphereUsername: withFieldName('vSphere Username', {
        required,
      }),
      vspherePassword: withFieldName('vSphere Password', {
        required,
      }),
      nsxtUsername: withFieldName('NSX-T Username', {
        required,
      }),
      nsxtPassword: withFieldName('NSX-T Password', {
        required,
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
