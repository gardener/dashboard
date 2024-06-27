<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <div class="health-bar-container">
    <div class="x-axis" />
    <div class="health-bar">
      <div
        v-for="(condition, index) in conditions"
        :key="index"
        :class="['health-segment', getStateClass(condition)]"
        :style="healthSegmentStyles"
      >
        <v-tooltip
          :text="condition.shortName"
          location="top"
          activator="parent"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { isEmpty } from '@/lodash'

export default {
  name: 'HealthBar',
  props: {
    conditions: {
      type: Array,
      required: true,
    },
  },
  computed: {
    healthSegmentStyles () {
      return {
        width: `${100 / this.conditions.length}%`,
      }
    },
  },
  methods: {
    getState (condition) {
      if (condition.status === 'False' || !isEmpty(condition.codes)) {
        return 'error'
      }
      if (condition.status === 'Progressing') {
        return 'progressing'
      }
      if (condition.status === 'True') {
        return 'ok'
      }
      return 'unknown'
    },
    getStateClass (condition) {
      return this.getState(condition)
    },
  },
}
</script>

<style scoped>
.health-bar-container {
  position: relative;
  height: 40px;
  width: 80px;
}
.health-bar {
  display: flex;
}
.health-segment {
  margin: 1px;
  z-index: 1;
  transition: all .5s;
}

.health-segment:hover {
  opacity: 0.8;
}

.x-axis {
  position: absolute;
  bottom: 19px;
  height: 2px;
  left: 1px;
  right: 1px;
  background-color: rgba(var(--v-border-color), .5);
  z-index: 0;
}

.ok {
  background-color: rgb(var(--v-theme-primary));
  height: 19px;
  margin-top: 0px;
}
.progressing {
  background-color: rgb(var(--v-theme-info));
  height: 9px;
  margin-top: 10px;
}
.error {
  background-color: rgb(var(--v-theme-error));
  height: 19px;
  margin-top: 21px;
}
.unknown {
  background-color: rgb(var(--v-theme-unknown));
  height: 10px;
  margin-top: 15px;
}
</style>
