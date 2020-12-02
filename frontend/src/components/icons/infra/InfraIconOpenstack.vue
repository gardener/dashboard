<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <svg xmlns="http://www.w3.org/2000/svg"
    :width="width"
    :height="height"
    viewBox="-10 10 204 200"
    :aria-labelledby="iconName"
    role="presentation"
  >
    <title
    :id="iconName"
    lang="en"
  >{{ iconName }} icon</title>
    <g
     style="opacity:0.98000004"
     transform="translate(0,19.649994)">
    <path
       d="m 461.82,215.24 h -150 a 17.17,17.17 0 0 0 -17.12,17.12 v 40.35 h 41.61 v -6.59 a 9.26,9.26 0 0 1 9.26,-9.26 h 82.53 a 9.26,9.26 0 0 1 9.26,9.26 v 6.59 H 479 v -40.35 a 17.18,17.18 0 0 0 -17.18,-17.12 z"
       transform="translate(-294.67,-215.24)"
       id="path4153"
       inkscape:connector-curvature="0"
       :fill="color" />
    <path
       d="m 437.33,344.72 a 9.27,9.27 0 0 1 -9.26,9.26 h -82.53 a 9.27,9.27 0 0 1 -9.26,-9.26 v -6.59 h -41.61 v 40.34 a 17.17,17.17 0 0 0 17.12,17.13 h 150 A 17.18,17.18 0 0 0 479,378.47 v -40.34 h -41.67 z"
       transform="translate(-294.67,-215.24)"
       id="path4155"
       inkscape:connector-curvature="0"
       :fill="color" />
    <rect
       y="69.370003"
       width="41.619999"
       height="41.619999"
       id="rect4157"
       x="0"
       :fill="color" />
    <rect
       x="142.66"
       y="69.370003"
       width="41.619999"
       height="41.619999"
       id="rect4159"
       :fill="color" />
   </g>
  </svg>
</template>

<script>

export default {
  data () {
    return {
      iconName: 'openstack'
    }
  },
  props: {
    width: {
      type: Number
    },
    height: {
      type: Number
    },
    iconColorCode: {
      type: String
    }
  },
  computed: {
    color () {
      return this.iconColorCode || '#ed1944'
    }
  }
}
</script>
