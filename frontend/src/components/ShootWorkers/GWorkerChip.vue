<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-chip
    size="small"
    class="cursor-pointer"
    variant="tonal"
    :color="chipColor"
  >
    <g-vendor-icon
      :icon="machineImageIcon"
      :size="20"
    />
    <span class="pl-1">{{ workerGroup.name }}</span>
  </v-chip>
</template>

<script>
import { mapActions } from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'

import GVendorIcon from '@/components/GVendorIcon'

import {
  find,
  get,
} from '@/lodash'

export default {
  components: {
    GVendorIcon,
  },
  props: {
    workerGroup: {
      type: Object,
    },
    cloudProfileName: {
      type: String,
    },
  },
  computed: {
    machineImage () {
      const machineImages = this.machineImagesByCloudProfileName(this.cloudProfileName)
      const { name, version } = get(this.workerGroup, 'machine.image', {})
      return find(machineImages, { name, version })
    },
    machineImageIcon () {
      return get(this.machineImage, 'icon')
    },
    chipColor () {
      return this.machineImage.isDeprecated ? 'warning' : 'primary'
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'machineImagesByCloudProfileName',
    ]),
  },
}
</script>
