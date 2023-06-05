<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-dialog
    ref="gDialog"
    confirm-button-text="Ok"
    cancel-button-text=""
    width="600"
    @dialog-closed="onDialogClosed()"
    >
    <template #caption>About</template>
    <template #message>
      <div class="d-flex flex-row align-center mt-3">
        <img src="/static/assets/logo.svg" alt="gardener logo" class="logo mr-3">
        <div>
          <h2 class="mb-1">Gardener Dashboard</h2>
        </div>
      </div>
      <v-divider class="my-3"></v-divider>
      <div class="text-grey-darken-1">
        <div class="font-weight-bold">Version Information</div>
        <div v-if="!!dashboardVersion">Dashboard<span class="ml-1 font-weight-bold">{{dashboardVersion}}</span></div>
        <template v-if="isAdmin">
          <div v-if="!!gardenerVersion">API<span class="ml-1 font-weight-bold">{{gardenerVersion}}</span></div>
          <v-divider v-if="extensionsList.length" class="my-3"></v-divider>
          <div v-if="extensionsList.length" class="font-weight-bold">Extensions ({{extensionsList.length}} deployed)</div>
          <div
          v-for="extension in extensionsList"
          :key="extension.id"
          class="extension-item">
            <span>{{extension.name}}</span>
            <span v-if="!!extension.version"><span class="ml-1 font-weight-bold">{{extension.version}}</span></span>
            <span v-if="!!extension.kind"> (Kind: {{extension.kind}})</span>
          </div>
        </template>
      </div>
    </template>
  </g-dialog>
</template>

<script>
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'

import { useAppStore, useAuthnStore, useGardenerExtensionStore } from '@/store'
import GDialog from './GDialog.vue'

import sortBy from 'lodash/sortBy'

export default defineComponent({
  components: {
    GDialog,
  },
  props: {
    modelValue: {
      type: Boolean,
    },
  },
  inject: ['api'],
  data () {
    return {
      gardenerVersion: undefined,
      dashboardVersion: undefined,
    }
  },
  computed: {
    ...mapState(useGardenerExtensionStore, {
      gardenerExtensionsList: 'list',
    }),
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    extensionsList () {
      return sortBy(this.gardenerExtensionsList, 'name')
    },
  },
  emits: [
    'dialogClosed',
  ],
  methods: {
    ...mapActions(useAppStore, [
      'setError',
    ]),
    async fetchVersions () {
      try {
        const {
          data: {
            gardenerVersion,
            version,
          } = {},
        } = await this.api.getInfo()
        if (gardenerVersion) {
          this.gardenerVersion = gardenerVersion.gitVersion
        }
        if (version) {
          this.dashboardVersion = `${version}`
        }
      } catch (err) {
        this.setError({
          message: `Failed to fetch version information. ${err.message}`,
        })
      }
    },
    onDialogClosed () {
      this.$emit('dialogClosed')
    },
  },
  watch: {
    modelValue (value) {
      if (value) {
        this.$refs.gDialog.showDialog()
        this.fetchVersions()
      }
    },
  },
})
</script>

<style lang="scss" scoped>
  .logo {
    height: 50px;
  }
</style>
