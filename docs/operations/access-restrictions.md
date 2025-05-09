# Access Restrictions

For an overview and usage of access restrictions, refer to the [Access Restrictions Usage Documentation](https://github.com/gardener/gardener/blob/master/docs/usage/shoot/access_restrictions.md).

## Configuring the Dashboard

Operators can configure the Gardener Dashboard to define available access restrictions and their options. This configuration determines what is displayed to end-users in the Dashboard UI.

### Configuration Methods

The Dashboard can be installed and configured in two ways:

1. **Via Helm Chart**: Configuration is provided through the `values.yaml` file.
2. **Via Gardener Operator**: Configuration is provided through a ConfigMap referenced by the Gardener Operator.

#### 1. Installing via Helm Chart

When installing the Dashboard via Helm chart, access restrictions are configured in the `values.yaml` file.

**Example `values.yaml`:**

```yaml
accessRestriction:
  noItemsText: No access restriction options available for region ${region} and cloud profile ${cloudProfileName} (${cloudProfileKind})
  items:
  - key: eu-access-only
    display:
      title: EU Access Only # Optional title; if not specified, `key` is used
      description: Restricts access to EU regions only # Optional description displayed in a tooltip
    input:
      title: EU Access
      description: |
        This service is offered with our regular SLAs and 24x7 support for the control plane of the cluster. 24x7 support for cluster add-ons and nodes is only available if you meet the following conditions:
    options:
    - key: support.gardener.cloud/eu-access-for-cluster-addons
      display:
        visibleIf: true # Controls visibility based on a condition
      input:
        title: No personal data is used in resource names or contents
        description: |
          If you can't comply, only third-level support during usual 8x5 working hours in the EEA will be available for cluster add-ons.
        inverted: false # Determines if the input value is inverted
    - key: support.gardener.cloud/eu-access-for-cluster-nodes
      display:
        visibleIf: false # Controls visibility based on a condition
      input:
        title: No personal data is stored in Kubernetes volumes except certain types
        description: |
          If you can't comply, only third-level support during usual 8x5 working hours in the EEA will be available for node-related components.
        inverted: true # Determines if the input value is inverted
```

#### 2. Installing via Gardener Operator

When the Dashboard is installed via the Gardener Operator, access restrictions are configured in a separate `ConfigMap` referenced by the Operator using `.spec.virtualCluster.gardener.gardenerDashboard.frontendConfigMapRef` within the `Garden` resource.

**Example ConfigMap:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gardener-dashboard-frontend
  namespace: garden
data:
  frontend-config.yaml: |
    accessRestriction:
      noItemsText: No access restriction options available for region ${region} and cloud profile ${cloudProfileName} (${cloudProfileKind})
      items:
      - key: eu-access-only
        display:
          title: EU Access Only
          description: Restricts access to EU regions only
        input:
          title: EU Access
          description: |
            This service is offered with our regular SLAs and 24x7 support for the control plane of the cluster. 24x7 support for cluster add-ons and nodes is only available if you meet the following conditions:
        options:
        - key: support.gardener.cloud/eu-access-for-cluster-addons
          display:
            visibleIf: true
          input:
            title: No personal data is used in resource names or contents
            description: |
              If you can't comply, only third-level support during usual 8x5 working hours in the EEA will be available for cluster add-ons.
            inverted: false
        - key: support.gardener.cloud/eu-access-for-cluster-nodes
          display:
            visibleIf: false
          input:
            title: No personal data is stored in Kubernetes volumes except certain types
            description: |
              If you can't comply, only third-level support during usual 8x5 working hours in the EEA will be available for node-related components.
            inverted: true
```

### Understanding `input` and `display`

- **`display`**:
  - **Purpose**: Defines how the access restriction and its options are presented in the Dashboard UI using **chips**.
  - **Properties**:
    - `title`: Label shown on the chip. If not specified, `key` is used.
    - `description`: Tooltip content when hovering over the chip.
    - `visibleIf` (for options): Determines if the option's chip is displayed based on its value.

- **`input`**:
  - **Purpose**: Configures the interactive elements (switches, checkboxes) that users interact with to enable or disable access restrictions and options.
  - **Properties**:
    - `title`: Label for the input control.
    - `description`: Detailed information or instructions for the input control.
    - `inverted` (for options): Determines if the input value is inverted (`true` or `false`). When `inverted` is `true`, the control behaves inversely (e.g., checked means `false`).

### No Access Restrictions Available

If no access restrictions are available for the selected region and cloud profile, the text specified in `accessRestriction.noItemsText` is displayed. Placeholders `{region}` and `{cloudProfile}` can be used in the text.