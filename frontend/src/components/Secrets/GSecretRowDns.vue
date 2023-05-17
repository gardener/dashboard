<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr>
    <td v-if="selectedHeaders.name">
      <div class="d-flex">
        {{item.name}}
        <v-tooltip v-if="!item.isOwnSecret" location="top">
          <template v-slot:activator="{ props }">
            <v-icon v-bind="props" size="small" class="mx-1">mdi-account-arrow-left</v-icon>
          </template>
          <span>Secret shared by {{item.secretNamespace}}</span>
        </v-tooltip>
      </div>
    </td>
    <td v-if="selectedHeaders.secret">
      <span v-if="!item.isOwnSecret">{{item.secretNamespace}}: </span>{{item.secretName}}
    </td>
    <td v-if="selectedHeaders.dnsProvider">
      <g-vendor extended :cloud-provider-kind="item.dnsProvider"></g-vendor>
    </td>
    <td v-if="selectedHeaders.details">
      <v-list color="transparent">
        <v-list-item class="pa-0">
          <g-secret-details-item-content dns :secret="item.secret"></g-secret-details-item-content>
        </v-list-item>
      </v-list>
    </td>
    <td v-if="selectedHeaders.relatedShootCount">
      <div class="d-flex" :class="{'font-weight-light text--disabled' : !item.relatedShootCount}">
        {{item.relatedShootCountLabel}}
      </div>
    </td>
    <td v-if="selectedHeaders.actions" class="text-action-button">
      <div class="d-flex justify-end">
        <v-tooltip location="top" v-if="canPatchSecrets">
          <template v-slot:activator="{ props }">
            <div v-bind="props">
              <v-btn
                :disabled="!item.isOwnSecret || !item.isSupportedCloudProvider"
                icon="mdi-pencil"
                density="compact"
                variant="text"
                @click="onUpdate"
              />
            </div>
          </template>
          <span v-if="!item.isOwnSecret">You can only edit secrets that are owned by you</span>
          <span v-else-if="!item.isSupportedCloudProvider">This DNS Provider is currently not supported by the dashboard</span>
          <span v-else>Edit Secret</span>
        </v-tooltip>
        <v-tooltip location="top" v-if="canDeleteSecrets">
          <template v-slot:activator="{ props }">
            <div v-bind="props">
              <v-btn
                :disabled="item.relatedShootCount > 0 || !item.isOwnSecret"
                icon="mdi-delete"
                density="compact"
                variant="text"
                @click="onDelete"
              />
            </div>
          </template>
          <span v-if="!item.isOwnSecret">You can only delete secrets that are owned by you</span>
          <span v-else-if="item.relatedShootCount > 0">You can only delete secrets that are currently unused</span>
          <span v-else>Delete Secret</span>
        </v-tooltip>
      </div>
    </td>
  </tr>
</template>

<script>
import { defineComponent } from 'vue'
import { mapTableHeader } from '@/utils'
import GVendor from '@/components/GVendor'
import GSecretDetailsItemContent from '@/components/Secrets/GSecretDetailsItemContent'
import { mapGetters } from 'pinia'
import { useAuthzStore } from '@/store'
export default defineComponent({
  components: {
    GVendor,
    GSecretDetailsItemContent,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
    headers: {
      type: Array,
      required: true,
    },
  },
  computed: {
    ...mapGetters(useAuthzStore, ['canPatchSecrets', 'canDeleteSecrets']),
    selectedHeaders () {
      return mapTableHeader(this.headers, 'selected')
    },
  },
  methods: {
    onUpdate () {
      this.$emit('update', this.item.secret)
    },
    onDelete () {
      this.$emit('delete', this.item.secret)
    },
  },
})
</script>
