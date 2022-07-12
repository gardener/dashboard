# SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

#### Builder ####
FROM node:18-alpine3.16 as builder

WORKDIR /app

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
    && cp -d /lib/ld-musl-x86_64.so.* ./lib \
    && cp -d /lib/libc.musl-x86_64.so.* ./lib \
    && cp -d /usr/lib/libgcc_s.so.* ./usr/lib \
    && cp -d /usr/lib/libstdc++.so.* ./usr/lib \
    # application
    && mv /usr/src/build ./app \
    && find ./app/.yarn -mindepth 1 -name cache -prune -o -exec rm -rf {} + \
    && mv /app/frontend/dist ./app/public \
    && chown -R 1000:1000 ./app

#### Release ####
FROM scratch as release

WORKDIR /app

ENV NODE_ENV "production"

ARG PORT=8080
ENV PORT $PORT

COPY --from=builder /volume /

USER node

EXPOSE $PORT

VOLUME ["/home/node"]

ENTRYPOINT [ "tini", "--", "node", "--require=/app/.pnp.cjs", "--experimental-loader=/app/.pnp.loader.mjs"]
CMD ["server.js"]