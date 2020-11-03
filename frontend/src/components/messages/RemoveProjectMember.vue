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
    <template v-if="namespace && name">
      Do you want to remove the service account <i>{{name}}</i> of namespace <i>{{namespace}}</i>
      from the project <i>{{projectName}</i>?
    </template>
    <template v-else-if="name">
      Do you want to remove the user <i>{{memberName}}</i> from the project <i>{{projectName}}</i>?
    </template>
    <template v-else>
      Do you want to remove <span class="red--text text--darken-2 font-weight-bold">yourself</span>
      from the project <i>{{projectName}}</i>?
    </template>
  </div>
</template>

<script>
export default {
  props: {
    projectName: {
      type: String,
      required: true
    },
    name: String,
    namespace: String
  }
}
</script>
