# Connect kubectl

In Kubernetes, the configuration for access to your cluster is a format known as `kubeconfig` that is normally stored as a file. It contains details such as cluster API server addresses and user access credentials. Treat it as sensitive data. Tools like `kubectl` use `kubeconfig` to connect and authenticate to a cluster and perform operations on it.
Learn more about [kubeconfig](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/) and [kubectl](https://kubernetes.io/docs/reference/kubectl/overview/) on [kubernetes.io](https://kubernetes.io).

### Prerequisites
- You are logged on to the Gardener Dashboard.
- You have created a cluster and its status is operational.

On this page:
- [Downloading kubeconfig for a cluster](#downloading-kubeconfig-for-a-cluster)
- [Connecting to the cluster](#connecting-to-the-cluster)
- [Exporting KUBECONFIG environment variable](#exporting-kubeconfig-environment-variable)

<br/>

### Downloading kubeconfig for a cluster
1. Select your project from the dropdown on the left, then choose **CLUSTERS** and locate your cluster in the list. Choose the *key* icon to bring up a dialog with the access options.

   <img src="../images/01-select-cluster.png">

   In the **Kubeconfig** section the options are to *download*, *copy* or *view* the `kubeconfig` for the cluster.
   The same options are available also in the **Access** section in the cluster details screen. To find it, choose a cluster from the list.

   <img src="../images/01-access-1.png">
2. Choose the download icon to download `kubeconfig` as file on your local system.

   <img style="max-width: 40%" src="../images/02-download.png">

### Connecting to the cluster

In the following command, change `<path-to-kubeconfig>` with the actual path to the file where you stored the `kubeconfig` downloaded in the previous steps.
```
$ kubectl --kubeconfig=<path-to-kubeconfig> get namespaces
```
The command connects to the cluster and list its namespaces.

### Exporting KUBECONFIG environment variable
Since many `kubectl` commands will be used, it’s a good idea to take advantage of every opportunity to shorten the expressions. The `kubectl` tool has a fallback strategy for looking up a kubeconfig to work with. For example, it looks for the `KUBECONFIG` environment variable with value that is the path to the `kubeconfig` file meant to be used. Export the variable:
```
$ export KUBECONFIG=<path-to-file>
```
In the previous snippet make sure to change the `<path-to-file>` with the path to the kubeconfig for the cluster that you want to connect to on your system.

<br>

## What's next?
- [Using Dashboard Terminal](using-terminal.md)