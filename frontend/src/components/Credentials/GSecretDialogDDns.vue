<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :secret-validations="v$"
    :binding="binding"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          v-model="v$.server.$model"
          color="primary"
          label="<host>:<port> of the authorive DNS server"
          :error-messages="getErrorMessages(v$.server)"
          type="text"
          variant="underlined"
          @blur="v$.server.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="v$.tsigKeyName.$model"
          color="primary"
          label="TSIG Key Name"
          :error-messages="getErrorMessages(v$.tsigKeyName)"
          type="text"
          variant="underlined"
          @blur="v$.tsigKeyName.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="v$.tsigSecret.$model"
          color="primary"
          label="TSIG Secret"
          :error-messages="getErrorMessages(v$.tsigSecret)"
          :append-icon="tsigSecretHidden ? 'mdi-eye' : 'mdi-eye-off'"
          :type="tsigSecretHidden ? 'password' : 'text'"
          variant="underlined"
          @click:append="() => (tsigSecretHidden = !tsigSecretHidden)"
          @blur="v$.tsigSecret.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="v$.zone.$model"
          color="primary"
          label="Zone"
          :error-messages="getErrorMessages(v$.zone)"
          type="text"
          variant="underlined"
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
          This DNS provider allows you to create and manage DNS entries for authoritive DNS server supporting dynamic updates with DNS messages following
          <g-external-link url="https://datatracker.ietf.org/doc/html/rfc2136">
            RFC2136
          </g-external-link>
          (DNS Update) like knot-dns or others.
        </p>
        <p>
          The configuration is depending on the DNS server product. You need permissions for <code>update</code> and <code>transfer</code> (AXFR) actions on your zones and a TSIG secret.
        </p>
        <p>
          For details see
          <g-external-link url="https://github.com/gardener/external-dns-management/tree/master/docs/rfc2136">
            Gardener RFC2136 DNS Provider Documentation
          </g-external-link>
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import GSecretDialog from '@/components/Credentials/GSecretDialog'
import GExternalLink from '@/components/GExternalLink'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

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
      server,
      tsigKeyName,
      tsigSecret,
      zone,
      tsigSecretAlgorithm,
    } = secretStringDataRefs({
      Server: 'server',
      TSIGKeyName: 'tsigKeyName',
      TSIGSecret: 'tsigSecret',
      Zone: 'zone',
      TSIGSecretAlgorithm: 'tsigSecretAlgorithm',
    })

    tsigSecretAlgorithm.value = 'hmac-sha256'

    return {
      server,
      tsigKeyName,
      tsigSecret,
      zone,
      tsigSecretAlgorithm,
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      tsigSecretHidden: true,
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
          if (typeof value !== 'string' || value.length > 255) {
            return false
          }
          return /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.$/.test(value) // eslint-disable-line security/detect-unsafe-regex
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
    isCreateMode () {
      return !this.secret
    },
  },
  methods: {
    getErrorMessages,
  },
}
</script>
