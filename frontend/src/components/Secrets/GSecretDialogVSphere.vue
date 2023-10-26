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
    vendor="vsphere"
    create-title="Add new VMware vSphere Secret"
    replace-title="Replace VMware vSphere Secret"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          ref="vsphereUsername"
          v-model="vsphereUsername"
          color="primary"
          label="vSphere Username"
          :error-messages="errors.vsphereUsername"
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
          :error-messages="errors.vspherePassword"
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
          :error-messages="errors.nsxtUsername"
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
          :error-messages="errors.nsxtPassword"
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

import GSecretDialog from '@/components/Secrets/GSecretDialog'
import GExternalLink from '@/components/GExternalLink.vue'

import {
  getVuelidateErrors,
  setDelayedInputFocus,
} from '@/utils'
import { allWithCauserParam } from '@/utils/validators'

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
      vsphereUsername: undefined,
      vspherePassword: undefined,
      hideVspherePassword: true,
      nsxtUsername: undefined,
      nsxtPassword: undefined,
      hideNsxtPassword: true,
    }
  },
  validations () {
    return {
      vsphereUsername: allWithCauserParam('vSphere Username', {
        required,
      }),
      vspherePassword: allWithCauserParam('vSphere Password', {
        required,
      }),
      nsxtUsername: allWithCauserParam('NSX-T Username', {
        required,
      }),
      nsxtPassword: allWithCauserParam('NSX-T Password', {
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
    secretData () {
      return {
        vsphereUsername: this.vsphereUsername,
        vspherePassword: this.vspherePassword,
        nsxtUsername: this.nsxtUsername,
        nsxtPassword: this.nsxtPassword,
      }
    },
    isCreateMode () {
      return !this.secret
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
  },
  methods: {
    reset () {
      this.v$.$reset()

      this.vsphereUsername = ''
      this.vspherePassword = ''
      this.nsxtUsername = ''
      this.nsxtPassword = ''

      if (!this.isCreateMode) {
        if (this.secret.data) {
          this.vsphereUsername = this.secret.data.vsphereUsername
          this.nsxtUsername = this.secret.data.nsxtUsername
        }
        setDelayedInputFocus(this, 'vsphereUsername')
      }
    },
  },
}
</script>
