<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    To reduce expenses, this <span class="font-weight-bold">{{ purposeText }}</span> cluster should have a hibernation schedule.
    <template v-if="showNavigationLink">
      Please navigate to the cluster details page to
      <g-text-router-link
        :to="{ name: 'ShootItemHibernationSettings', params: { name: shootName, namespace: shootNamespace } }"
        text="configure"
      />
      a hibernation schedule or explicitly deactivate scheduled hibernation for this cluster.
    </template>
  </div>
</template>

<script>
import GTextRouterLink from '@/components/GTextRouterLink.vue'

export default {
  components: {
    GTextRouterLink,
  },
  props: {
    purposeText: {
      type: String,
      required: true,
    },
    shootName: {
      type: String,
      required: true,
    },
    shootNamespace: {
      type: String,
      required: true,
    },
    showNavigationLink: {
      type: Boolean,
      required: true,
    },
  },
}
</script>
