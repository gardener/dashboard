<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    role="list"
    class="g-list"
  >
    <slot/>
  </div>
</template>

<style lang="scss" scoped>
  .g-list {
    display: block;
    padding: 8px 0;
    border-radius: 0;
    position: static;
  }
</style>
