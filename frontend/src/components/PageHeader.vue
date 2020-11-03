<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="headerContainer">
    <div class="caption">
      <slot name="caption">

      </slot>
    </div>
     <span class="title">
       <slot name="title"></slot>
     </span>
     <span class="status">
       <slot name="status"></slot>
     </span>
    <hr/>
    <transition appear>
    <span class="button">
      <slot name="button">

      </slot>
    </span>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
  .headerContainer {
    margin-top: 30px;
    position: relative;
    padding: 0px;
    background-color: transparent;
    .button {
      position: absolute;
      top: 0px;
      right: 0px;
    }
    .border {
        position:absolute;
        width: 100%;
        height: 100%;
        border-bottom: 35px solid #504e5a;

        opacity: 0.1;
    }
    .title {
      background-color:transparent;
      padding-left: 5px;
      font-size: 35px !important;
      font-weight: 500 !important;
      line-height: 40px !important;
      letter-spacing: 2px;
      color: rgba(0,0,0,0.8) !important;
    }
    .caption {
      background-color: transparent;
      padding-left: 5px;
      line-height: 19px;
      color: rgba(0,0,0,0.6) !important;
      text-transform: uppercase;
      font-weight: 500;
      letter-spacing: 2px;
      padding-bottom: 10px;
    }
    .status {
      padding-left: 10px;
    }
    hr {
      margin-top: 30px;
      margin-bottom: 50px;
      opacity: 0.3;
    }
  }
</style>
