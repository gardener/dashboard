<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <div>
    <v-row v-for="{ key, title, description, options } in selectedAccessRestrictions" :key="key" class="mx-0 mb-1">
      <v-tooltip
        top
        :disabled="!description"
        max-width="600px"
      >
        <template v-slot:activator="{ on }">
          <v-chip
            v-on="on"
            small
            outlined
            color="cyan darken-2"
            class="mr-2 mb-1"
          >{{title}}</v-chip>
        </template>
        {{description}}
      </v-tooltip>
      <v-tooltip
        v-for="{ key: optionsKey, title, description } in options"
        :key="`${key}_${optionsKey}`"
        top
        :disabled="!description"
        max-width="600px"
      >
        <template v-slot:activator="{ on }">
          <v-chip
            v-on="on"
            small
            outlined
            color="cyan darken-2"
            class="mr-2"
          >{{title}}</v-chip>
        </template>
        {{description}}
      </v-tooltip>
    </v-row>
  </div>
</template>

<script>

export default {
  props: {
    selectedAccessRestrictions: {
      type: Array
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
