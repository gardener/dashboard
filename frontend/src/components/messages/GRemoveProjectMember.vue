<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <template v-if="namespace && memberName">
      Do you want to remove the service account <em>{{ memberName }}</em> of namespace <em>{{ namespace }}</em>
      from the project <em>{{ projectNameAndTitle }}</em>?
    </template>
    <template v-else-if="memberName">
      Do you want to remove the user <em>{{ memberName }}</em> from the project <em>{{ projectNameAndTitle }}</em>?
    </template>
    <template v-else>
      Do you want to remove <span class="text-error font-weight-bold">yourself</span>
      from the project <em>{{ projectNameAndTitle }}</em>?
    </template>
  </div>
</template>

<script>
export default {
  props: {
    projectNameAndTitle: {
      type: String,
      required: true,
    },
    memberName: String,
    namespace: String,
  },
}
</script>
