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
    vendor="vsphere"
    create-title="Add new VMware vSphere Secret"
    replace-title="Replace VMware vSphere Secret"
    @input="onInput">

    <template v-slot:secret-slot>
      <div>
        <v-text-field
        color="primary"
        v-model="vsphereUsername"
        ref="vsphereUsername"
        label="vSphere Username"
        :error-messages="getErrorMessages('vsphereUsername')"
        @update:model-value="$v.vsphereUsername.$touch()"
        @blur="$v.vsphereUsername.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="primary"
          v-model="vspherePassword"
          label="vSphere Password"
          :error-messages="getErrorMessages('vspherePassword')"
          :append-icon="hideVspherePassword ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideVspherePassword ? 'password' : 'text'"
          @click:append="() => (hideVspherePassword = !hideVspherePassword)"
          @update:model-value="$v.vspherePassword.$touch()"
          @blur="$v.vspherePassword.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
        color="primary"
        v-model="nsxtUsername"
        label="NSX-T Username"
        :error-messages="getErrorMessages('nsxtUsername')"
        @update:model-value="$v.nsxtUsername.$touch()"
        @blur="$v.nsxtUsername.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="primary"
          v-model="nsxtPassword"
          label="NSX-T Password"
          :error-messages="getErrorMessages('nsxtPassword')"
          :append-icon="hideNsxtPassword ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideNsxtPassword ? 'password' : 'text'"
          @click:append="() => (hideNsxtPassword = !hideNsxtPassword)"
          @update:model-value="$v.nsxtPassword.$touch()"
          @blur="$v.nsxtPassword.$touch()"
        ></v-text-field>
      </div>
    </template>

    <template v-slot:help-slot>
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
          <a href="https://docs.vmware.com/de/VMware-vSphere/index.html"
            target="_blank" rel="noopener">
            VMware vSphere Documentation</a>
            and the
          <a href="https://docs.vmware.com/en/VMware-NSX-T-Data-Center/index.html"
            target="_blank" rel="noopener">
          VMware NSX-T Data Center Documentation</a>.
        </p>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog.vue'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'

const validationErrors = {
  vsphereUsername: {
    required: 'You can\'t leave this empty.'
  },
  vspherePassword: {
    required: 'You can\'t leave this empty.'
  },
  nsxtUsername: {
    required: 'You can\'t leave this empty.'
  },
  nsxtPassword: {
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
      vsphereUsername: undefined,
      vspherePassword: undefined,
      hideVspherePassword: true,
      nsxtUsername: undefined,
      nsxtPassword: undefined,
      hideNsxtPassword: true,
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
        vsphereUsername: this.vsphereUsername,
        vspherePassword: this.vspherePassword,
        nsxtUsername: this.nsxtUsername,
        nsxtPassword: this.nsxtPassword
      }
    },
    validators () {
      const validators = {
        vsphereUsername: {
          required
        },
        vspherePassword: {
          required
        },
        nsxtUsername: {
          required
        },
        nsxtPassword: {
          required
        }
      }
      return validators
    },
    isCreateMode () {
      return !this.secret
    }
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    },
    reset () {
      this.$v.$reset()

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
