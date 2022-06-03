# Working with Service Accounts

## Prerequisites

- You are logged on to the Gardener Dashboard
- You have [created a project](working-with-projects.md).

The cluster operations that are performed manually in the dashboard or via `kubectl` can be automated using the [Gardener API](https://github.com/gardener/gardener/tree/master/docs/api-reference). You need a **service account** to be authorized to perform them.

> The service account of a project has access to all Kubernetes resources in the project.

## Create a Service Account

1. Select your project and choose *MEMBERS* from the menu on the left.

2. Locate the section *Service Accounts* and choose *+*.

   ![Add service account](../images/Add-service-account.png)

3. Enter the service account details.

   ![Enter service account details](../images/Enter-service-account-details.png)

   The following *Roles* are available:

   | Role | Granted Permissions |
   |:---|:---|
   | *Admin* | Fully manage resources inside the project, except for member management. Also the delete/modify permissions for `ServiceAccount`s are now deprecated for this role and will be removed in a future version of Gardener, use the <code>Service Account Manager</code> role instead. |
   | *Viewer* | Read all resources inside the project except secrets. |
   | *UAM* | Manage human users or groups in the project member list. Service accounts can only be managed admins. |
   | *Service Account Manager* | This allows to fully manage service accounts inside the project namespace and request tokens for them. Please refer to [this document](https://github.com/gardener/gardener/blob/master/docs/usage/project_namespace_access.md). For security reasons this role should not be assigned to service accounts, especially it should be prevented that a service account can refresh tokens for itself. |

4. Choose *CREATE*.


## Use the Service Account

To use the service account, download or copy its `kubeconfig`.

![Download service account kubeconfig](../images/Download-service-account-kubeconfig.png)


## Delete the Service Account

Choose *Delete Service Account* to delete it.

![Delete service account](../images/Delete-service-account.png)
