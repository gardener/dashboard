<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <svg xmlns="http://www.w3.org/2000/svg"
    aria-labelledby="Member Background"
    role="presentation"
  >
    <title>Member Background</title>
    <defs>
        <rect id="path-1" x="-7.5985156" y="-97.5650236" width="777" height="223.388149"></rect>
        <filter x="-0.9%" y="-2.2%" width="101.8%" height="106.3%" filterUnits="objectBoundingBox" id="filter-2">
            <feOffset dx="0" dy="2" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
            <feGaussianBlur stdDeviation="2" in="shadowOffsetOuter1" result="shadowBlurOuter1"></feGaussianBlur>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowBlurOuter1"></feColorMatrix>
        </filter>
        <rect id="path-3" x="-8.67104769" y="-155.611851" width="777" height="248"></rect>
        <filter x="-0.9%" y="-2.0%" width="101.8%" height="105.6%" filterUnits="objectBoundingBox" id="filter-4">
            <feOffset dx="0" dy="2" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
            <feGaussianBlur stdDeviation="2" in="shadowOffsetOuter1" result="shadowBlurOuter1"></feGaussianBlur>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowBlurOuter1"></feColorMatrix>
        </filter>
        <rect id="path-5" x="-126.579245" y="-63.8207564" width="874.784022" height="202.075377"></rect>
        <filter x="-1.3%" y="-4.7%" width="102.6%" height="111.4%" filterUnits="objectBoundingBox" id="filter-6">
            <feOffset dx="0" dy="2" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
            <feGaussianBlur stdDeviation="3.5" in="shadowOffsetOuter1" result="shadowBlurOuter1"></feGaussianBlur>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowBlurOuter1"></feColorMatrix>
        </filter>
    </defs>
    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="add_user_background">
            <rect id="Rectangle" :fill="desaturatedColor(20)" x="-18" y="-16" width="777" height="290"></rect>
            <g id="Rectangle" transform="translate(380.901484, 14.129051) rotate(5.000000) translate(-380.901484, -14.129051) ">
                <use fill="black" fill-opacity="1" filter="url(#filter-2)" xlink:href="#path-1"></use>
                <use :fill="desaturatedColor(10)" fill-rule="evenodd" xlink:href="#path-1"></use>
            </g>
            <g id="Rectangle" transform="translate(379.828952, -31.611851) rotate(5.000000) translate(-379.828952, 31.611851) ">
                <use fill="black" fill-opacity="1" filter="url(#filter-4)" xlink:href="#path-3"></use>
                <use :fill="desaturatedColor(30)" fill-rule="evenodd" xlink:href="#path-3"></use>
            </g>
            <g id="Rectangle" transform="translate(310.812766, 37.216932) rotate(-9.000000) translate(-310.812766, -37.216932) ">
                <use fill="black" fill-opacity="1" filter="url(#filter-6)" xlink:href="#path-5"></use>
                <use :fill="color" fill-rule="evenodd" xlink:href="#path-5"></use>
            </g>
        </g>
    </g>
  </svg>
</template>

<script>
import tinycolor from 'tinycolor2'

export default {
  props: {
    width: {
      type: [Number, String],
      default: 720
    },
    height: {
      type: [Number, String],
      default: 200
    }
  },
  computed: {
    color () {
      return this.$vuetify.theme.currentTheme.accent
    },
    viewBox () {
      return `0 0 ${this.width} ${this.height}`
    }
  },
  methods: {
    desaturatedColor (value) {
      return tinycolor(this.color).desaturate(value).toString()
    }
  }
}
</script>
