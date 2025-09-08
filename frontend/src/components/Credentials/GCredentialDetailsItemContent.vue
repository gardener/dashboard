<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <g-list-item-content>
      <template #label>
        <span v-if="detailsTitle">Credential Details (</span>
        <span
          v-for="({ label }, index) in credentialDetails"
          :key="label"
        >
          <span>{{ label }}</span>
          <span v-if="index !== credentialDetails.length - 1"> / </span>
        </span>
        <span v-if="detailsTitle">)</span>
      </template>
      <span
        v-for="({ value, label, hidden, disabledText = hidden }, index) in credentialDetails"
        :key="label"
      >
        <span :class="{'font-weight-light text-disabled' : disabledText }">
          <template v-if="hidden">******</template>
          <template v-else-if="value">{{ value }}</template>
          <template v-else>unknown</template>
        </span>
        <span v-if="index !== credentialDetails.length - 1"> / </span>
      </span>
    </g-list-item-content>
  </div>
</template>

<script>
import {
  secretDetails,
  isSecret,
  isWorkloadIdentity,
} from '@/composables/credential/helper'

export default {

  props: {
    credentialEntity: {
      type: Object,
    },
    shared: {
      type: Boolean,
      default: false,
    },
    providerType: {
      type: String,
    },
    detailsTitle: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    credentialDetails () {
      if (this.shared) {
        return [
          {
            label: 'Shared',
            value: 'Details not available for shared credentials',
            disabledText: true,
          },
        ]
      } else if (isSecret(this.credentialEntity)) {
        const details = secretDetails(this.credentialEntity, this.providerType)
        if (details) {
          return details
        }
      } else if (isWorkloadIdentity(this.credentialEntity)) {
        return [
          {
            label: 'WorkloadIdentity',
            value: 'Details not available for credentials of type WorkloadIdentity',
            disabledText: true,
          },
        ]
      }
      return [
        {
          label: this.credentialEntity?.kind || 'Unknown',
          value: 'Details not available',
          disabledText: true,
        },
      ]
    },
  },
}
</script>
