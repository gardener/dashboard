#!/usr/bin/env node
//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
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
    ingress: {
      annotations: {
        'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
        'nginx.ingress.kubernetes.io/use-port-in-redirects': 'true',
        'kubernetes.io/ingress.class': 'nginx'
      },
      hosts: [
        'gardener.garden.example.org'
      ],
      tls: {
        secretName: 'default-gardener-dashboard-tls'
      }
    },
    sessionSecret: 'sessionSecret',
    secret: 'secret',
    oidc: {
      issuerUrl: 'https://identity.garden.example.org',
      clientId: 'dashboard',
      clientSecret: 'dashboardSecret',
      redirectUri: 'https://gardener.garden.example.org/auth/callback',
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
  const chart = 'gardener-dashboard'
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
      let templates

      beforeEach(() => {
        templates = [
          'configmap'
        ]
      })

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
        const documents = await helmTemplate(chart, templates, filename)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        expect(configMap.metadata.name).toBe(name)
        const config = yaml.safeLoad(configMap.data['config.yaml'])

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
        const documents = await helmTemplate(chart, templates, filename)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        expect(configMap.metadata.name).toBe(name)
        const config = yaml.safeLoad(configMap.data['config.yaml'])

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
          const documents = await helmTemplate(chart, templates, filename)
          expect(documents).toHaveLength(1)
          const [configMap] = documents
          expect(configMap.metadata.name).toBe(name)
          const config = yaml.safeLoad(configMap.data['config.yaml'])

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
          const documents = await helmTemplate(chart, templates, filename)
          expect(documents).toHaveLength(1)
          const [configMap] = documents
          expect(configMap.metadata.name).toBe(name)
          const config = yaml.safeLoad(configMap.data['config.yaml'])

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
        beforeEach(() => {
          templates.push('secret-github')
        })

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

          const documents = await helmTemplate(chart, templates, filename)
          expect(documents).toHaveLength(2)
          const [configMap, githubSecret] = documents
          expect(configMap.metadata.name).toBe(name)
          expect(githubSecret.metadata.name).toBe('gardener-dashboard-github')
          const config = yaml.safeLoad(configMap.data['config.yaml'])

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

          const token = decodeBase64(githubSecret.data['authentication.token'])
          const webhookSecret = decodeBase64(githubSecret.data.webhookSecret)
          expect(token).toBe('webhookAuthenticationToken')
          expect(webhookSecret).toBe('webhookSecret')
        })
      })

      describe('unreachable seeds', function () {
        it('should render the template', async function () {
          // eslint-disable-next-line no-unused-vars
          const values = writeValues(filename, {
            unreachableSeeds: {
              matchLabels: {
                seed: 'unreachable'
              }
            }
          })

          const documents = await helmTemplate(chart, templates, filename)
          expect(documents).toHaveLength(1)
          const [configMap] = documents
          expect(configMap.metadata.name).toBe(name)
          const config = yaml.safeLoad(configMap.data['config.yaml'])

          const { unreachableSeeds } = config
          expect(unreachableSeeds).toEqual({
            matchLabels: {
              seed: 'unreachable'
            }
          })
        })
      })

      describe('alert', function () {
        it('should render the template', async function () {
          // eslint-disable-next-line no-unused-vars
          const values = writeValues(filename, {
            frontendConfig: {
              alert: {
                message: 'foo',
                type: 'warning'
              }
            }
          })

          const documents = await helmTemplate(chart, templates, filename)
          expect(documents).toHaveLength(1)
          const [configMap] = documents
          expect(configMap.metadata.name).toBe(name)
          const config = yaml.safeLoad(configMap.data['config.yaml'])

          const alert = config.frontend.alert
          expect(alert).toEqual({
            message: 'foo',
            type: 'warning'
          })
        })

        it('should render the template with identifier', async function () {
          // eslint-disable-next-line no-unused-vars
          const values = writeValues(filename, {
            frontendConfig: {
              alert: {
                message: 'foo',
                type: 'warning',
                identifier: 'bar'
              }
            }
          })

          const documents = await helmTemplate(chart, templates, filename)
          expect(documents).toHaveLength(1)
          const [configMap] = documents
          expect(configMap.metadata.name).toBe(name)
          const config = yaml.safeLoad(configMap.data['config.yaml'])

          const alert = config.frontend.alert
          expect(alert).toEqual({
            message: 'foo',
            type: 'warning',
            identifier: 'bar'
          })
        })
      })

      describe('terminal shortcuts', function () {
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

          const documents = await helmTemplate(chart, templates, filename)
          expect(documents).toHaveLength(1)
          const [configMap] = documents
          expect(configMap.metadata.name).toBe(name)
          const config = yaml.safeLoad(configMap.data['config.yaml'])

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

      describe('themes', function () {
        it('should render the template', async function () {
          // eslint-disable-next-line no-unused-vars
          const values = writeValues(filename, {
            frontendConfig: {
              themes: {
                light: {
                  primary: '#ff0000',
                  'main-navigation-title': 'grey.darken3'
                },
                dark: {
                  primary: '#ff0000',
                  'main-navigation-title': 'grey.darken3'
                }
              }
            }
          })

          const documents = await helmTemplate(chart, templates, filename)
          expect(documents).toHaveLength(1)
          const [configMap] = documents
          expect(configMap.metadata.name).toBe(name)
          const config = yaml.safeLoad(configMap.data['config.yaml'])

          const themes = config.frontend.themes
          expect(themes).toEqual({
            light: {
              primary: '#ff0000',
              'main-navigation-title': 'grey.darken3'
            },
            dark: {
              primary: '#ff0000',
              'main-navigation-title': 'grey.darken3'
            }
          })
        })

        it('should render the template with light theme values only', async function () {
          // eslint-disable-next-line no-unused-vars
          const values = writeValues(filename, {
            frontendConfig: {
              themes: {
                light: {
                  primary: '#ff0000',
                  'main-navigation-title': 'grey.darken3'
                }
              }
            }
          })

          const documents = await helmTemplate(chart, templates, filename)
          expect(documents).toHaveLength(1)
          const [configMap] = documents
          expect(configMap.metadata.name).toBe(name)
          const config = yaml.safeLoad(configMap.data['config.yaml'])

          const themes = config.frontend.themes
          expect(themes).toEqual({
            light: {
              primary: '#ff0000',
              'main-navigation-title': 'grey.darken3'
            }
          })
        })
      })
    })

    describe('ingress', function () {
      const name = 'gardener-dashboard-ingress'
      const tlsSecretName = 'gardener-dashboard-tls'

      let templates

      beforeEach(() => {
        templates = [
          'ingress',
          'secret-tls'
        ]
      })

      it('should render the template with tls', async function () {
        // eslint-disable-next-line no-unused-vars
        const values = writeValues(filename, {
          ingress: {
            tls: {
              secretName: tlsSecretName
            }
          }
        })
        const documents = await helmTemplate(chart, templates, filename)
        expect(documents).toHaveLength(2)
        const [ingress, tlsSecret] = chain(documents)
        expect(ingress.metadata.name).toBe(name)

        expect(ingress.spec.tls).toHaveLength(1)
        expect(ingress.spec.tls[0]).toEqual({
          secretName: tlsSecretName,
          hosts: ['gardener.garden.example.org']
        })

        expect(tlsSecret).toBeFalsy()
      })

      it('should render the template without tls', async function () {
        // eslint-disable-next-line no-unused-vars
        const values = writeValues(filename, {
          ingress: {
            tls: null
          }
        })
        const documents = await helmTemplate(chart, templates, filename)
        expect(documents).toHaveLength(2)
        const [ingress, tlsSecret] = documents
        expect(ingress.metadata.name).toBe(name)

        expect(ingress.spec.tls).toBeUndefined()

        expect(tlsSecret).toBeFalsy()
      })
    })

    describe('vpa', function () {
      const name = 'gardener-dashboard-vpa'

      let templates

      beforeEach(() => {
        templates = [
          'vpa'
        ]
      })

      it('should render the template', async function () {
        // eslint-disable-next-line no-unused-vars
        const values = writeValues(filename, {
          vpa: true
        })
        const documents = await helmTemplate(chart, templates, filename)
        expect(documents).toHaveLength(1)
        const [vpa] = documents
        expect(vpa.metadata.name).toBe(name)

        expect(vpa.spec).toEqual({
          targetRef: {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            name: 'gardener-dashboard'
          },
          updatePolicy: {
            updateMode: 'Auto'
          },
          resourcePolicy: {
            containerPolicies: [{
              containerName: 'gardener-dashboard',
              minAllowed: {
                cpu: expect.stringMatching(/^\d+m$/),
                memory: expect.stringMatching(/^\d+Mi$/)
              }
            }]
          }
        })
      })
      it('should not render the template', async function () {
        // eslint-disable-next-line no-unused-vars
        const values = writeValues(filename, {
          vpa: false
        })
        const documents = await helmTemplate(chart, templates, filename)
        expect(documents).toHaveLength(1)
        const [vpa] = documents
        expect(vpa).toBeFalsy()
      })
    })
  })
})
