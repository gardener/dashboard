# SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

#### Builder ####
FROM node:18-alpine3.16 as builder

# get the latest security upgrades and install tini
RUN apk -U upgrade && apk add --no-cache tini 

# create node user and group
RUN echo 'node:x:1000:1000:node,,,:/home/node:/sbin/nologin' > /tmp/passwd \
 && echo 'node:x:1000:node' > /tmp/group

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
FROM scratch as release

WORKDIR /usr/src/app

ENV NODE_ENV "production"

ARG PORT=8080
ENV PORT $PORT

# copy users and groups
COPY --from=builder /tmp/passwd /tmp/group /etc/

# copy binaries
COPY --from=builder /usr/local/bin/node  /sbin/tini /bin/

# copy libraries
COPY --from=builder /lib/ld-musl-x86_64.so* /usr/lib/libstdc++.so* /usr/lib/libgcc_s.so* /lib/

# copy production directory
COPY --chown=node:node --from=builder /usr/src/build .

USER node

EXPOSE $PORT

VOLUME ["/home/node"]

ENTRYPOINT [ "tini", "--", "node", "--require=/usr/src/app/.pnp.cjs", "--experimental-loader=/usr/src/app/.pnp.loader.mjs"]
CMD ["server.js"]