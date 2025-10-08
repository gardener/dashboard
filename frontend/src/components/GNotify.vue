<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <notifications
    position="bottom right"
    class="ma-2"
    width="360px"
    pause-on-hover
  >
    <template #body="{ item, close }">
      <v-alert
        compact
        flat
        :color="item.type"
        :title="item.title"
        :text="item.text"
        :width="item.width"
        closable
        class="mt-2 overflow-wrap"
        @click:close="close"
      />
    </template>
  </notifications>
</template>

<style lang="scss" scoped>

.overflow-wrap {
  overflow-wrap: break-word;
}

</style>
