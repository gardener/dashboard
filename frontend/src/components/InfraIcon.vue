<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span style="vertical-align:middle">
    <infra-icon-aws v-if="value==='aws'" :width="size" :height="size" :iconColorCode="iconColorCode"></infra-icon-aws>
    <infra-icon-azure v-if="value==='azure'" :width="size" :height="size" :iconColorCode="iconColorCode"></infra-icon-azure>
    <infra-icon-gcp v-if="value==='gcp'" :width="size" :height="size" :iconColorCode="iconColorCode"></infra-icon-gcp>
    <infra-icon-openstack v-if="value==='openstack'" :width="size" :height="size" :iconColorCode="iconColorCode"></infra-icon-openstack>
    <infra-icon-alicloud v-if="value==='alicloud'" :width="size" :height="size" :iconColorCode="iconColorCode"></infra-icon-alicloud>
    <infra-icon-metal v-if="value==='metal'" :width="size" :height="size" :iconColorCode="iconColorCode"></infra-icon-metal>
    <infra-icon-vsphere v-if="value==='vsphere'" :width="size" :height="size" :iconColorCode="iconColorCode"></infra-icon-vsphere>
  </span>
</template>

<script>
import InfraIconAws from '@/components/icons/infra/InfraIconAws.vue'
import InfraIconAzure from '@/components/icons/infra/InfraIconAzure.vue'
import InfraIconGcp from '@/components/icons/infra/InfraIconGcp.vue'
import InfraIconOpenstack from '@/components/icons/infra/InfraIconOpenstack.vue'
import InfraIconAlicloud from '@/components/icons/infra/InfraIconAlicloud.vue'
import InfraIconMetal from '@/components/icons/infra/InfraIconMetal.vue'
import InfraIconVsphere from '@/components/icons/infra/InfraIconVsphere.vue'

import get from 'lodash/get'

export default {
  components: {
    InfraIconAws,
    InfraIconAzure,
    InfraIconGcp,
    InfraIconOpenstack,
    InfraIconAlicloud,
    InfraIconMetal,
    InfraIconVsphere
  },
  props: {
    value: {
      type: String
    },
    size: {
      type: Number,
      default: 20
    },
    iconColor: {
      type: String
    }
  },
  computed: {
    iconColorCode () {
      const iconColor = this.iconColor
      return get(this, ['$vuetify', 'theme', 'currentTheme', iconColor], iconColor)
    }
  }
}
</script>
