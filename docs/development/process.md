# Hotfixes

This document describes how to contribute hotfixes

- [Hotfixes](#hotfixes)
  - [Cherry Picks](#cherry-picks)
    - [Prerequisites](#prerequisites)
    - [Initiate a Cherry Pick](#initiate-a-cherry-pick)

## Cherry Picks

Cherry picks are handled by the [Prow cherry-pick plugin](https://docs.prow.k8s.io/docs/components/external-plugins/cherrypicker/).

### Prerequisites

- The hotfix branch exists (check in the [branches section](https://github.com/gardener/dashboard/branches)).
- You must be a **maintainer** (repository owner or member) to trigger a cherry-pick.

### Initiate a Cherry Pick

Trigger a cherry pick by commenting on the pull request (can be done before or after merge — Prow will execute it once the PR is merged):

```
/cherry-pick hotfix-1.74
```

For usage details see the [Prow cherrypicker documentation](https://docs.prow.k8s.io/docs/components/external-plugins/cherrypicker/).
