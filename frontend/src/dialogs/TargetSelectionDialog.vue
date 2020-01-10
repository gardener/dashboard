<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <g-dialog
    confirmButtonText="Select"
    :confirmDisabled="!valid"
    max-width="320px"
    max-height="100vh"
    defaultColor="cyan-darken-2"
    ref="gDialog"
    >
    <template slot="caption">Select Target</template>
    <template slot="message">
      <v-radio-group
        v-model="selectedTarget"
        label="Terminal Target"
        class="mt-4"
        :hint="hint"
        persistent-hint
      >
        <v-radio
          v-if="hasControlPlaneTerminalAccess"
          label="Control Plane"
          value="cp"
          color="cyan darken-2"
        ></v-radio>
        <v-radio
          v-if="hasShootTerminalAccess"
          value="shoot"
          color="cyan darken-2"
          :disabled="isShootHibernated"
        >
          <template v-slot:label>
            <div>Cluster</div>
            <v-icon v-if="isShootHibernated" class="vertical-align-middle ml-2">mdi-sleep</v-icon>
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
  </g-dialog>
</template>

<script>
import GDialog from '@/dialogs/GDialog'
import { mapGetters } from 'vuex'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GDialog
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  data () {
    return {
      selectedTarget: undefined
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
    valid () {
      if (!this.hasControlPlaneTerminalAccess && !this.hasShootTerminalAccess && !this.hasGardenTerminalAccess) {
        return false
      }

      if (!this.isAdmin && this.isShootHibernated) {
        return false
      }

      return true
    },
    hint () {
      if (!this.isAdmin && this.isShootHibernated) {
        return 'Terminal not available for hibernated clusters'
      }
      return 'Choose for which target you want to have a terminal session'
    }
  },
  methods: {
    async promptForTargetSelection (initialState) {
      this.initialize(initialState)

      const confirmed = await this.$refs.gDialog.confirmWithDialog()
      if (confirmed) {
        return this.selectedTarget
      } else {
        return undefined
      }
    },
    initialize ({ target }) {
      this.selectedTarget = target
    }
  }
}
</script>
