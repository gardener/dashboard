<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <g-popper
    :title="lbClass.name"
    toolbarColor="cyan darken-2"
    :popperKey="`lbclass_${lbClass.name}`"
  >
    <span slot="content-before">
      <span class="font-weight-bold">Floating Subnet ID:</span> {{lbClass.floatingSubnetID}}
    </span>
    <v-chip slot="popperRef" small class="cursor-pointer my-0 ml-0" outline color="cyan darken-2">{{lbClass.name}}</v-chip>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper'

export default {
  name: 'lb-class',
  components: {
    GPopper
  },
  props: {
    lbClass: {
      type: Object
    }
  }
}
</script>

<style lang="styl" scoped>
  .cursor-pointer >>> .v-chip__content {
    cursor: pointer;
  }
</style>
