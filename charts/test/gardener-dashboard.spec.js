#!/usr/bin/env node
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

/* eslint-disable no-unused-expressions */
'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const yaml = require('js-yaml')
const { merge, chain } = require('lodash')

const ca = '-----BEGIN RSA PRIVATE KEY-----\nLi4u\n-----END RSA PRIVATE KEY-----'

function writeValues (filename, values = {}) {
  const defaultValues = {
    image: {
      tag: '1.26.0-dev-4d529c1'
    },
    apiServerUrl: 'https://api.garden.example.org',
    hosts: [
      'gardener.ingress.garden.example.org'
    ],
    ingress: {
      annotations: {
        'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
        'nginx.ingress.kubernetes.io/use-port-in-redirects': 'true',
        'kubernetes.io/ingress.class': 'nginx'
      }
    },
    sessionSecret: 'sessionSecret',
    secret: 'secret',
    oidc: {
      issuerUrl: 'https://identity.garden.example.org',
      clientId: 'dashboard',
      clientSecret: 'dashboardSecret',
      ca
    },
    frontendConfig: {
      landingPageUrl: 'https://gardener.cloud/',
      helpMenuItems: [
        {
          title: 'Getting Started',
          icon: 'description',
          url: 'https://gardener.cloud/about/'
        },
        {
          title: 'slack',
          icon: 'mdi-slack',
          url: 'https://kubernetes.slack.com/messages/gardener'
        },
        {
          title: 'Issues',
          icon: 'mdi-bug',
          url: 'https://github.com/gardener/dashboard/issues/'
        }
      ],
      externalTools: [
        {
          title: 'Applications and Services Hub',
          icon: 'apps',
          url: 'https://apps.garden.example.org/foo/bar{?namespace,name}'
        }
      ]
    }
  }
  values = merge(defaultValues, values)
  fs.writeFileSync(filename, yaml.safeDump(values, { skipInvalid: true }))
  return values
}

function decodeBase64 (data) {
  return Buffer.from(data, 'base64').toString('utf8')
}

