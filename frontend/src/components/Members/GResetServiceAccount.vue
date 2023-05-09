<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    Do you want to reset the service account <em>{{name}}</em>?<br />This will delete and recreate the service account. The member roles will not change. Attention: The current kubeconfig credentials will be revoked
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
