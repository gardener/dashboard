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
  <v-tooltip top v-if="staleSinceTimestamp">
    <template v-slot:activator="{ on }">
      <v-icon :small="small" v-on="on" :color="color" class="staleIcon" v-if="staleAutoDeleteTimestamp">mdi-delete-clock</v-icon>
      <v-icon :small="small" v-on="on" :color="color" class="staleIcon" v-else>mdi-clock-alert-outline</v-icon>
    </template>
     <span v-if="staleAutoDeleteTimestamp">
      This is a <span class="font-weight-bold">stale</span> project. Gardener will auto delete this project <span class="font-weight-bold"><time-string :date-time="staleAutoDeleteTimestamp" mode="future"></time-string></span>
    </span>
    <span v-else>
      This project is considered <span class="font-weight-bold">stale</span> since <span class="font-weight-bold"><time-string :date-time="staleSinceTimestamp" withoutPrefixOrSuffix></time-string></span>
    </span>
  </v-tooltip>
</template>

<script>
import { getProjectDetails } from '@/utils'
import TimeString from '@/components/TimeString'

export default {
  name: 'staleProjectWarning',
  components: {
    TimeString
  },
  props: {
    project: {
      type: Object
    },
    small: {
      type: Boolean
    },
    color: {
      type: String,
      default: 'teal'
    }
  },
  computed: {
    projectDetails () {
      return getProjectDetails(this.project)
    },
    staleSinceTimestamp () {
      return this.projectDetails.staleSinceTimestamp
    },
    staleAutoDeleteTimestamp () {
      return this.projectDetails.staleAutoDeleteTimestamp
    }
  }
}
</script>

<style lang="scss" scoped>
  .staleIcon {
    margin-left: 10px;
  }
</style>
