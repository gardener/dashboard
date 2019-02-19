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
  <v-tooltip top>
    <v-chip slot="activator" small class="my-0" outline color="cyan darken-2">{{workerGroup.name}}</v-chip>
    <span v-for="(line,index) in description" :key="index">{{line}}<br /></span>
  </v-tooltip>
</template>

<script>

export default {
  props: {
    workerGroup: {
      type: Object
    }
  },
  computed: {
    description () {
      const description = []
      if (this.workerGroup.machineType) {
        description.push(`Machine Type: ${this.workerGroup.machineType}`)
      }
      if (this.workerGroup.volumeType && this.workerGroup.volumeSize) {
        description.push(`Volume Type: ${this.workerGroup.volumeType} (${this.workerGroup.volumeSize})`)
      }
      if (this.workerGroup.autoScalerMin && this.workerGroup.autoScalerMax) {
        description.push(`Autoscaler Min: ${this.workerGroup.autoScalerMin} / Max: ${this.workerGroup.autoScalerMax}`)
      }
      return description
    }
  }
}
</script>
