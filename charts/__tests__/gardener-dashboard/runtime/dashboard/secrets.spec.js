//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mapValues } = require('lodash')
const { helm, helper } = fixtures
const {
  getPrivateKey,
  getCertificate,
  decodeBase64
} = helper

const renderTemplates = helm.renderDashboardRuntimeTemplates

describe('gardener-dashboard', function () {
  describe('secret-github', function () {
    let templates

    beforeEach(() => {
      templates = [
        'secret-github'
      ]
    })

    describe('token-auth', function () {
      it('should render the template', async function () {
        const values = {
          global: {
            dashboard: {
              gitHub: {
                authentication: {
                  token: 'token'
                },
                webhookSecret: 'webhook-secret'
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [githubSecret] = documents
        expect(githubSecret).toMatchSnapshot()
      })
    })

    describe('app-auth', function () {
      it('should render the template', async function () {
        const values = {
          global: {
            dashboard: {
              gitHub: {
                authentication: {
                  appId: 1,
                  clientId: 'clientId',
                  clientSecret: 'clientSecret',
                  installationId: 123,
                  privateKey: 'privateKey'
                },
                webhookSecret: 'webhook-secret'
              }
            }
          }
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [githubSecret] = documents
        const data = mapValues(githubSecret.data, decodeBase64)
        expect(data).toMatchSnapshot()
      })
    })
  })

  describe('secret-kubeconfig', function () {
    let templates

    beforeEach(() => {
      templates = [
        'secret-kubeconfig'
      ]
    })

    it('should render the template', async function () {
      const values = {
        global: {
          dashboard: {
            kubeconfig: 'apiVersion: v1'
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [kubeconfigSecret] = documents
      expect(kubeconfigSecret).toMatchSnapshot()
    })

    it('should not render the template', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [kubeconfigSecret] = documents
      expect(kubeconfigSecret).toBe(null)
    })
  })

  describe('secret-oidc', function () {
    let templates

    beforeEach(() => {
      templates = [
        'secret-oidc'
      ]
    })

    it('should render the template', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [oidcSecret] = documents
      expect(oidcSecret).toMatchSnapshot()
    })

    it('should render the template w/ `client_secret`', async function () {
      const values = {
        global: {
          dashboard: {
            oidc: {
              clientSecret: 'dashboardSecret'
            }
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [oidcSecret] = documents
      expect(oidcSecret.data).toMatchSnapshot()
    })
  })

  describe('secret-sessionSecret', function () {
    let templates

    beforeEach(() => {
      templates = [
        'secret-sessionSecret'
      ]
    })

    it('should render the template with default values', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [secret] = documents
      expect(secret).toMatchSnapshot()
    })

    it('should render the template with previous session secret', async function () {
      const values = {
        global: {
          dashboard: {
            sessionSecretPrevious: 'previous'
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [secret] = documents
      expect(secret.data).toMatchSnapshot()
    })
  })

  describe('secret-tls', function () {
    let templates
    const tlsKey = getPrivateKey('tls.key')
    const tlsCrt = getCertificate('tls.crt')

    beforeEach(() => {
      templates = [
        'secret-tls'
      ]
    })

    it('should render the templates', async function () {
      const values = {
        global: {
          dashboard: {
            ingress: {
              tls: {
                secretName: 'other-gardener-dashboard-tls',
                key: tlsKey,
                crt: tlsCrt
              }
            }
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [ingressSecret] = documents
      expect(ingressSecret).toMatchSnapshot()
    })
  })
})
