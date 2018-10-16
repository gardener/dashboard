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
  <v-app>
    <v-content class="loginContainer">
      <v-layout row wrap style="height:100%">
        <v-flex class="left" xs5>
          <img src="../assets/logo.svg" class="logo">
          <h1>Gardener</h1>
          <h2 style="color:#009F76">The Kubernetes Botanist</h2>
        </v-flex>
        <v-flex class="right" xs7>
          <div row wrap>
            <h1>Enterprise-Grade Kubernetes Service</h1>
            <h2>Infrastructure agnostic and working across all major public clouds</h2>
          </div>
          <div row wrap class="title mt-5" v-if="landingPageUrl">
            Discover what our service is about at the
            <a style="color:#009F76; padding-left:10px" :href="landingPageUrl" target="_blank">Gardener Landing Page <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>
          </div>
          <div xs5 offset-xs2 right class="orange lighten-2 loginButton elevation-2" @click="handleLogin()">
            Login
            <v-icon right dark>mdi-login-variant</v-icon>
          </div>
        </v-flex>
      </v-layout>
    </v-content>
    <v-footer class="pa-4 footer--fixed" app>
      <img :src="footerLogoUrl" height="30px">
      <v-spacer></v-spacer>
      <div>&copy; {{ new Date().getFullYear() }}</div>
    </v-footer>
    <vue-snotify></vue-snotify>
  </v-app>
</template>

<script>
import { mapState } from 'vuex'
import { signin } from '@/utils/auth'
import { SnotifyPosition } from 'vue-snotify'

export default {
  computed: {
    ...mapState([
      'color',
      'cfg'
    ]),
    landingPageUrl () {
      return this.cfg.landingPageUrl
    },
    footerLogoUrl () {
      return this.cfg.footerLogoUrl || '/static/sap-logo.svg'
    }
  },
  methods: {
    handleLogin () {
      signin(this.$userManager)
        .catch(error => {
          this.showSnotifyLoginError(error.message)
          throw error
        })
    },
    showSnotifyLoginError (message) {
      const config = {
        position: SnotifyPosition.rightBottom,
        timeout: 5000,
        showProgressBar: false
      }
      this.$snotify.error(message, 'Login Error', config)
    }
  }
}
</script>

<style lang="styl" scoped>

  bg1 = #24232c
  bg2 = #504e5a

  font1 = #e9e0d5
  font2 = #958071

  hexArea = lighten(#D8D7DA,9)
  hexOutline = darken(hexArea,1)

  #app {
    height:100%;

    footer {
      background-color: transparent;
    }

    .loginContainer {
      background-color: #2c353d;
      height: 100%;

      .left {
        box-shadow: inset -29px 0 29px -19px rgba(0, 0, 0, 0.7);

        .logo {
          height: 20vw;
          pointer-events: none;
          display: block;
          margin: auto;
          margin-top: 100px;
        }

        h1 {
          font-size: 4vw;
          font-weight: 300;
          width: 100%;
          text-align: center;
          color: font1;
          letter-spacing: 5px;
        }

        h2 {
          font-size: 1.8vw;
          font-weight: 400;
          width: 100%;
          text-align: center;
        }

      }

      .right {
        padding-left: 50px;
        padding-top: 100px;
        background-color: white;
        padding-right: 0px;
        height: 100%;
        position: relative;
        background: radial-gradient(circle farthest-side at 0% 50%, hexArea 23.5%, rgba(240, 166, 17, 0) 0) 21px 30px,
        radial-gradient(circle farthest-side at 0% 50%, hexOutline 24%, rgba(240, 166, 17, 0) 0) 19px 30px,
        linear-gradient(hexArea 14%, rgba(240, 166, 17, 0) 0, rgba(240, 166, 17, 0) 85%, hexArea 0) 0 0,
        linear-gradient(150deg, hexArea 24%, hexOutline 0, hexOutline 26%, rgba(240, 166, 17, 0) 0, rgba(240, 166, 17, 0) 74%, hexOutline 0, hexOutline 76%, hexArea 0) 0 0,
        linear-gradient(30deg, hexArea 24%, hexOutline 0, hexOutline 26%, rgba(240, 166, 17, 0) 0, rgba(240, 166, 17, 0) 74%, hexOutline 0, hexOutline 76%, hexArea 0) 0 0,
        linear-gradient(90deg, hexOutline 2%, hexArea 0, hexArea 98%, hexOutline 0%) 0 0 hexOutline;
        background-size: 40px 60px;

        h1 {
          font-size: 2.5vw;
          width: 100%
          text-align: left;
          font-family: 'Roboto', sans-serif;
          color: bg2;
          white-space: nowrap;
          font-weight: 400;
        }

        h2 {
          font-size: 1.6vw;
          width: 100%
          text-align: left;
          font-weight: 400;
        }

        .loginButton {
          padding: 10px;
          background-color: #F1AB1C;
          padding-left: 40px;
          color: white
          font-size: 20px;
          cursor: pointer;
          bottom: 80px;
          position: absolute;
          right: 0px;
          width: 40%;
        }

        ul {
          padding: 0px;
          margin: 0px;
          padding-top: 60px;
          padding-bottom: 160px;
          list-style-type: none;
          font-size: 1.5vw;
          color: bg2;
          font-weight: 00;
        }

      }
    }
  }

  @import "~vue-snotify/styles/material.css"

  .snotify-rightTop {
    top: 75px;
  }

  .snotify-info {
    background-color: #0097A7; // cyan darken-2
  }

  .snotify {
    width: 400px;
  }

</style>
