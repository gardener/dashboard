//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const {
  helm,
  helper,
  'gardener-dashboard': defaults
} = fixtures
const { getPrivateKey, getCertificate } = helper

const renderTemplates = helm.renderDashboardRuntimeTemplates

describe('gardener-dashboard', function () {
  describe('ingress', function () {
    const name = 'gardener-dashboard-ingress'
    const tlsSecretName = 'other-gardener-dashboard-tls'

    let templates

    beforeEach(() => {
      templates = [
        'ingress',
        'secret-tls'
      ]
    })

    it('should render the template with tls and a secret', async function () {
      const values = {
        global: {
          dashboard: {
            ingress: {
              tls: {
                secretName: tlsSecretName,
                key: getPrivateKey('tls.key'),
                crt: getCertificate('tls.crt')
              }
            }
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(2)
      const [ingress, tlsSecret] = documents
      expect(ingress).toMatchSnapshot()
      expect(tlsSecret).toMatchSnapshot()
    })

    it('should render the template with tls', async function () {
      const values = {
        global: {
          dashboard: {
            ingress: {
              tls: {
                secretName: tlsSecretName
              }
            }
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(2)
      const [ingress, tlsSecret] = documents
      expect(ingress.metadata.name).toBe(name)

      expect(ingress.spec.tls).toHaveLength(1)
      expect(ingress.spec.tls[0]).toEqual({
        secretName: tlsSecretName,
        hosts: defaults.global.dashboard.ingress.hosts
      })

      expect(tlsSecret).toBe(null)
    })

    it('should render the template without tls', async function () {
      const values = {
        global: {
          dashboard: {
            ingress: {
              tls: null
            }
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(2)
      const [ingress, tlsSecret] = documents
      expect(ingress.metadata.name).toBe(name)

      expect(ingress.spec.tls).toBeUndefined()

      expect(tlsSecret).toBe(null)
    })

    it('should render the template nginx class', async function () {
      templates = ['ingress']

      const ingressClassName = 'my-class'
      const values = {
        global: {
          dashboard: {
            ingress: {
              ingressClassName
            }
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [ingress] = documents
      expect(ingress.spec.ingressClassName).toBe(ingressClassName)
    })
  })
})
