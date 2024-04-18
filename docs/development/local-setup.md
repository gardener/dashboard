# Local development

<p float="left">
<img width="90" src="https://raw.githubusercontent.com/gardener/dashboard/master/logo/logo_gardener_dashboard.png">
<img width="200" src="https://raw.githubusercontent.com/yarnpkg/assets/master/yarn-kitten-full.png">
</p>

## Purpose
Develop new feature and fix bug on the Gardener Dashboard.

## Requirements
- Yarn. For the required version, refer to `.engines.yarn` in [package.json](../../package.json).
- Node.js. For the required version, refer to `.engines.node` in [package.json](../../package.json).

## Steps

### 1. Clone repository
Clone the [gardener/dashboard](https://github.com/gardener/dashboard.git) repository
```sh
git clone git@github.com:gardener/dashboard.git
```

### 2. Install dependencies

Run `yarn` at the repository root to install all dependencies.
```sh
cd dashboard
```
```sh
yarn
```

### 3. Configuration
Place the Gardener Dashboard configuration under `${HOME}/.gardener/config.yaml` or alternatively set the path to the configuration file using the `GARDENER_CONFIG` environment variable.

A local configuration example could look like follows:

```yaml
port: 3030
logLevel: debug
logFormat: text
apiServerUrl: https://my-local-cluster # garden cluster kube-apiserver url - kubectl config view --minify -ojsonpath='{.clusters[].cluster.server}'
sessionSecret: c2VjcmV0                # symmetric key used for encryption
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

### 4. Run it locally
The Gardener Dashboard [`backend`](../../backend) server requires a kubeconfig for the Garden cluster. You can set it e.g. by using the `KUBECONFIG` environment variable.

If you want to run the Garden cluster locally, follow the [getting started locally](https://github.com/gardener/gardener/blob/master/docs/development/getting_started_locally.md) documentation.
Gardener Dashboard supports the `local` infrastructure provider that comes with the local Gardener cluster setup.
See [6. Login to the dashboard](#6-login-to-the-dashboard) for more information on how to use the Dashboard with a local gardener or any other Gardener landscape.

Concurrently run the `backend` server (port `3030`) and the [`frontend`](../../frontend) server (port `8080`) with hot reload enabled.

```sh
cd backend
export KUBECONFIG=/path/to/garden/cluster/kubeconfig.yaml
yarn serve
```

```sh
cd frontend
yarn serve
```

You can now access the UI on http://localhost:8080/

### 5. Login to the dashboard
To login to the dashboard you can either configure `oidc`, or alternatively login using a token:

To login using a token, first create a service account.
```bash
kubectl -n garden create serviceaccount dashboard-user
```
Assign it a role, e.g. cluster-admin.
```bash
kubectl set subject clusterrolebinding cluster-admin --serviceaccount=garden:dashboard-user
```
Get the token of the service account.
```bash
kubectl -n garden create token dashboard-user --duration 24h
```
Copy the token and login to the dashboard.

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
