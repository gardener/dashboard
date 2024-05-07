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
    vendor="netlify-dns"
    create-title="Add new DDNS (RFC2136) Secret"
    replace-title="Replace DDNS (RFC2136) Secret"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          v-model="server"
          color="primary"
          label="<host>:<port> of the authorive DNS server"
          :error-messages="getErrorMessages(v$.server)"
          type="text"
          variant="underlined"
          @update:model-value="v$.server.$touch()"
          @blur="v$.server.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="tsigKeyName"
          color="primary"
          label="TSIG Key Name"
          :error-messages="getErrorMessages(v$.tsigKeyName)"
          type="text"
          variant="underlined"
          @update:model-value="v$.tsigKeyName.$touch()"
          @blur="v$.tsigKeyName.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="tsigSecret"
          color="primary"
          label="TSIG Secret"
          :error-messages="getErrorMessages(v$.tsigSecret)"
          :append-icon="hideTSIGSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideTSIGSecret ? 'password' : 'text'"
          variant="underlined"
          @click:append="() => (hideTSIGSecret = !hideTSIGSecret)"
          @update:model-value="v$.tsigSecret.$touch()"
          @blur="v$.tsigSecret.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="zone"
          color="primary"
          label="Zone"
          :error-messages="getErrorMessages(v$.zone)"
          type="text"
          variant="underlined"
          @update:model-value="v$.zone.$touch()"
          @blur="v$.zone.$touch()"
        />
      </div>
      <div>
        <v-select
          v-model="tsigSecretAlgorithm"
          color="primary"
          label="TSIG Secret Algorithm"
          :items="secretAlgorithmItems"
          variant="underlined"
        />
      </div>
    </template>

    <template #help-slot>
      <div>
        <p>
          You need to provide an access token for Netlify to allow the dns-controller-manager to authenticate to Netlify DNS API.
        </p>
        <p>
          Then base64 encode the token. For eg. if the generated token in 1234567890123456, use
        </p>
        <p>
          <pre>$ echo -n '1234567890123456789' | base64</pre>
        </p>
        <p>
          For details see <g-external-link url="https://docs.netlify.com/cli/get-started/#obtain-a-token-in-the-netlify-ui" />
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import GSecretDialog from '@/components/Secrets/GSecretDialog'
import GExternalLink from '@/components/GExternalLink'

import { getErrorMessages } from '@/utils'
import {
  withFieldName,
  withMessage,
} from '@/utils/validators'

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
      server: undefined,
      tsigKeyName: undefined,
      tsigSecret: undefined,
      zone: undefined,
      tsigSecretAlgorithm: 'hmac-sha256',
      hideTSIGSecret: true,
      secretAlgorithmItems: [
        {
          title: 'HMAC-SHA256 (default)',
          value: 'hmac-sha256',
        },
        {
          title: 'HMAC-SHA224',
          value: 'hmac-sha224',
        },
        {
          title: 'HMAC-SHA384',
          value: 'hmac-sha384',
        },
        {
          title: 'HMAC-SHA512',
          value: 'hmac-sha512',
        },
        {
          title: 'HMAC-SHA1',
          value: 'hmac-sha1',
        },
        {
          title: 'HMAC-MD5',
          value: 'hmac-md5',
        },
      ],
    }
  },
  validations () {
    return {
      server: withFieldName('Server', {
        required,
        format: withMessage('Must have format <host>:<port>', value => {
          return /^([^:]+):(\d+)$/.test(value)
        }),
      }),
      tsigKeyName: withFieldName('TSIG Key Name', {
        required,
        format: withMessage('Must end with a dot', value => {
          return /\.$/.test(value)
        }),
      }),
      tsigSecret: withFieldName('TSIG Secret', {
        required,
      }),
      zone: withFieldName('Zone', {
        required,
        format: withMessage('Must be fully qualified', value => {
          return /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.$/.test(value)
        }),
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
        Server: this.server,
        TSIGKeyName: this.tsigKeyName,
        TSIGSecret: this.tsigSecret,
        Zone: this.zone,
      }
      if (this.tsigSecretAlgorithm !== 'hmac-sha256') {
        data.TSIGSecretAlgorithm = this.tsigSecretAlgorithm
      }
      return data
    },
    isCreateMode () {
      return !this.secret
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

      this.server = undefined
      this.tsigKeyName = undefined
      this.tsigSecret = undefined
      this.zone = undefined
      this.tsigSecretAlgorithm = 'hmac-sha256'
    },
    getErrorMessages,
  },
}
</script>
