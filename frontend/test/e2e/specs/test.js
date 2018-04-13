//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

function assertClickStatus ({sessionId, status, value}) {
  this.assert.strictEqual(status, 0)
}

module.exports = {
  'default e2e tests': browser => {
    /* eslint camelcase: 0 */
    // automatically uses dev Server port from /config.index.js
    // default: http://localhost:8080
    // see nightwatch.conf.js
    const devServerUrl = browser.globals.devServerURL
    browser
      .url(devServerUrl)
      .waitForElementVisible('#app', 5 * 1000)
      .assert.elementPresent('.loginContainer')
      .assert.containsText('h1', 'Gardener')
      .assert.containsText('h2', 'The Kubernetes Botanist')
      .assert.elementCount('img.logo', 1)
      .click('.loginButton', assertClickStatus)
      .waitForElementVisible('input[type=password]', 5 * 1000)
      .setValue('input[type=text]', 'nightwatch@example.org')
      .setValue('input[type=password]', 'secret')
      .click('button[type=submit]', assertClickStatus)
      .waitForElementVisible('main h3', 5 * 1000)
      .assert.containsText('main h3', 'Let\'s get started')
      .assert.elementPresent('nav a[href="/account"]')
      .click('nav a[href="/account"]', assertClickStatus)
      .waitForElementVisible('i.mdi-account', 5 * 1000)
      .assert.containsText('.flex.xs5.offset-xs1 > p', 'nightwatch@example.org')
      .end()
  }
}
