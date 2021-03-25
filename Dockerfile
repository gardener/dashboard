# SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

#### Builder ####
FROM eu.gcr.io/gardener-project/3rd/node:15-alpine3.13 as builder

WORKDIR /usr/src/app

COPY . .

# validate zero-installs project and disable network
RUN yarn config set enableNetwork false
RUN yarn install --immutable --immutable-cache

# run lint in all workspaces
RUN yarn workspace @gardener-dashboard/logger      run lint
RUN yarn workspace @gardener-dashboard/request     run lint
RUN yarn workspace @gardener-dashboard/kube-config run lint
RUN yarn workspace @gardener-dashboard/kube-client run lint
RUN yarn workspace @gardener-dashboard/backend     run lint
RUN yarn workspace @gardener-dashboard/frontend    run lint

# run test in all workspaces
RUN yarn workspace @gardener-dashboard/logger      run test-coverage
RUN yarn workspace @gardener-dashboard/request     run test-coverage
RUN yarn workspace @gardener-dashboard/kube-config run test-coverage
RUN yarn workspace @gardener-dashboard/kube-client run test-coverage
RUN yarn workspace @gardener-dashboard/backend     run test-coverage
RUN yarn workspace @gardener-dashboard/frontend    run test-coverage

# bump backend and frontend version
RUN yarn workspace @gardener-dashboard/backend     version "$(cat VERSION)"
RUN yarn workspace @gardener-dashboard/frontend    version "$(cat VERSION)"

# run backend production install
RUN yarn workspace @gardener-dashboard/backend     prod-install --pack /usr/src/build

# run frontend build
RUN yarn workspace @gardener-dashboard/frontend    run build

# copy files to production directory
RUN cp -r frontend/dist /usr/src/build/public \
    && find /usr/src/build/.yarn -mindepth 1 -name cache -prune -o -exec rm -rf {} +

#### Release ####
FROM eu.gcr.io/gardener-project/3rd/alpine:3.13 as release

RUN addgroup -g 1000 node && adduser -u 1000 -G node -s /bin/sh -D node
RUN apk add --no-cache tini libstdc++

WORKDIR /usr/src/app

ENV NODE_ENV "production"
ENV NODE_OPTIONS "--require /usr/src/app/.pnp.js"

ARG PORT=8080
ENV PORT $PORT

# copy node binary
COPY --from=builder /usr/local/bin/node /usr/local/bin/

# copy production directory
COPY --chown=node:node --from=builder /usr/src/build .

USER node

EXPOSE $PORT

VOLUME ["/home/node"]

ENTRYPOINT [ "/sbin/tini", "--", "node", "server" ]