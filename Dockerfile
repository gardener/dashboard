# SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

############# builder #############
FROM node:18-alpine3.17 as builder

WORKDIR /volume

RUN apk add --no-cache tini \
    # tini and node binaries
    && mkdir -p ./sbin ./usr/local/bin \
    && cp /sbin/tini ./sbin/ \
    && cp /usr/local/bin/node ./usr/local/bin/ \
    # root ca certificates
    && mkdir -p ./etc/ssl \
    && cp -r /etc/ssl/certs ./etc/ssl \
    # node user
    && echo 'node:x:1000:1000:node,,,:/home/node:/sbin/nologin' > ./etc/passwd \
    && echo 'node:x:1000:node' > ./etc/group \
    && mkdir -p ./home/node \
    && chown 1000:1000 ./home/node \
    # libc, libgcc and libstdc++ libraries
    && mkdir -p ./lib ./usr/lib \
    && alpineArch="$(apk --print-arch)" \
    && cp -d /lib/ld-musl-$alpineArch.so.* ./lib \
    && cp -d /lib/libc.musl-$alpineArch.so.* ./lib \
    && cp -d /usr/lib/libgcc_s.so.* ./usr/lib \
    && cp -d /usr/lib/libstdc++.so.* ./usr/lib

WORKDIR /app

COPY . .

# validate zero-installs project and disable network
RUN yarn config set enableNetwork false
RUN yarn install --immutable --immutable-cache

# check that the constraints are met
RUN yarn constraints

# run lint
RUN yarn workspace @gardener-dashboard/logger run lint
RUN yarn workspace @gardener-dashboard/request run lint
RUN yarn workspace @gardener-dashboard/kube-config run lint
RUN yarn workspace @gardener-dashboard/kube-client run lint

# run test --coverage
RUN yarn workspace @gardener-dashboard/logger run test --coverage
RUN yarn workspace @gardener-dashboard/request run test --coverage
RUN yarn workspace @gardener-dashboard/kube-config run test --coverage
RUN yarn workspace @gardener-dashboard/kube-client run test --coverage

############# node-scratch #############
FROM scratch as node-scratch

ENV NODE_ENV "production"

COPY --from=builder /volume /

WORKDIR /app

USER node

VOLUME ["/home/node"]

ENTRYPOINT [ "tini", "--", "node"]

############# dashboard-terminal-bootstrapper-builder #############
FROM builder as dashboard-terminal-bootstrapper-builder

# run lint
RUN yarn workspace @gardener-dashboard/terminal-bootstrap run lint

# run test --coverage
RUN yarn workspace @gardener-dashboard/terminal-bootstrap run test --coverage

# bump version
RUN yarn workspace @gardener-dashboard/terminal-bootstrap version "$(cat VERSION)"

# build application
RUN yarn workspace @gardener-dashboard/terminal-bootstrap prod-install --pack /app/dist \
    && find /app/dist/.yarn -mindepth 1 -name cache -prune -o -exec rm -rf {} + \
    && chown -R 1000:1000 /app/dist

############# bootstrapper #############
FROM node-scratch as dashboard-terminal-bootstrapper

COPY --from=dashboard-terminal-bootstrapper-builder /app/dist .

ENTRYPOINT [ "tini", "--", "node", "--require=/app/.pnp.cjs"]
CMD ["main.js"]

############# dashboard-builder #############
FROM builder as dashboard-builder

# run lint
RUN yarn workspace @gardener-dashboard/backend run lint
RUN yarn workspace @gardener-dashboard/frontend run lint

# run test --coverage
RUN yarn workspace @gardener-dashboard/backend run test --coverage
RUN yarn workspace @gardener-dashboard/frontend run test --coverage

# bump version
RUN yarn workspace @gardener-dashboard/backend version "$(cat VERSION)"
RUN yarn workspace @gardener-dashboard/frontend version "$(cat VERSION)"

# run frontend build
RUN yarn workspace @gardener-dashboard/frontend run build

# build application
RUN yarn workspace @gardener-dashboard/backend prod-install --pack /app/dist \
    && find  /app/dist/.yarn -mindepth 1 -name cache -prune -o -exec rm -rf {} + \
    && mv /app/frontend/dist  /app/dist/public \
    && chown -R 1000:1000  /app/dist

############# dashboard #############
FROM node-scratch as dashboard

COPY --from=dashboard-builder /app/dist .

ENTRYPOINT [ "tini", "--", "node", "--require=/app/.pnp.cjs"]
CMD ["server.js"]
