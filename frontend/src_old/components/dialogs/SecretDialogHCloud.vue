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
    vendor="hcloud"
    create-title="Add new Hetzner Cloud Secret"
    replace-title="Replace Hetzner Cloud Secret"
    @input="onInput">

    <template v-slot:secret-slot>
      <div>
        <v-text-field
        color="primary"
        v-model="hcloudToken"
        ref="hcloudToken"
        label="Hetzner Cloud Token"
        :error-messages="getErrorMessages('hcloudToken')"
        @update:model-value="$v.hcloudToken.$touch()"
        @blur="$v.hcloudToken.$touch()"
        ></v-text-field>
      </div>
    </template>

    <template v-slot:help-slot>
      <div>
        <p>
          Before you can provision and access a Kubernetes cluster on Hetzner Cloud, you need to add a Hetzner Cloud token.
          The Gardener needs these credentials to provision and operate Hetzner Cloud infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Please read the
          <a href="https://www.hetzner.com/cloud"
            target="_blank" rel="noopener">
            Hetzner Cloud Documentation</a>.
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
  hcloudToken: {
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
      hcloudToken: undefined,
      hideHcloudToken: true,
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
        hcloudToken: this.hcloudToken
      }
    },
    validators () {
      const validators = {
        hcloudToken: {
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

      this.hcloudToken = ''

      if (!this.isCreateMode) {
        if (this.secret.data) {
          this.hcloudToken = this.secret.data.hcloudToken
        }
        setDelayedInputFocus(this, 'hcloudToken')
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
