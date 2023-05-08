<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <div
    role="list-item"
    class="d-flex align-center px-4 py-3 g-list-item"
  >
    <div
      class="d-inline-flex align-self-center flex-nowrap mr-6 g-list-item__prepend"
    >
      <slot name="prepend"></slot>
    </div>

    <div
      class="d-block align-self-center align-center mr-auto g-list-item__content "
    >
      <slot/>
    </div>

    <div
      class="d-inline-flex align-self-center flex-nowrap ml-3 g-list-item__append"
    >
      <slot name="append"></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .g-list-item {
    letter-spacing: normal;
    text-decoration: none;
    min-height: 48px;
    position: relative;

    .g-list-item__prepend {
      min-width: 24px;
    }

    .g-list-item__content {
      overflow: hidden;
    }
  }
</style>
