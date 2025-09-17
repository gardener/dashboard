# SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

############# builder #############
FROM node:22-alpine3.20 AS builder

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

############# node-scratch #############
FROM scratch AS node-scratch

ENV NODE_ENV="production"

COPY --from=builder /volume /

WORKDIR /app

USER node

VOLUME ["/home/node"]

ENTRYPOINT [ "tini", "--", "node"]

############# dashboard-builder #############
FROM builder AS dashboard-builder

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
FROM node-scratch AS dashboard

COPY --from=dashboard-builder /app/dist .

ENTRYPOINT [ "tini", "--", "node", "--require=/app/.pnp.cjs", "--loader=/app/.pnp.loader.mjs"]
CMD ["server.js"]
