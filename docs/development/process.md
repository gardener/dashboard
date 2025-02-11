# Hotfixes

This document describes how to contribute hotfixes

- [Hotfixes](#hotfixes)
  - [Cherry Picks](#cherry-picks)
    - [Prerequisites](#prerequisites)
    - [Initiate a Cherry Pick](#initiate-a-cherry-pick)

## Cherry Picks

This section explains how to initiate cherry picks on hotfix branches within the `gardener/dashboard` repository.

- [Prerequisites](#prerequisites)
- [Initiate a Cherry Pick](#initiate-a-cherry-pick)

### Prerequisites

Before you initiate a cherry pick, make sure that the following prerequisites are accomplished.

- A pull request merged against the `master` branch.
- The hotfix branch exists (check in the [branches section](https://github.com/gardener/dashboard/branches)).
- Have the `gardener/dashboard` repository cloned as follows:
  - the `origin` remote should point to your fork (alternatively this can be overwritten by passing `FORK_REMOTE=<fork-remote>`).
  - the `upstream` remote should point to the Gardener GitHub org (alternatively this can be overwritten by passing `UPSTREAM_REMOTE=<upstream-remote>`).
- Have `hub` installed, e.g. `brew install hub` assuming you have a standard golang
  development environment.
- A GitHub token which has permissions to create a PR in an upstream branch.

### Initiate a Cherry Pick

- Run the [cherry-pick-script](../../hack/cherry-pick-pull.sh).

  This example applies a master branch PR #1824 to the remote branch
  `upstream/hotfix-1.74`:

  ```shell
  GITHUB_USER=<your-user> hack/cherry-pick-pull.sh upstream/hotfix-1.74 1824
  ```

  - Be aware the cherry pick script assumes you have a git remote called
    `upstream` that points at the Gardener GitHub org.

  - You will need to run the cherry pick script separately for each patch
    release you want to cherry pick to. Cherry picks should be applied to all
    active hotfix branches where the fix is applicable.

  - When asked for your GitHub password, provide the created GitHub token
    rather than your actual GitHub password.
    Refer [https://github.com/github/hub/issues/2655#issuecomment-735836048](https://github.com/github/hub/issues/2655#issuecomment-735836048)
