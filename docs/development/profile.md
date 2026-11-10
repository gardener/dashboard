# Profiling the Backend

The backend provides a `serve:profile` script that starts the server with the
Node.js inspector enabled. This allows Chrome DevTools to attach to the running
backend for CPU and memory profiling.

## Prerequisites

Set up the local backend configuration and the Garden cluster kubeconfig as
described in [Setting Up a Local Development Environment](local-setup.md).

## Start the backend with the inspector

From the `backend` directory, start the server using:

```sh
yarn serve:profile
```

The backend starts as usual on the configured HTTP port (by default
`http://localhost:3030`) and exposes the Node.js inspector on
`127.0.0.1:9229`. The inspector is bound to the local machine only and does
not pause the server at startup.

## Connect Chrome DevTools

1. Open `chrome://inspect` in Chrome.
2. Under **Remote Target**, find the backend Node.js process and select
   **inspect**.
3. In the DevTools window that opens, use the **Performance** panel to record
   a CPU profile, or the **Memory** panel to take heap snapshots.

If the backend process is not listed, select **Configure...** on
`chrome://inspect` and ensure that `localhost:9229` is configured. Keep the
terminal running `yarn serve:profile` open while profiling.

Stop the backend with `Ctrl+C` when profiling is complete.
