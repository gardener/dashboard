//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { helm } = fixtures

const renderTemplates = helm.renderDashboardRuntimeTemplates

describe('gardener-dashboard', function () {
  describe('deployment', function () {
    let templates

    beforeEach(() => {
      templates = [
        'deployment',
      ]
    })

    it('should render the template with default values', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      expect(deployment).toMatchSnapshot({
        spec: {
          template: {
            metadata: {
              annotations: {
                'checksum/configmap-gardener-dashboard-config': expect.stringMatching(/[0-9a-f]{64}/),
                'checksum/secret-gardener-dashboard-oidc': expect.stringMatching(/[0-9a-f]{64}/),
                'checksum/secret-gardener-dashboard-sessionSecret': expect.stringMatching(/[0-9a-f]{64}/),
              },
            },
          },
        },
      })
    })

    it('should render the template w/ `client_secret`', async function () {
      const values = {
        global: {
          dashboard: {
            oidc: {
              clientSecret: 'client-secret',
            },
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      const dashboardContainer = deployment.spec.template.spec.containers[0]
      expect(dashboardContainer.name).toEqual('gardener-dashboard')
      expect(dashboardContainer.env).toMatchSnapshot()
    })

    it('should render the template w/o `client_secret`', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      const dashboardContainer = deployment.spec.template.spec.containers[0]
      expect(dashboardContainer.name).toEqual('gardener-dashboard')
      expect(dashboardContainer.env).toMatchSnapshot()
    })

    it('should render the template with a sha256 tag', async function () {
      const tag = 'sha256:4d529c1'
      const values = {
        global: {
          dashboard: {
            image: { tag },
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      const containers = deployment.spec.template.spec.containers
      expect(containers).toHaveLength(1)
      const [container] = containers
      expect(container).toEqual(expect.objectContaining({
        image: 'europe-docker.pkg.dev/gardener-project/releases/gardener/dashboard@' + tag,
        imagePullPolicy: 'IfNotPresent',
      }))
    })

    it('should render the template with node options', async function () {
      const values = {
        global: {
          dashboard: {
            nodeOptions: ['--max-old-space-size=460', '--expose-gc', '--trace-gc', '--gc-interval=100'],
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      const containers = deployment.spec.template.spec.containers
      expect(containers).toHaveLength(1)
      const [container] = containers
      expect(container.args).toMatchSnapshot()
    })

    it('should render the template with an empty list node options', async function () {
      const values = {
        global: {
          dashboard: {
            nodeOptions: [],
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      const containers = deployment.spec.template.spec.containers
      expect(containers).toHaveLength(1)
      const [container] = containers
      expect(container.args).toBeUndefined()
    })

    it('should render the template with three replicas', async function () {
      const values = {
        global: {
          dashboard: {
            replicaCount: 3,
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      expect(deployment.spec.replicas).toBe(values.global.dashboard.replicaCount)
    })

    it('should render the template with deployment labels', async function () {
      const values = {
        global: {
          dashboard: {
            deploymentLabels: {
              a: 'b',
            },
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      expect(deployment.metadata.labels).toEqual(expect.objectContaining(values.global.dashboard.deploymentLabels))
    })

    it('should render the template with assets checksum annotation', async function () {
      const values = {
        global: {
          dashboard: {
            frontendConfig: {
              assets: {
                foo: 'bar',
              },
            },
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      expect(deployment.spec.template.metadata.annotations).toEqual(expect.objectContaining({
        'checksum/configmap-gardener-dashboard-assets': expect.stringMatching(/[0-9a-f]{64}/),
      }))
    })

    it('should render the template with deployment annotations', async function () {
      const values = {
        global: {
          dashboard: {
            deploymentAnnotations: {
              a: 'b',
            },
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      expect(deployment.metadata.annotations).toEqual(expect.objectContaining(values.global.dashboard.deploymentAnnotations))
    })

    it('should render the template with affinity', async function () {
      const values = {
        global: {
          dashboard: {
            affinity: {
              podAntiAffinity: {
                preferredDuringSchedulingIgnoredDuringExecution: [{
                  weight: 100,
                  podAffinityTerm: {
                    topologyKey: 'kubernetes.io/hostname',
                  },
                }],
              },
            },
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      expect(deployment.spec.template.spec.affinity).toEqual(values.global.dashboard.affinity)
    })

    it('should render the template with securityContext', async function () {
      const values = {
        global: {
          dashboard: {
            securityContext: {
              allowPrivilegeEscalation: false,
              capabilities: {
                drop: ['ALL'],
              },
            },
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      expect(deployment.spec.template.spec.containers[0].securityContext).toEqual(values.global.dashboard.securityContext)
    })

    it('should render the template with podSecurityContext', async function () {
      const values = {
        global: {
          dashboard: {
            podSecurityContext: {
              runAsNonRoot: true,
              runAsUser: 65532,
              runAsGroup: 65532,
              fsGroup: 65532,
              seccompProfile: {
                type: 'RuntimeDefault',
              },
            },
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      expect(deployment.spec.template.spec.securityContext).toEqual(values.global.dashboard.podSecurityContext)
    })

    describe('kubeconfig', function () {
      it('should render the template', async function () {
        const values = {
          global: {
            dashboard: {
              kubeconfig: 'apiVersion: v1',
            },
          },
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [deployment] = documents
        expect(deployment.spec.template.spec.automountServiceAccountToken).toBe(false)
        const volumes = deployment.spec.template.spec.volumes
        expect(volumes).toHaveLength(6)
        const [, , , , , kubeconfigVolume] = volumes
        expect(kubeconfigVolume).toMatchSnapshot()
        const containers = deployment.spec.template.spec.containers
        expect(containers).toHaveLength(1)
        const [container] = containers
        expect(container.volumeMounts).toHaveLength(6)
        const [, , , , kubeconfigVolumeMount] = container.volumeMounts
        expect(kubeconfigVolumeMount).toMatchSnapshot()
        expect(container.env).toHaveLength(5)
        const [, kubeconfigEnv] = container.env
        expect(kubeconfigEnv).toMatchSnapshot()
      })
    })

    it('should not project service account token if disabled', async function () {
      const values = {
        global: {
          dashboard: {
            serviceAccountTokenVolumeProjection: {
              enabled: false,
            },
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      const volumes = deployment.spec.template.spec.volumes
      expect(volumes).toHaveLength(4)
      expect(volumes).toMatchSnapshot()
      const containers = deployment.spec.template.spec.containers
      expect(containers).toHaveLength(1)
      const [container] = containers
      expect(container.volumeMounts).toHaveLength(4)
      expect(container.volumeMounts).toMatchSnapshot()
    })

    describe('when virtual garden is enabled', function () {
      it('should render the template', async function () {
        const values = {
          global: {
            virtualGarden: {
              enabled: true,
            },
            dashboard: {
              serviceAccountTokenVolumeProjection: {
                enabled: true,
                expirationSeconds: 3600,
                audience: 'https://identity.garden.example.org',
              },
            },
          },
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [deployment] = documents
        expect(deployment.spec.template.spec.serviceAccountName).toEqual('gardener-dashboard')
        const volumes = deployment.spec.template.spec.volumes
        expect(volumes).toHaveLength(5)
        const [, , , , serviceAccountTokenVolume] = volumes
        expect(serviceAccountTokenVolume).toMatchSnapshot()
        const containers = deployment.spec.template.spec.containers
        expect(containers).toHaveLength(1)
        const [container] = containers
        expect(container.volumeMounts).toHaveLength(5)
        const [, , , serviceAccountTokenVolumeMount] = container.volumeMounts
        expect(serviceAccountTokenVolumeMount).toMatchSnapshot()
      })

      it('should use the default service account', async function () {
        const values = {
          global: {
            virtualGarden: {
              enabled: true,
            },
            dashboard: {
              serviceAccountTokenVolumeProjection: {
                enabled: false,
              },
            },
          },
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [deployment] = documents
        expect(deployment.spec.template.spec.serviceAccountName).toEqual('default')
      })

      it('should use the volume mount based kubeconfig', async function () {
        const values = {
          global: {
            virtualGarden: {
              enabled: true,
            },
            dashboard: {
              projectedKubeconfig: {
                baseMountPath: '/var/run/secrets/gardener.cloud',
                genericKubeconfigSecretName: 'generic-token-kubeconfig',
                tokenSecretName: 'access-dashboard',
              },
            },
          },
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [deployment] = documents
        const volumes = deployment.spec.template.spec.volumes
        expect(volumes).toHaveLength(6)
        const [, , , , , kubeconfigVolume] = volumes
        expect(kubeconfigVolume).toMatchSnapshot()
        const containers = deployment.spec.template.spec.containers
        expect(containers).toHaveLength(1)
        const [container] = containers
        expect(container.volumeMounts).toHaveLength(6)
        const [, , , , kubeconfigVolumeMount] = container.volumeMounts
        expect(kubeconfigVolumeMount).toMatchSnapshot()
        expect(container.env).toHaveLength(5)
        const [, kubeconfigEnv] = container.env
        expect(kubeconfigEnv).toMatchSnapshot()
      })
    })

    describe('when github is configured', function () {
      it('should render github secret volume and volumeMount', async function () {
        const values = {
          global: {
            dashboard: {
              gitHub: {
                authentication: {
                  token: 'foo',
                },
              },
            },
          },
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [deployment] = documents
        const dashboardContainer = deployment.spec.template.spec.containers[0]
        expect(dashboardContainer.name).toEqual('gardener-dashboard')
        const volumes = deployment.spec.template.spec.volumes
        expect(volumes).toHaveLength(6)
        const [, , , , githubVolume] = volumes
        expect(githubVolume).toMatchSnapshot()
        const containers = deployment.spec.template.spec.containers
        expect(containers).toHaveLength(1)
        const [container] = containers
        expect(container.volumeMounts).toHaveLength(6)
        const [, , , , , githubVolumeMount] = container.volumeMounts
        expect(githubVolumeMount).toMatchSnapshot()
      })
    })
  })
})
