<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div class="svg-background">
        <slot name="svgComponent"></slot>
    </div>
    <v-card-title class="card-title white--text">
      <slot></slot>
    </v-card-title>
  </div>
</template>

<style lang="scss" scoped>
  .svg-background svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 130px;
    z-index: 100;
  }
  .card-title {
    position: relative;
    width: 100%;
    height: 130px;
    z-index: 200;
  }
</style>
