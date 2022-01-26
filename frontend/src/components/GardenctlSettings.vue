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
      ></v-select>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'

export default {
  computed: {
    ...mapGetters([
      'gardenctlOptions'
    ]),
    legacyCommands: {
      get () {
        return this.gardenctlOptions.legacyCommands
      },
      set (value) {
        this.setGardenctlOptions({
          ...this.$store.state.gardenctlOptions,
          legacyCommands: value
        })
      }
    },
    shell: {
      get () {
        return this.gardenctlOptions.shell
      },
      set (value) {
        this.setGardenctlOptions({
          ...this.$store.state.gardenctlOptions,
          shell: value
        })
      }
    }
  },
  methods: {
    ...mapMutations({
      setGardenctlOptions: 'SET_GARDENCTL_OPTIONS'
    })
  }
}
</script>
