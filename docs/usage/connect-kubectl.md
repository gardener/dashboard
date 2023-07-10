# Connect kubectl

In Kubernetes, the configuration for access to your cluster is a format known as `kubeconfig` that is stored as a file. It contains details such as cluster API server addresses and access credentials or a command to get the access credential from a `kubectl` credential plugin. In general, treat a `kubeconfig` as sensitive data. Tools like `kubectl` use the `kubeconfig` to connect and authenticate to a cluster and perform operations on it.
Learn more about [kubeconfig](https://kubernetes.io/docs/operations/configuration/organize-cluster-access-kubeconfig/) and [kubectl](https://kubernetes.io/docs/reference/kubectl/) on [kubernetes.io](https://kubernetes.io).

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

   <img width="1000" src="../images/01-select-cluster.png">

   In the **Kubeconfig - Gardenlogin** section the options are to *show gardenlogin info*, *download*, *copy* or *view* the `kubeconfig` for the cluster.
   The same options are available also in the **Access** section in the cluster details screen. To find it, choose a cluster from the list.
   Enabling the static token kubeconfig is not recommended and you should consider to disable it for your cluster, if not already done. Instead use the `gardenlogin` `kubeconfig`.

   <img width="1000" src="../images/01-access-1.png">
2. Choose the download icon to download the `kubeconfig` as file on your local system.

   <img width="400" src="../images/02-download.png">
3. If `gardenlogin` is not installed or configured, click on the *show gardenlogin info* action to follow the installation and configuration hints.

   <img width="700" src="../images/03-gardenlogin-info.png">
4. You might also need to install [kubelogin](https://github.com/int128/kubelogin#setup)

### Connecting to the cluster

In the following command, change `<path-to-gardenlogin-kubeconfig>` with the actual path to the file where you stored the `kubeconfig` downloaded in the previous step 2.
```
$ kubectl --kubeconfig=<path-to-gardenlogin-kubeconfig> get namespaces
```
The command connects to the cluster and list its namespaces.

### Exporting KUBECONFIG environment variable
Since many `kubectl` commands will be used, it’s a good idea to take advantage of every opportunity to shorten the expressions. The `kubectl` tool has a fallback strategy for looking up a kubeconfig to work with. For example, it looks for the `KUBECONFIG` environment variable with value that is the path to the `kubeconfig` file meant to be used. Export the variable:
```
$ export KUBECONFIG=<path-to-gardenlogin-kubeconfig>
```
In the previous snippet make sure to change the `<path-to-gardenlogin-kubeconfig>` with the path to the kubeconfig for the cluster that you want to connect to on your system.

<br>

## What's next?
- [Using Dashboard Terminal](using-terminal.md)
