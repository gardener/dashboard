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
    cloud-provider-kind="openstack"
    create-title="Add new OpenStack Secret"
    replace-title="Replace OpenStack Secret"
    @input="onInput">

    <template v-slot:secret-slot>
      <div>
        <v-text-field
          color="primary"
          v-model="domainName"
          ref="domainName"
          label="Domain Name"
          :error-messages="getErrorMessages('domainName')"
          @input="$v.domainName.$touch()"
          @blur="$v.domainName.$touch()"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="primary"
          v-model="tenantName"
          label="Project / Tenant Name"
          :error-messages="getErrorMessages('tenantName')"
          @input="$v.tenantName.$touch()"
          @blur="$v.tenantName.$touch()"
        ></v-text-field>
      </div>
      <div>
        <hint-colorizer hint-color="primary">
          <v-text-field
          color="primary"
          v-model="username"
          label="Technical User"
          :error-messages="getErrorMessages('username')"
          @input="$v.username.$touch()"
          @blur="$v.username.$touch()"
          hint="Do not use personalized login credentials. Instead, use credentials of a technical user"
          ></v-text-field>
        </hint-colorizer>
      </div>
      <div>
        <hint-colorizer hint-color="warning">
          <v-text-field
            color="primary"
            v-model="password"
            label="Password"
            :error-messages="getErrorMessages('password')"
            :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
            :type="hideSecret ? 'password' : 'text'"
            @click:append="() => (hideSecret = !hideSecret)"
            @input="$v.password.$touch()"
            @blur="$v.password.$touch()"
            hint="Do not use personalized login credentials. Instead, use credentials of a technical user"
          ></v-text-field>
        </hint-colorizer>
      </div>
    </template>

    <template v-slot:help-slot>
      <div>
        <p>
          Before you can provision and access a Kubernetes cluster on OpenStack, you need to add account credentials.
          The Gardener needs the credentials to provision and operate the OpenStack infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Ensure that the user has privileges to <b>create, modify and delete VMs</b>.
        </p>
        <p>
          Read the
          <a href="https://docs.openstack.org/horizon/latest/admin/admin-manage-roles.html"
            target="_blank">
            OpenStack help section<v-icon style="font-size: 80%">mdi-open-in-new</v-icon></a> on how to create and manage roles.
        </p>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import { mapGetters } from 'vuex'
import SecretDialog from '@/components/dialogs/SecretDialog'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'
import HintColorizer from '@/components/HintColorizer'

const validationErrors = {
  domainName: {
    required: 'You can\'t leave this empty.'
  },
  tenantName: {
    required: 'You can\'t leave this empty.'
  },
  username: {
    required: 'You can\'t leave this empty.'
  },
  password: {
    required: 'You can\'t leave this empty.'
  }
}

export default {
  components: {
    SecretDialog,
    HintColorizer
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
      domainName: undefined,
      tenantName: undefined,
      username: undefined,
      password: undefined,
      hideSecret: true,
      validationErrors
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
  },
  computed: {
    ...mapGetters([
      'cloudProfileByName'
    ]),
    valid () {
      return !this.$v.$invalid
    },
    secretData () {
      return {
        domainName: this.domainName,
        tenantName: this.tenantName,
        username: this.username,
        password: this.password
      }
    },
    validators () {
      const validators = {
        domainName: {
          required
        },
        tenantName: {
          required
        },
        username: {
          required
        },
        password: {
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

      this.domainName = ''
      this.tenantName = ''
      this.username = ''
      this.password = ''

      if (!this.isCreateMode) {
        if (this.secret.data) {
          this.domainName = this.secret.data.domainName
          this.tenantName = this.secret.data.tenantName
        }
        setDelayedInputFocus(this, 'domainName')
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
