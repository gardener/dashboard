#!/usr/bin/env node
//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
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

  beforeAll(function () {
    dirname = fs.mkdtempSync(path.join(os.tmpdir(), 'helm-'))
  })

  beforeEach(function () {
    const randomNumber = crypto.randomBytes(4).readUInt32LE(0)
    filename = path.join(dirname, `values-${randomNumber}.yaml`)
  })

  afterAll(function () {
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
        expect(apiServerUrl).toBe(values.apiServerUrl)
        expect(decodeBase64(apiServerCaData)).toBe(values.apiServerCa)
        expect(oidc.issuer).toBe(values.oidc.issuerUrl)
        expect(oidc.public.clientId).toBe(values.oidc.public.clientId)
        expect(oidc.public.clientSecret).toBe(values.oidc.public.clientSecret)
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
        expect(apiServerUrl).toBe(values.apiServerUrl)
        expect(apiServerCaData).toBeUndefined()
        expect(apiServerSkipTlsVerify).toBeUndefined()
        expect(oidc.issuer).toBe(values.oidc.issuerUrl)
        expect(oidc.public).toBeUndefined()
      })

      describe('access restrictions', function () {
        it('should render the template without options', async function () {
          // eslint-disable-next-line no-unused-vars
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
          expect(noItemsText).toBe('no items text')
          expect(items.length).toBe(1)
          expect(items[0]).toEqual({
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
          // eslint-disable-next-line no-unused-vars
          const values = writeValues(filename, {
            frontendConfig: {
              accessRestriction: {
                items: [
                  {
                    key: 'foo',
                    display: {
                      visibleIf: true,
                      title: 'display Foo',
                      description: 'display Foo description'
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
                          description: 'display Foo  Option 1 description'
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
                          visibleIf: true
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
          expect(items.length).toBe(1)
          expect(items[0]).toEqual({
            key: 'foo',
            display: {
              visibleIf: true,
              title: 'display Foo',
              description: 'display Foo description'
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
                  description: 'display Foo  Option 1 description'
                },
                input: {
                  title: 'input Foo Option 1',
                  description: 'input Foo  Option 1 description'
                }
              },
              {
                key: 'foo-option-2',
                display: {
                  visibleIf: true
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
          // eslint-disable-next-line no-unused-vars
          const values = writeValues(filename, {
            frontendConfig: {
              ticket: {
                avatarSource: 'gravatar',
                gitHubRepoUrl: 'https://github.com/gardener/tickets',
                hideClustersWithLabels: ['ignore1', 'ignore2'],
                newTicketLabels: ['default-label'],
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
          expect(ticket).toEqual({
            avatarSource: 'gravatar',
            gitHubRepoUrl: 'https://github.com/gardener/tickets',
            hideClustersWithLabels: ['ignore1', 'ignore2'],
            newTicketLabels: ['default-label'],
            issueDescriptionTemplate: 'issue description'
          })
          expect(gitHub).toEqual({
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
          expect(decodeBase64(username)).toBe('dashboard-tickets')
          expect(decodeBase64(token)).toBe('webhookAuthenticationToken')
          expect(decodeBase64(webhookSecret)).toBe('webhookSecret')
        })
      })

      describe('unreachableSeeds', function () {
        it('should render the template', async function () {
          // eslint-disable-next-line no-unused-vars
          const values = writeValues(filename, {
            unreachableSeeds: {
              matchLabels: {
                seed: 'unreachable'
              }
            }
          })

          const documents = await helmTemplate(template, filename)
          const config = chain(documents)
            .find(['metadata.name', name])
            .get('data["config.yaml"]')
            .thru(yaml.safeLoad)
            .value()
          const { unreachableSeeds } = config
          expect(unreachableSeeds).toEqual({
            matchLabels: {
              seed: 'unreachable'
            }
          })
        })
      })

      describe('terminal', function () {
        describe('shortcuts', function () {
          it('should render the template', async function () {
            // eslint-disable-next-line no-unused-vars
            const values = writeValues(filename, {
              frontendConfig: {
                terminal: {
                  shortcuts: [
                    {
                      title: 'title',
                      description: 'description',
                      target: 'foo-target',
                      container: {
                        command: [
                          'command'
                        ],
                        image: 'repo:tag',
                        args: [
                          'a',
                          'b',
                          'c'
                        ]
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
                terminal: {
                  shortcuts
                }
              }
            } = config
            expect(shortcuts).toEqual([
              {
                title: 'title',
                description: 'description',
                target: 'foo-target',
                container: {
                  image: 'repo:tag',
                  command: [
                    'command'
                  ],
                  args: [
                    'a',
                    'b',
                    'c'
                  ]
                }
              }
            ])
          })
        })
      })
    })
  })
})
