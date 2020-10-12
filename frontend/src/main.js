//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

// Polyfills
import 'core-js/stable'
import 'regenerator-runtime/runtime'

// Imports
import Vue from 'vue'
import './plugins/vuelidate'
import './plugins/shortkey'
import './plugins/snotify'
import './plugins/cookie'
import './plugins/bus'
import './plugins/auth'
import './plugins/storage'
import './plugins/yaml'
import App from './App'
import store from './store'
import createRouter from './router'

import 'fontsource-roboto'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/dist/vuetify.min.css'
import '@/sass/main.scss'

async function main () {
  const { default: Vuetify } = await import(process.env.NODE_ENV === 'development' ? 'vuetify' : 'vuetify/lib')

  Vue.use(Vuetify)

  const vuetify = new Vuetify({
    icons: {
      iconfont: 'mdi'
    }
  })

  Vue.config.productionTip = false

  new Vue({
    vuetify,
    store,
    router: createRouter(store),
    render: h => h(App)
  }).$mount('#app')
}

main()
