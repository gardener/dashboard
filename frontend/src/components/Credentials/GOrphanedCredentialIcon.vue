<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top">
    <template #activator="{ props: activatorProps }">
      <v-icon
        v-bind="activatorProps"
        icon="mdi-alert-circle-outline"
        end
        size="small"
        color="warning"
      />
    </template>
    Associated credential does not exist
  </v-tooltip>
</template>
