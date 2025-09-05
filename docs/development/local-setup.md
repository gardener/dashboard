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

## Git Hooks with Husky

This repository uses a custom [Husky](https://typicode.github.io/husky/) setup to centrally manage Git hooks and ensure a consistent development workflow. Our Husky configuration is user-configurable and designed to help you by checking code quality and performing security checks before you commit or push changes.

### How Our Husky Setup Works
- When you install dependencies with `yarn`, Husky is set up automatically, but the actual hooks are only activated after your first commit attempt.
- On your first commit, a `.husky/user-config` file is automatically created for you if it does not exist. This file lets you opt in or out of optional checks, such as:
  - **ggshield**: Secret scanning (requires a GitGuardian account)
  - **REUSE**: License compliance (requires `pipx` and the `reuse` tool)
  - **verify_on_push**: Run the full verification script on every push (lint, tests, dependency checks)
- By default, Husky managed hooks are enabled, but optional checks are disabled. You can edit `.husky/user-config` at any time to change your preferences.
- The actual hook logic is implemented in the `.husky/pre-commit` and `.husky/pre-push` scripts.

### Disabling Husky Managed Hooks
If you want to disable Husky managed hooks and reset your Git hooks path to the default location, run:
```sh
echo managed_hooks=false > .husky/user-config && git config --local --unset core.hooksPath
```

For more information, see the [Husky documentation](https://typicode.github.io/husky/) and our `.husky/` directory for custom logic.

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
See [5. Login to the dashboard](#5-login-to-the-dashboard) for more information on how to use the Dashboard with a local gardener or any other Gardener landscape.

Start the `backend` server (`http://localhost:3030`).

```sh
cd backend
export KUBECONFIG=/path/to/garden/cluster/kubeconfig.yaml
yarn serve
```

To start the frontend server, you have two options for handling the server certificate:

1. **Recommended Method**: Run `yarn setup` in the frontend directory to generate a new self-signed CA and TLS server certificate before starting the frontend server for the first time. The CA is automatically added to the keychain on macOS. If you prefer not to add it to the keychain, you can use the `--skip-keychain` flag. For other operating systems, you will need to manually add the generated certificates to the local trust store.

2. **Alternative Method**: If you prefer not to run `yarn setup`, a temporary self-signed certificate will be generated automatically. This certificate will not be added to the keychain. Note that you will need to click through the insecure warning in your browser to access the dashboard.

We need to start a TLS dev server because we use cookie names with `__Host-` prefix. This requires the secure attribute to be set. For more information, see [OWASP Host Prefix](https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/06-Session_Management_Testing/02-Testing_for_Cookies_Attributes#host-prefix).

Start the [`frontend`](../../frontend) dev server (`https://localhost:8443`) with https and hot reload enabled.

```sh
cd frontend
# yarn setup
yarn serve
```

You can now access the UI on https://localhost:8443/

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
