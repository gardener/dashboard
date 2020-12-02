<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <svg xmlns="http://www.w3.org/2000/svg"
    :width="width"
    :height="height"
    viewBox="0 0 359 285"
    :aria-labelledby="iconName"
    role="presentation"
  >
    <title
    :id="iconName"
    lang="en"
  >{{ iconName }} icon</title>
    <g id="Logo_1_">
      <g id="Bildmarke">
        <polygon opacity="0.6" :fill="color1" points="110,65.2 21.8,107.7 0,203.2 61.1,279.7 159,279.7 220,203.2 198.3,107.7"/>
        <polygon opacity="0.6" :fill="color1" points="243,65.2 154.8,107.7 133,203.2 194.1,279.7 292,279.7 353.1,203.2 331.3,107.7"/>
        <polygon opacity="0.6" :fill="color2" points="176.5,0 61.5,55.4 33.1,179.9 112.7,279.7 240.4,279.7 320,179.9 291.6,55.4"/>
        <g id="Pictogramm">
          <path fill-rule="evenodd" clip-rule="evenodd" :fill="color3" d="M176.5,163.2l-32.3,18.7l-32.3-18.7v-14.3l64.6-37.3l64.6,37.3v14.3l-32.3,18.7L176.5,163.2L176.5,163.2z
            M124.3,156l20,11.5l32.3-18.7l32.3,18.7l20-11.5l-52.3-30.2L124.3,156z"/>
          <polygon opacity="0.5" fill-rule="evenodd" clip-rule="evenodd" :fill="color3" points="176.5,191.7 144.2,210.4 111.9,191.7 111.9,177.4 144.2,196.1 176.5,177.4 208.8,196.1 241.2,177.4
            241.2,191.7 208.8,210.4"/>
          <polygon opacity="0.5" fill-rule="evenodd" clip-rule="evenodd" :fill="color3" points="176.5,220.3 144.2,238.9 111.9,220.3 111.9,206 144.2,224.7 176.5,206 208.8,224.7 241.2,206
            241.2,220.3 208.8,238.9"/>
        </g>
      </g>
    </g>
  </svg>
</template>

<script>
import tinycolor from 'tinycolor2'

export default {
  data () {
    return {
      iconName: 'metal'
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
    color1 () {
      return this.adjustColor(10) || '#009FE3'
    },
    color2 () {
      return this.adjustColor(20) || '#0063A5'
    },
    color3 () {
      return this.iconColorCode || '#FFFFFF'
    }
  },
  methods: {
    adjustColor (value) {
      if (!this.iconColorCode) {
        return undefined
      }
      const color = tinycolor(this.iconColorCode)
      if (color.isLight()) {
        return color.darken(value).toString()
      }
      return color.lighten(value).toString()
    }
  }
}
</script>
