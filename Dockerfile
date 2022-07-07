# SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

#### Builder ####
FROM node:18 as builder

ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini-static /tini
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini-static.asc /tini.asc
RUN gpg --batch --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 595E85A6B1B4779EA4DAAEC70B588DFF0527A9B7 \
 && gpg --batch --verify /tini.asc /tini
RUN chmod +x /tini

WORKDIR /usr/src/app

COPY . .

# validate zero-installs project and disable network
RUN yarn config set enableNetwork false
RUN yarn install --immutable --immutable-cache

# check that the constraints are met
RUN yarn constraints

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
FROM gcr.io/distroless/nodejs:18 as release

WORKDIR /usr/src/app

ENV NODE_ENV "production"

ARG PORT=8080
ENV PORT $PORT

COPY --from=builder /tini /tini
COPY --chown=nonroot --from=builder /usr/src/build .

USER nonroot

EXPOSE $PORT

VOLUME ["/home/nonroot"]

ENTRYPOINT ["/tini", "--", "/nodejs/bin/node", "--require=/usr/src/app/.pnp.cjs", "--experimental-loader=/usr/src/app/.pnp.loader.mjs"]
CMD ["server.js"]