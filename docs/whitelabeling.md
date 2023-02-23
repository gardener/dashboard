# Customization
This document describes possibilities to customize the gardener dashboard
as deployed on Kubernetes. This can help in offering whitelabeling features
to customers.

We assume one deployment of the dashboard for each customized or whitelabeled 
gardener-dashboard. We strive for minimal modifications needed in the source
code to allow for whitelabeling configurations.

## Theming
Gardener-Dashboard is using the Vue.js-Framework and allows for using the
Vue.js Theming options. For documentation see deployment/theming.md

## Logo
The logo is served at `/static/assets/logo.svg` and can be found in the 
source at `/frontend/public/static/assets/logo.svg`. You should be able
to overwrite this with a Kubernetes Config Map when the dashboard is deployed.

