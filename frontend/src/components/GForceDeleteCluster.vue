<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <v-list>
    <v-list-item-subtitle>
      Created By
    </v-list-item-subtitle>
    <v-list-item-title>
      <g-account-avatar
        :account-name="shootCreatedBy"
        :size="22"
      />
    </v-list-item-title>
  </v-list>
  <p>
    Type <span class="font-weight-bold">{{ shootName }}</span> below to confirm the forceful deletion of the cluster.
  </p>
  <g-expand-transition-group>
    <v-alert
      v-if="!confirmed"
      class="mt-2"
      type="warning"
      variant="tonal"
    >
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
      <p class="font-weight-bold">
        This action cannot be undone.
      </p>
    </v-alert>
  </g-expand-transition-group>
  <v-checkbox
    v-model="confirmed"
    :seconds="0"
    hide-details
    class="mt-2"
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
  <p v-if="isShootReconciliationDeactivated">
    <v-row class="fill-height">
      <v-icon
        color="warning"
        class="mr-1"
      >
        mdi-alert-box
      </v-icon>
      <span>The cluster will not be deleted as long as reconciliation is deactivated.</span>
    </v-row>
  </p>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'

import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GExpandTransitionGroup from '@/components/GExpandTransitionGroup'
import GShootSecretName from '@/components/GShootSecretName'

import { shootItem } from '@/mixins/shootItem'
import {
  withFieldName,
  withMessage,
} from '@/utils/validators'

export default {
  components: {
    GAccountAvatar,
    GExpandTransitionGroup,
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
          return !!this.internalValue
        }),
      }),
    }
  },
  data () {
    return {
      confirmed: false,
    }
  },
}
</script>

<style lang="scss" scoped>
p {
  margin-bottom: 0
}
</style>
