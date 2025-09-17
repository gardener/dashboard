<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-radio-group
    v-model="selectedTarget"
    label="Terminal Target"
    class="mt-6"
    :hint="hint"
    persistent-hint
  >
    <div
      v-tooltip="{
        text: 'Terminals can only be scheduled if the seed is a managed seed',
        location: 'top left',
        disabled: canScheduleOnSeed
      }"
    >
      <v-radio
        v-if="shootItem && hasControlPlaneTerminalAccess"
        label="Control Plane"
        value="cp"
        color="primary"
        :disabled="!canScheduleOnSeed"
      />
    </div>
    <v-radio
      v-if="shootItem && hasShootTerminalAccess"
      value="shoot"
      color="primary"
      :disabled="loading || isShootStatusHibernated"
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
      :disabled="loading || (!isAdmin && isShootStatusHibernated)"
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
</template>

<script>
import { mapState } from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'

import { useTerminalSplitpanes } from '@/composables/useTerminalSplitpanes'

import { withFieldName } from '@/utils/validators'

export default {
  props: {
    modelValue: {
      type: String,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup (props) {
    const {
      shootItem,
      isShootStatusHibernated,
      canScheduleOnSeed,
    } = useTerminalSplitpanes()

    return {
      v$: useVuelidate(),
      shootItem,
      isShootStatusHibernated,
      canScheduleOnSeed,
    }
  },
  validations () {
    return {
      modelValue: withFieldName('Terminal Target', {
        required,
      }),
    }
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
