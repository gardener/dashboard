<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <span>
    <status-tag v-for="condition in filteredConditions" :condition="condition" :popper-key="condition.type" :key="condition.type" :popperPlacement="popperPlacement"></status-tag>
  </span>
</template>

<script>
import StatusTag from '@/components/StatusTag'
import isEmpty from 'lodash/isEmpty'
import filter from 'lodash/filter'

export default {
  components: {
    StatusTag
  },
  props: {
    conditions: {
      type: Array
    },
    popperPlacement: {
      type: String
    }
  },
  computed: {
    filteredConditions () {
      if (isEmpty(this.conditions)) {
        return []
      }
      return filter(this.conditions, condition => !!condition.lastTransitionTime)
    }
  }
}
</script>
