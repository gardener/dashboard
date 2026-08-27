<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    Do you want to remove <em>{{ name }}</em> as project member and delete the service account?<br>This will invalidate all issued tokens for this service account.
  </div>
</template>

<script>
export default {
  props: {
    name: {
      type: String,
      required: true,
    },
  },
}
</script>
