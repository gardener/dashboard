# Gardener Dashboard

<img src="https://user-images.githubusercontent.com/5526658/35324536-4447618c-00f1-11e8-8cb7-70b0ad193593.gif" alt="Gardener Demo" width="600"/>

## Development Setup

### Install

Install client and server dependencies

```sh
npm install --prefix frontend
npm install --prefix backend
```

### Configuration

#### `KUBECONFIG`
If the dashboard is not running in the Garden Cluster you have to point the kubeconfig to Garden Cluster. This can be done in the default kubeconfig file in `${HOME}/.kube/config` or by the `KUBECONFIG` environment variable.

#### `GARDENER_CONFIG`
The configuration file of the Gardener Dashboard can be specified as first command line argument or as environment variable `GARDENER_CONFIG` at the server process. If nothing is specified the default location is `${HOME}/.gardener/config.yaml`.

A local configuration example for [minikube](https://github.com/kubernetes/minikube) and [dex](https://github.com/coreos/dex) could look like follows:

```yaml
port: 3030
logLevel: debug
logFormat: text
jwt:
  audience: gardener
  issuer: &issuer https://minikube:32001
  algorithms: [ RS256 ]
jwks:
  ca: |
    -----BEGIN CERTIFICATE-----
    MIIC5z...
    -----END CERTIFICATE-----
  strictSsl: false
  rejectUnauthorized: true
  cache: false
  rateLimit: false
  jwksRequestsPerMinute: 5
  jwksUri: https://minikube:32001/keys
frontend:
  dashboardUrl:
    pathname: /api/v1/namespaces/kube-system/services/kubernetes-dashboard/proxy/
  kubernetesVersions:
  - 1.8.4
  - 1.7.9
  cloudProviders:
    aws:
      volumeTypes:
      - gp2
      machineTypes:
      - m4.large
      - m4.xlarge
    openstack:
      volumeTypes:
      - default
      machineTypes:
      - medium_2_4
      - medium_4_8
  oidc:
    authority: *issuer
    client_id: gardener
    redirect_uri: http://localhost:8080/callback
    response_type: 'token id_token'
    scope: 'openid email profile groups audience:server:client_id:gardener audience:server:client_id:kube-kubectl'
    loadUserInfo: false
```

## Run locally <small style="color: grey; font-size: 0.7em">(during development)</small>

Run the backend server with hot reload under localhost:3030.

```sh
npm run dev --prefix backend
```

Run the frontend server with hot reload under localhost:8080.

```sh
npm run dev --prefix frontend
```

All request to `/api` and `/config.json` with be proxied by default to the backend server.

## Build

Build frontend artifacts for production with minification

```sh
make build
```

The build results will be written to `frontend/dist`. The static resource path `public` of the backend server is symlinked to this directory.

## Release

Publish a new container image and publish to Google Container Registry.

```sh
npm run build --prefix frontend
```

This expects valid GCR credentials located at `${HOME}/.config/gcloud/gcr-readwrite.json`. It will build a new image and pushes it to the container registry.

## People

The following SAP developers contributed to this project until this
initial contribution was published as open source.

| contributor  | commits (%) | +lines | -lines | first commit | last commit |
| ------------ | -----------:| ------:| ------:| ------------ | ----------- |
| Holger Koser |   313 (42%) |  57878 |  18562 |  2017-07-13  |  2018-01-23 |
| Andreas Herz |   307 (41%) |  13666 |  11099 |  2017-07-14  |  2017-10-27 |
| Peter Sutter |    99 (13%) |   4838 |   3967 |  2017-11-07  |  2018-01-23 |
| Gross, Lukas |    31  (4%) |    400 |    267 |  2018-01-10  |  2018-01-23 |


It is derived from the historical, internal `gardener-ui` repository
at commit eeb623d60c86e6037c0e1dc2bdd9e54663bf41a8.

## License
[Apache License 2.0](LICENSE.md)

Copyright 2018 The Gardener Authors


