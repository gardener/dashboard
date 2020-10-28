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
  <div d-flex flex-row>
    <v-tooltip top v-for="{ displayName, notEditable, tooltip } in roleDisplayNames" :key="displayName" :disabled="!tooltip">
      <template v-slot:activator="{ on }">
        <v-chip v-on="on" class="mr-3" small :color="notEditable ? 'grey' : 'black'" outlined>
          {{displayName}}
        </v-chip>
      </template>
      <span>{{tooltip}}</span>
    </v-tooltip>
  </div>
</template>

<script>
export default {
  name: 'role-display-names',
  props: {
    roleDisplayNames: {
      type: Array,
      required: true
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
