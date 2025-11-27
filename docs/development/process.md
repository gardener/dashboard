# Hotfixes

This document describes how to contribute hotfixes

- [Hotfixes](#hotfixes)
  - [Cherry Picks](#cherry-picks)
    - [Prerequisites](#prerequisites)
    - [Initiate a Cherry Pick](#initiate-a-cherry-pick)

## Cherry Picks

This section explains how to initiate cherry picks on hotfix branches within the `gardener/dashboard` repository using the automated GitHub Action.

- [Prerequisites](#prerequisites)
- [Initiate a Cherry Pick](#initiate-a-cherry-pick)

### Prerequisites

Before you initiate a cherry pick, make sure that the following prerequisites are accomplished:

- A pull request merged against the `master` branch.
- The hotfix branch exists (check in the [branches section](https://github.com/gardener/dashboard/branches)).
- You must be a **maintainer** (repository owner or member) to use the cherry-pick action.

### Initiate a Cherry Pick

Cherry picks are now automated using a GitHub Action that can be triggered by commenting on a merged pull request.

**Who can use this action:**

- Only repository maintainers (users with `OWNER` or `MEMBER` association) can trigger cherry-pick operations.

**How to use:**

1. Navigate to the merged pull request that you want to cherry-pick.

2. Add a comment with the cherry-pick command in one of the following formats:

   **Single branch:**
   ```
   /cherry-pick hotfix-1.74
   ```

   **Multiple branches (inline):**
   ```
   /cherry-pick hotfix-1.74 /cherry-pick hotfix-1.75
   ```

   **Multiple branches (multiline):**
   ```
   /cherry-pick hotfix-1.74
   /cherry-pick hotfix-1.75
   /cherry-pick hotfix-1.76
   ```

3. The GitHub Action will automatically:
   - Parse the target branches from your comment
   - Create cherry-pick pull requests for each specified branch
   - Provide status updates in the comments
   - Handle conflicts and provide guidance if manual resolution is needed

**Notes:**
- Branch names should only contain alphanumeric characters, dots, hyphens, underscores, and forward slashes
- The action will validate branch names and skip any invalid ones
- You can cherry-pick to multiple branches in a single comment
- The action provides real-time feedback through PR comments about the cherry-pick progress and results
