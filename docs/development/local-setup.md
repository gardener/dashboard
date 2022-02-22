### Install Dependencies

Install all dependencies via yarn

<img width="200" src="https://raw.githubusercontent.com/yarnpkg/assets/master/yarn-kitten-full.png">

```sh
yarn
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
sessionSecret: c2VjcmV0          # symetric key used for encryption
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

For the required `node.js` version, refer to `.engines.node` in [package.json](https://github.com/gardener/dashboard/blob/master/package.json).

Concurrently run the [`backend`](https://github.com/gardener/dashboard/tree/master/backend) server (port `3030`) and the [`frontend`](https://github.com/gardener/dashboard/tree/master/frontend) server (port `8080`) both with hot reload enabled.

```sh
cd backend
yarn serve
```

```sh
cd frontend
yarn serve
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
make push
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
