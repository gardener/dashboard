//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const yaml = require('js-yaml')
const { omit, pick } = require('lodash')
const { basename } = require('path')
const { helm, helper } = fixtures
const { getCertificate } = helper

const chart = basename(__dirname)
const renderTemplates = (templates, values) => helm.renderChartTemplates(chart, templates, values)

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
      expect(Object.keys(configMap.data)).toEqual(['config.yaml'])
      const config = yaml.safeLoad(configMap.data['config.yaml'])
      expect(config).toMatchSnapshot()
    })

    describe('kubeconfig download', function () {
      it('should render the template w/ `oidc.public`', async function () {
        const values = {
          apiServerCa: getCertificate('apiServerCa'),
          oidc: {
            public: {
              clientId: 'kube-kubectl',
              clientSecret: 'kube-kubectl-secret'
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(omit(config, ['frontend', 'terminal'])).toMatchSnapshot()
      })
    })

    describe('access restrictions', function () {
      it('should render the template w/o `item.options`', async function () {
        const values = {
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
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.accessRestriction'])).toMatchSnapshot()
      })

      it('should render the template w/ `item.options`', async function () {
        const values = {
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
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.accessRestriction'])).toMatchSnapshot()
      })
    })

    describe('tickets', function () {
      beforeEach(() => {
        templates.push('secret-github')
      })

      it('should render the template', async function () {
        const values = {
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
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(2)
        const [configMap, githubSecret] = documents
        expect(configMap.metadata.name).toBe(name)
        expect(githubSecret.metadata.name).toBe('gardener-dashboard-github')
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.ticket', 'gitHub'])).toMatchSnapshot()
        expect(githubSecret).toMatchSnapshot()
      })
    })

    describe('unreachable seeds', function () {
      it('should render the template', async function () {
        const values = {
          unreachableSeeds: {
            matchLabels: {
              seed: 'unreachable'
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(pick(config, ['unreachableSeeds'])).toMatchSnapshot()
      })
    })

    describe('alert', function () {
      it('should render the template w/o `alert.identifier`', async function () {
        const values = {
          frontendConfig: {
            alert: {
              message: 'foo',
              type: 'warning'
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.alert'])).toMatchSnapshot()
      })

      it('should render the template w/ `alert.identifier`', async function () {
        const values = {
          frontendConfig: {
            alert: {
              message: 'foo',
              type: 'warning',
              identifier: 'bar'
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        expect(configMap.metadata.name).toBe(name)
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.alert'])).toMatchSnapshot()
      })
    })

    describe('terminal shortcuts', function () {
      it('should render the template', async function () {
        const values = {
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
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.terminal.shortcuts'])).toMatchSnapshot()
      })
    })

    describe('themes', function () {
      it('should render the template', async function () {
        const values = {
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
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.themes'])).toMatchSnapshot()
      })

      it('should render the template with light theme values only', async function () {
        const values = {
          frontendConfig: {
            themes: {
              light: {
                primary: '#ff0000',
                'main-navigation-title': 'grey.darken3'
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.themes'])).toMatchSnapshot()
      })

      it('should render the template with sla description markdown hyperlink', async function () {
        const values = {
          frontendConfig: {
            sla: {
              title: 'SLA title',
              description: '[foo](https://bar.baz)'
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.sla'])).toMatchSnapshot()
      })
    })

    describe('vendorHints', function () {
      it('should render the template', async function () {
        const values = {
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

        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.safeLoad(configMap.data['config.yaml'])
        expect(pick(config, ['frontend.vendorHints'])).toMatchSnapshot()
      })
    })
  })
})