describe('gardener-dashboard', function () {
  const template = 'gardener-dashboard'
  let dirname
  let filename

  before(function () {
    dirname = fs.mkdtempSync(path.join(os.tmpdir(), 'helm-'))
  })

  beforeEach(function () {
    const randomNumber = crypto.randomBytes(4).readUInt32LE(0)
    filename = path.join(dirname, `values-${randomNumber}.yaml`)
  })

  after(function () {
    fs.rmdirSync(dirname, {
      maxRetries: 100,
      recursive: true
    })
  })

  afterEach(function () {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename)
    }
  })

  describe('templates', function () {
    describe('configmap', function () {
      const name = 'gardener-dashboard-configmap'

      it('should render the template', async function () {
        const values = writeValues(filename, {
          apiServerCa: ca,
          oidc: {
            public: {
              clientId: 'kube-kubectl',
              clientSecret: 'kubeKubectlSecret'
            }
          }
        })
        const documents = await helmTemplate(template, filename)
        const config = chain(documents)
          .find(['metadata.name', name])
          .get('data["config.yaml"]')
          .thru(yaml.safeLoad)
          .value()
        const {
          apiServerUrl,
          apiServerCaData,
          oidc
        } = config
        expect(apiServerUrl).to.equal(values.apiServerUrl)
        expect(decodeBase64(apiServerCaData)).to.equal(values.apiServerCa)
        expect(oidc.issuer).to.equal(values.oidc.issuerUrl)
        expect(oidc.public.clientId).to.equal(values.oidc.public.clientId)
        expect(oidc.public.clientSecret).to.equal(values.oidc.public.clientSecret)
      })

      it('should render the template without kubeconfig download', async function () {
        const values = writeValues(filename, {})
        const documents = await helmTemplate(template, filename)
        const config = chain(documents)
          .find(['metadata.name', name])
          .get('data["config.yaml"]')
          .thru(yaml.safeLoad)
          .value()
        const {
          apiServerUrl,
          apiServerCaData,
          apiServerSkipTlsVerify,
          oidc
        } = config
        expect(apiServerUrl).to.equal(values.apiServerUrl)
        expect(apiServerCaData).to.be.undefined
        expect(apiServerSkipTlsVerify).to.be.undefined
        expect(oidc.issuer).to.equal(values.oidc.issuerUrl)
        expect(oidc.public).to.be.undefined
      })

      describe('access restrictions', function () {
        it('should render the template without options', async function () {
          const values = writeValues(filename, {
            frontendConfig: {
              accessRestriction: {
                noItemsText: 'no items text',
                items: [
                  {
                    key: 'foo',
                    display: {
                      visibleIf: true 
                    },
                    input: {
                      title: 'Foo'
                    }
                  }
                ]
              }
            }
          })
          const documents = await helmTemplate(template, filename)
          const config = chain(documents)
            .find(['metadata.name', name])
            .get('data["config.yaml"]')
            .thru(yaml.safeLoad)
            .value()
          const {
            frontend: {
              accessRestriction: {
                noItemsText,
                items
              }
            }
          } = config
          expect(noItemsText).to.equal('no items text')
          expect(items.length).to.equal(1)
          expect(items[0]).to.eql({
            key: 'foo',
            display: {
              visibleIf: true 
            },
            input: {
              title: 'Foo'
            }
          })
        })

        it('should render the template with options', async function () {
          const values = writeValues(filename, {
            frontendConfig: {
              accessRestriction: {
                items: [
                  {
                    key: 'foo',
                    display: {
                      visibleIf: true,
                      title: 'display Foo',
                      description: 'display Foo description',
                    },
                    input: {
                      title: 'input Foo',
                      description: 'input Foo description',
                      inverted: true
                    },
                    options: [
                      {
                        key: 'foo-option-1',
                        display: {
                          visibleIf: false,
                          title: 'display Foo Option 1',
                          description: 'display Foo  Option 1 description',
                        },
                        input: {
                          title: 'input Foo Option 1',
                          description: 'input Foo  Option 1 description',
                          inverted: false
                        }
                      },
                      {
                        key: 'foo-option-2',
                        display: {
                          visibleIf: true,
                        },
                        input: {
                          title: 'input Foo Option 2',
                          description: 'input Foo  Option 2 description',
                          inverted: true
                        }
                      }
                    ]
                  }
                ]
              }
            }
          })
          const documents = await helmTemplate(template, filename)
          const config = chain(documents)
            .find(['metadata.name', name])
            .get('data["config.yaml"]')
            .thru(yaml.safeLoad)
            .value()
          const {
            frontend: {
              accessRestriction: {
                items
              }
            }
          } = config
          expect(items.length).to.equal(1)
          expect(items[0]).to.eql({
            key: 'foo',
            display: {
              visibleIf: true,
              title: 'display Foo',
              description: 'display Foo description',
            },
            input: {
              title: 'input Foo',
              description: 'input Foo description',
              inverted: true
            },
            options: [
              {
                key: 'foo-option-1',
                display: {
                  visibleIf: false,
                  title: 'display Foo Option 1',
                  description: 'display Foo  Option 1 description',
                },
                input: {
                  title: 'input Foo Option 1',
                  description: 'input Foo  Option 1 description',
                }
              },
              {
                key: 'foo-option-2',
                display: {
                  visibleIf: true,
                },
                input: {
                  title: 'input Foo Option 2',
                  description: 'input Foo  Option 2 description',
                  inverted: true
                }
              }
            ]
          })
        })
      })

      describe('tickets', function () {
        it('should render the template', async function () {
          const values = writeValues(filename, {
            frontendConfig: {
              ticket: {
                gitHubRepoUrl: 'https://github.com/gardener/tickets',
                hideClustersWithLabel: 'ignore',
                issueDescriptionTemplate: 'issue description'
              }
            },
            gitHub: {
              apiUrl: 'https://github.com/api/v3/',
              org: 'gardener',
              repository: 'tickets',
              webhookSecret: 'webhookSecret',
              authentication: {
                username: 'dashboard-tickets',
                token: 'webhookAuthenticationToken'
              }
            }
          })

          const documents = await helmTemplate(template, filename)
          const config = chain(documents)
            .find(['metadata.name', name])
            .get('data["config.yaml"]')
            .thru(yaml.safeLoad)
            .value()
          const {
            frontend: {
              ticket
            },
            gitHub
          } = config
          expect(ticket).to.eql({
            gitHubRepoUrl: 'https://github.com/gardener/tickets',
            hideClustersWithLabel: 'ignore',
            issueDescriptionTemplate: 'issue description'
          })
          expect(gitHub).to.eql({
            apiUrl: 'https://github.com/api/v3/',
            org: 'gardener',
            repository: 'tickets'
          })

          const githubSecret = chain(documents)
          .find(['metadata.name', 'gardener-dashboard-github'])
          .get('data')
          .value()
          const {
            'authentication.username': username,
            'authentication.token': token,
            webhookSecret
          } = githubSecret
          expect(decodeBase64(username)).to.equal('dashboard-tickets')
          expect(decodeBase64(token)).to.equal('webhookAuthenticationToken')
          expect(decodeBase64(webhookSecret)).to.equal('webhookSecret')
        })
      })
    })
  })
})
