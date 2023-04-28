<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

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
      ></v-radio>
      <v-radio
        v-if="shootItem && hasShootTerminalAccess"
        value="shoot"
        color="primary"
        :disabled="isShootStatusHibernated"
      >
        <template v-slot:label>
          <div>Cluster</div>
          <v-icon v-if="isShootStatusHibernated" class="vertical-align-middle ml-2">mdi-sleep</v-icon>
        </template>
      </v-radio>
      <v-radio
        v-if="hasGardenTerminalAccess"
        value="garden"
        color="primary"
        :disabled="!isAdmin && isShootStatusHibernated"
      >
        <template v-slot:label>
          <div>Garden Cluster</div>
          <v-icon v-if="!isAdmin && isShootStatusHibernated" class="vertical-align-middle ml-2">mdi-sleep</v-icon>
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
      <strong>Terminal will be running on <span class="font-family-monospace">{{shootName}}</span> cluster</strong><br>
      Make sure that only gardener project members with <span class="font-family-monospace">admin</span> role have privileged access to the <span class="font-family-monospace">{{shootName}}</span> cluster before creating this terminal session.
    </v-alert>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { shootItem } from '@/mixins/shootItem'

export default {
  props: {
    value: {
      type: String
    },
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'hasControlPlaneTerminalAccess',
      'hasShootTerminalAccess',
      'hasGardenTerminalAccess',
      'isAdmin'
    ]),
    selectedTarget: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
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
    valid () {
      return !!this.selectedTarget
    }
  },
  mounted () {
    this.$emit('valid', this.valid)
  },
  watch: {
    value (value) {
      this.$emit('valid', this.valid)
    }
  }
}
</script>
