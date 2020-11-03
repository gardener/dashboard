<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

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
    <v-radio
      v-if="shootItem && hasControlPlaneTerminalAccess"
      label="Control Plane"
      value="cp"
      color="cyan darken-2"
    ></v-radio>
    <v-radio
      v-if="shootItem && hasShootTerminalAccess"
      value="shoot"
      color="cyan darken-2"
      :disabled="isShootStatusHibernated"
    >
      <template v-slot:label>
        <div>Cluster</div>
        <v-icon v-if="isShootStatusHibernated" class="vertical-align-middle ml-2">mdi-sleep</v-icon>
      </template>
    </v-radio>
    <v-radio
      v-if="hasGardenTerminalAccess"
      label="Garden Cluster"
      value="garden"
      color="cyan darken-2"
    ></v-radio>
  </v-radio-group>
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
