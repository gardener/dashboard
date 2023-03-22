//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const yaml = require('js-yaml')
const { omit, pick } = require('lodash')
const { helm, helper } = fixtures
const { getCertificate } = helper

const renderTemplates = helm.renderDashboardRuntimeTemplates

describe('gardener-dashboard', function () {
  describe('configmap', function () {
    const name = 'gardener-dashboard-configmap'
    let templates

    beforeEach(() => {
      templates = [
        'configmap'
      ]
    })

    it('should render the template w/ defaults values', async function () {
      const documents = await renderTemplates(templates, {})
      expect(documents).toHaveLength(1)
      const [configMap] = documents
      expect(omit(configMap, ['data'])).toMatchSnapshot()
      expect(Object.keys(configMap.data)).toEqual(['login-config.json', 'config.yaml'])
      const loginConfig = configMap.data['login-config.json']
      expect(loginConfig).toMatchSnapshot()
      const config = yaml.load(configMap.data['config.yaml'])
      expect(config).toMatchSnapshot()
    })

    describe('kubeconfig download', function () {
      let values

      const assertTemplate = async () => {
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['apiServerCaData', 'oidc'])).toMatchSnapshot()
      }

      beforeEach(() => {
        values = {
          global: {
            dashboard: {
              apiServerCa: getCertificate('apiServerCa'),
              oidc: {
                public: {
                  clientId: 'kube-kubectl'
                }
              }
            }
          }
        }
      })

      it('should render the template w/ `public.client_secret`', async function () {
        Object.assign(values.global.dashboard.oidc.public, {
          clientSecret: 'kube-kubectl-secret'
        })
        expect.assertions(2)
        await assertTemplate()
      })

      it('should render the template w/o `public.client_secret`', async function () {
        expect.assertions(2)
        await assertTemplate()
      })

      it('should render the template with PKCE flow for the public client', async function () {
        Object.assign(values.global.dashboard.oidc.public, {
          clientSecret: 'kube-kubectl-secret',
          usePKCE: true
        })
        expect.assertions(2)
        await assertTemplate()
      })
    })

    describe('oidc', () => {
      let values

      const assertTemplate = async () => {
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['oidc'])).toMatchSnapshot()
      }

      beforeEach(() => {
        values = {
          global: {
            dashboard: {
              oidc: {}
            }
          }
        }
      })

      it('should render the template with default scope', async function () {
        expect.assertions(2)
        await assertTemplate()
      })

      it('should render the template with scope containing offline_access', async function () {
        Object.assign(values.global.dashboard.oidc, {
          scope: 'openid email groups offline_access',
          sessionLifetime: 30 * 24 * 60 * 60
        })
        expect.assertions(2)
        await assertTemplate()
      })

      it('should render the template with PKCE flow for the internal client', async function () {
        Object.assign(values.global.dashboard.oidc, {
          usePKCE: true
        })
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['oidc'])).toMatchSnapshot()
      })
    })

    describe('access restrictions', function () {
      it('should render the template w/o `item.options`', async function () {
        const values = {
          global: {
            dashboard: {
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
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.accessRestriction'])).toMatchSnapshot()
      })

      it('should render the template w/ `item.options`', async function () {
        const values = {
          global: {
            dashboard: {
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
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.accessRestriction'])).toMatchSnapshot()
      })
    })

    describe('token request', function () {
      it('should render the template', async function () {
        const values = {
          global: {
            dashboard: {
              frontendConfig: {
                serviceAccountDefaultTokenExpiration: 42
              },
              tokenRequestAudiences: ['foo', 'bar']
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.serviceAccountDefaultTokenExpiration', 'tokenRequestAudiences'])).toMatchSnapshot()
      })
    })

    describe('tickets', function () {
      beforeEach(() => {
        templates.push('secret-github')
      })

      it('should render the template', async function () {
        const values = {
          global: {
            dashboard: {
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
                pollIntervalSeconds: 60,
                syncThrottleSeconds: 10,
                syncConcurrency: 5,
                authentication: {
                  username: 'dashboard-tickets',
                  token: 'webhookAuthenticationToken'
                }
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(2)
        const [configMap, githubSecret] = documents
        expect(configMap.metadata.name).toBe(name)
        expect(githubSecret.metadata.name).toBe('gardener-dashboard-github')
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.ticket', 'gitHub'])).toMatchSnapshot()
        expect(githubSecret).toMatchSnapshot()
      })
    })

    describe('unreachable seeds', function () {
      it('should render the template', async function () {
        const values = {
          global: {
            unreachableSeeds: {
              matchLabels: {
                seed: 'unreachable'
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['unreachableSeeds'])).toMatchSnapshot()
      })
    })

    describe('alert', function () {
      it('should render the template w/o `alert.identifier`', async function () {
        const values = {
          global: {
            dashboard: {
              frontendConfig: {
                alert: {
                  message: 'foo',
                  type: 'warning'
                }
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.alert'])).toMatchSnapshot()
      })

      it('should render the template w/ `alert.identifier`', async function () {
        const values = {
          global: {
            dashboard: {
              frontendConfig: {
                alert: {
                  message: 'foo',
                  type: 'warning',
                  identifier: 'bar'
                }
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        expect(configMap.metadata.name).toBe(name)
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.alert'])).toMatchSnapshot()
      })
    })

    describe('terminal shortcuts', function () {
      it('should render the template', async function () {
        const values = {
          global: {
            dashboard: {
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
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.terminal.shortcuts'])).toMatchSnapshot()
      })
    })

    describe('terminal config', function () {
      it('should render the template', async function () {
        const values = {
          global: {
            terminal: {
              bootstrap: {
                disabled: false
              },
              container: {
                image: 'chart-test:0.1.0'
              },
              garden: {
                operatorCredentials: {
                  serviceAccountRef: {
                    name: 'robot',
                    namespace: 'garden'
                  }
                }
              },
              gardenTerminalHost: {
                seedRef: 'my-seed'
              },
              serviceAccountTokenExpiration: 42
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['terminal'])).toMatchSnapshot()
      })
    })

    describe('themes', function () {
      it('should render the template', async function () {
        const values = {
          global: {
            dashboard: {
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
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.themes'])).toMatchSnapshot()
      })

      it('should render the template with light theme values only', async function () {
        const values = {
          global: {
            dashboard: {
              frontendConfig: {
                themes: {
                  light: {
                    primary: '#ff0000',
                    'main-navigation-title': 'grey.darken3'
                  }
                }
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.themes'])).toMatchSnapshot()
      })

      it('should render the template with sla description markdown hyperlink', async function () {
        const values = {
          global: {
            dashboard: {
              frontendConfig: {
                sla: {
                  title: 'SLA title',
                  description: '[foo](https://bar.baz)'
                }
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.sla'])).toMatchSnapshot()
      })
    })

    describe('vendorHints', function () {
      it('should render the template', async function () {
        const values = {
          global: {
            dashboard: {
              frontendConfig: {
                vendorHints: [
                  {
                    matchNames: [
                      'foo',
                      'bar'
                    ],
                    message: '[foo](https://bar.baz)',
                    severity: 'warning'
                  },
                  {
                    matchNames: [
                      'fooz'
                    ],
                    message: 'other message'
                  }
                ]
              }
            }
          }
        }

        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.vendorHints'])).toMatchSnapshot()
      })
    })

    describe('clusterIdentity', function () {
      it('should render the template', async function () {
        const clusterIdentity = 'my-lanscape-dev'
        const values = {
          global: {
            dashboard: {
              clusterIdentity
            }
          }
        }

        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(config.clusterIdentity).toBe(clusterIdentity)
      })
    })

    describe('resourceQuotaHelp', function () {
      it('should render the template with resourceQuotaHelp markdown', async function () {
        const values = {
          global: {
            dashboard: {
              frontendConfig: {
                resourceQuotaHelp: {
                  text: '[foo](https://bar.baz)'
                }
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.resourceQuotaHelp'])).toMatchSnapshot()
      })
    })

    describe('controlPlaneHighAvailabilityHelp', function () {
      it('should render the template with controlPlaneHighAvailabilityHelp markdown', async function () {
        const values = {
          global: {
            dashboard: {
              frontendConfig: {
                controlPlaneHighAvailabilityHelp: {
                  text: '[foo](https://bar.baz)'
                }
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.controlPlaneHighAvailabilityHelp'])).toMatchSnapshot()
      })
    })

    describe('knownConditions', function () {
      it('should render the template with knownConditions markdown', async function () {
        const values = {
          global: {
            dashboard: {
              frontendConfig: {
                knownConditions: {
                  ExampleConditionReady: {
                    name: 'Example',
                    shortName: 'E',
                    description: 'Example Description',
                    showAdmin: false,
                    sortOrder: '99'
                  }
                }
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.knownConditions'])).toMatchSnapshot()
      })
    })
  })
})
