<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-card flat class="mx-2 mt-2">
    <v-card-text class="pt-0">
      <v-radio-group
        v-model="legacyCommands"
        label="Select Version"
        hint="Choose for which gardenctl version the commands should be displayed"
        persistent-hint
        @change="onChangeLegacyCommands"
        class="pb-4"
      >
        <v-radio
          label="Legacy Gardenctl"
          :value="true"
          color="primary"
        ></v-radio>
        <v-radio
          label="Gardenctl-v2"
          :value="false"
          color="primary"
        ></v-radio>
      </v-radio-group>
      <v-select
        v-show="!legacyCommands"
        color="primary"
        item-color="primary"
        label="Shell"
        :items="['bash', 'fish', 'powershell', 'zsh']"
        hint="Choose for which shell the commands should be displayed"
        persistent-hint
        v-model="shell"
        @input="onInputShell"
      ></v-select>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  data () {
    return {
      legacyCommands: false,
      shell: 'bash'
    }
  },
  methods: {
    ...mapActions([
      'refreshGardenctlOptions'
    ]),
    onInputShell () {
      this.store()
    },
    onChangeLegacyCommands () {
      this.store()
    },
    store () {
      const gardenctlOptions = {
        legacyCommands: this.legacyCommands,
        shell: this.shell
      }
      this.$store.commit('SET_GARDENCTL_OPTIONS', gardenctlOptions)
    }
  },
  async mounted () {
    const { legacyCommands, shell } = await this.refreshGardenctlOptions()
    this.legacyCommands = legacyCommands
    this.shell = shell
  }
}
</script>
