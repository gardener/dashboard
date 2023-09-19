<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <v-radio-group
      v-model="selectedTarget"
      label="Terminal Target"
      class="mt-6"
      :hint="hint"
      persistent-hint
    >
      <v-radio
        v-if="shootItem && hasControlPlaneTerminalAccess"
        label="Control Plane"
        value="cp"
        color="primary"
      />
      <v-radio
        v-if="shootItem && hasShootTerminalAccess"
        value="shoot"
        color="primary"
        :disabled="disabled || isShootStatusHibernated"
      >
        <template #label>
          <div>Cluster</div>
          <v-icon
            v-if="isShootStatusHibernated"
            class="vertical-align-middle ml-2"
          >
            mdi-sleep
          </v-icon>
        </template>
      </v-radio>
      <v-radio
        v-if="hasGardenTerminalAccess"
        value="garden"
        color="primary"
        :disabled="disabled || (!isAdmin && isShootStatusHibernated)"
      >
        <template #label>
          <div>Garden Cluster</div>
          <v-icon
            v-if="!isAdmin && isShootStatusHibernated"
            class="vertical-align-middle ml-2"
          >
            mdi-sleep
          </v-icon>
        </template>
      </v-radio>
    </v-radio-group>
    <v-alert
      v-if="!isAdmin && selectedTarget === 'garden'"
      class="mt-2 mb-2"
      :value="true"
      type="info"
      color="primary"
      variant="outlined"
    >
      <strong>Terminal will be running on <span class="font-family-monospace">{{ shootName }}</span> cluster</strong><br>
      Make sure that only gardener project members with <span class="font-family-monospace">admin</span> role have privileged access to the <span class="font-family-monospace">{{ shootName }}</span> cluster before creating this terminal session.
    </v-alert>
  </div>
</template>

<script>
import { mapState } from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'

import { shootItem } from '@/mixins/shootItem'

export default {
  mixins: [shootItem],
  props: {
    modelValue: {
      type: String,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    shootItem: {
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
  validations () {
    return this.validators
  },
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    ...mapState(useAuthzStore, [
      'hasGardenTerminalAccess',
      'hasControlPlaneTerminalAccess',
      'hasShootTerminalAccess',
    ]),
    validators () {
      return {
        modelValue: {
          required,
        },
      }
    },
    selectedTarget: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    hint () {
      if (!this.isAdmin && this.isShootStatusHibernated) {
        return 'Terminal not available for hibernated clusters'
      }
      if (!this.isAdmin) {
        // as user, currently there is nothing to choose, hence we use a different hint as for the admin
        return 'Target of terminal session'
      }
      return 'Choose for which target you want to have a terminal session'
    },
  },
}
</script>
