<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
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
