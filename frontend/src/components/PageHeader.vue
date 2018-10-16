<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
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

<style lang="styl" scoped>
  font1 = #e9e0d5
  font2 = #958071
  bg1 = #24232c
  bg2 = #504e5a
  bright1 = #8989a0
  bright2 = #77788d

  .headerContainer {
    margin-top:30px
    position:relative
    padding:0px;
    background-color:transparent
    .button {
      position: absolute
      top: 0px
      right: 0px
    }
    .border {
        position:absolute
        width:100%
        height:100%
        border-bottom:35px solid bg2

        opacity:0.1
    }
    .title {
      background-color:transparent
      padding-left:5px
      font-size:35px !important
      font-weight:500 !important
      line-height:40px !important
      letter-spacing:2px
      color: rgba(0,0,0,0.8) !important
    }
    .caption {
      background-color:transparent
      padding-left:5px
      line-height:19px
      color: rgba(0,0,0,0.6) !important
      text-transform:uppercase
      font-weight:500
      letter-spacing:2px
      padding-bottom:10px
    }
    .status {
      padding-left:10px
    }
    hr {
      margin-top:30px
      margin-bottom:50px
      opacity:0.3
    }
  }
</style>
