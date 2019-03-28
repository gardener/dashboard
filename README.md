# Gardener Dashboard

![](https://github.com/gardener/dashboard/blob/master/logo/logo_gardener_dashboard.png)

## Demo

<img src="https://user-images.githubusercontent.com/5526658/35324536-4447618c-00f1-11e8-8cb7-70b0ad193593.gif" alt="Gardener Demo" width="600"/>

## Development Setup

### Install

Install client dependencies

```sh
pushd frontend
npm install
popd
```

Install server dependencies

```sh
pushd backend
npm install
popd
```

### Configuration

#### KUBECONFIG
If the dashboard is not running in the Garden Cluster you have to point the kubeconfig to Garden Cluster. This can be done in the default kubeconfig file in `${HOME}/.kube/config` or by the `KUBECONFIG` environment variable.

#### GARDENER_CONFIG
The configuration file of the Gardener Dashboard can be specified as first command line argument or as environment variable `GARDENER_CONFIG` at the server process. If nothing is specified the default location is `${HOME}/.gardener/config.yaml`.

A local configuration example for [minikube](https://github.com/kubernetes/minikube) and [dex](https://github.com/coreos/dex) could look like follows:

```yaml
port: 3030
logLevel: debug
logFormat: text
apiServerUrl: https://minkube    # garden cluster kube-apiserver url
secret: c2VjcmV0                 # symetric key used for encryption
cookieMaxAge: 1800
oidc:
  issuer: https://minikube:32001
  client_id: dashboard
  client_secret: c2VjcmV0       # oauth client secret
  redirect_uri: http://localhost:8080/auth/callback
  scope: 'openid email profile groups audience:server:client_id:dashboard audience:server:client_id:kube-kubectl'
  clockTolerance: 15
frontend:
  dashboardUrl:
    pathname: /api/v1/namespaces/kube-system/services/kubernetes-dashboard/proxy/
  defaultHibernationSchedule:
    evaluation:
    - start: 00 17 * * 1,2,3,4,5
    development:
    - start: 00 17 * * 1,2,3,4,5
      end: 00 08 * * 1,2,3,4,5
    production: ~
```

## Run locally <small style="color: grey; font-size: 0.7em">(during development)</small>

Run local backend server with hot reload listening on port `3030`.

```sh
cd backend
npm run dev
```

Run local frontend server with hot reload istening on port `8080`.

```sh
cd frontend
npm run serve
```

All request to `/api`, `/auth` and `/config.json` will be proxied by default to the backend server.

## Build

Build docker image locally.

```sh
make build
```

## Push

Push docker image to Google Container Registry.

```sh
npm run build --prefix frontend
```

This command expects a valid gcloud configuration named `gardener`.

```sh
gcloud config configurations describe gardener
is_active: true
name: gardener
properties:
  core:
    account: john.doe@example.org
    project: johndoe-1008
```

## People

The following SAP developers contributed to this project until this
initial contribution was published as open source.

| contributor  | commits (%) | +lines | -lines | first commit | last commit |
| ------------ | -----------:| ------:| ------:| ------------ | ----------- |
| Holger Koser |   313 (42%) |  57878 |  18562 |  2017-07-13  |  2018-01-23 |
| Andreas Herz |   307 (41%) |  13666 |  11099 |  2017-07-14  |  2017-10-27 |
| Peter Sutter |    99 (13%) |   4838 |   3967 |  2017-11-07  |  2018-01-23 |
| Gross, Lukas |    31  (4%) |    400 |    267 |  2018-01-10  |  2018-01-23 |


It is derived from the historical, internal *gardener-ui* repository
at commit eeb623d60c86e6037c0e1dc2bdd9e54663bf41a8.

## License
[Apache License 2.0](LICENSE.md)

Copyright 2019 The Gardener Authors


