<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <div>
    Created By
    <g-account-avatar
      :account-name="shootCreatedBy"
      :size="22"
      class="my-2"
    />
  </div>
  <div class="mt-2">
    Type <span class="font-weight-bold">{{ shootName }}</span> below and confirm that you are aware of the side effects and the necessary actions you must take in order to proceed with the forceful deletion of the cluster.
  </div>
  <div class="mb-2 font-weight-bold">
    This action cannot be undone.
  </div>
  <v-alert
    class="my-2"
    type="warning"
    variant="tonal"
  >
    <div>
      You <span class="font-weight-bold">MUST</span> ensure that all the resources created in the IaaS account
      <code>
        <g-shoot-secret-name
          :namespace="shootNamespace"
          :secret-binding-name="shootSecretBindingName"
        />
      </code>
      are cleaned
      up to prevent orphaned resources. Gardener will <span class="font-weight-bold">NOT</span> delete any resources in the underlying infrastructure account.
      Hence, use the force delete option at your own risk and only if you are fully aware of these consequences.
    </div>
    <div
      v-if="userErrorCodeObjects.length"
      class="my-2 font-weight-bold"
    >
      Please consider resolving the root cause which will allow Gardener to continue with the regular deletion:
    </div>
    <div
      v-for="({ description }) in userErrorCodeObjects"
      :key="description"
    >
      {{ description }}
    </div>
  </v-alert>
  <v-checkbox
    v-model="confirmed"
    hide-details
    class="my-2"
  >
    <template #label>
      <span>
        I confirm that I read the message above and deleted all resources in the underlying infrastructure account
        <code>
          <g-shoot-secret-name
            :namespace="shootNamespace"
            :secret-binding-name="shootSecretBindingName"
          />
        </code>
      </span>
    </template>
  </v-checkbox>
  <v-alert
    v-if="isShootReconciliationDeactivated"
    class="my-2"
    type="warning"
  >
    <span>The cluster will not be forecefully deleted as long as reconciliation is deactivated.</span>
  </v-alert>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'

import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GShootSecretName from '@/components/GShootSecretName'

import { shootItem } from '@/mixins/shootItem'
import {
  withFieldName,
  withMessage,
} from '@/utils/validators'
import {
  objectsFromErrorCodes,
  errorCodesFromArray,
} from '@/utils/errorCodes'

import { filter } from '@/lodash'

export default {
  components: {
    GAccountAvatar,
    GShootSecretName,
  },
  mixins: [shootItem],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  validations () {
    return {
      confirmed: withFieldName('Confirmation', {
        required: withMessage('Confirmation is required', () => {
          return !!this.confirmed
        }),
      }),
    }
  },
  data () {
    return {
      confirmed: false,
    }
  },
  computed: {
    userErrorCodeObjects () {
      const shootErrorCodes = errorCodesFromArray(this.shootLastErrors)
      return filter(objectsFromErrorCodes(shootErrorCodes), { userError: true })
    },
  },
}
</script>
