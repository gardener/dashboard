#
# Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

#### Builder ####
FROM node:14-alpine3.12 as builder

WORKDIR /gardener-dashboard

COPY . .

RUN yarn install --immutable \
    && yarn workspaces foreach --all run lint \
    && yarn workspaces foreach --all run test-coverage \
    && yarn workspace @gardener-dashboard/frontend run build \
    && rm .pnp.js .yarn/install-state.gz \
    && rm -rf .yarn/cache \
    && yarn workspaces focus --production @gardener-dashboard/backend

#### Release ####
FROM alpine:3.12 as release

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && apk add --no-cache tini libstdc++

WORKDIR /usr/src/backend

ENV NODE_ENV "production"
ENV NODE_OPTIONS "--require /usr/src/.pnp.js"

ARG PORT=8080
ENV PORT $PORT

# copy node binary
COPY --from=builder /usr/local/bin/node /usr/local/bin/

# copy root workspace
COPY --from=builder /gardener-dashboard/.pnp.js ../
COPY --from=builder /gardener-dashboard/.yarn/cache ../.yarn/cache/

# copy workspace packages/logger
COPY ./packages/logger/package.json ../packages/logger/
COPY ./packages/logger/lib ../packages/logger/lib/

# copy workspace packages/request
COPY ./packages/request/package.json ../packages/request/
COPY ./packages/request/lib ../packages/request/lib/

# copy workspace packages/kube-config
COPY ./packages/kube-config/package.json ../packages/kube-config/
COPY ./packages/kube-config/lib ../packages/kube-config/lib/

# copy workspace packages/kube-client
COPY ./packages/kube-client/package.json ../packages/kube-client/
COPY ./packages/kube-client/lib ../packages/kube-client/lib/

# copy workspace frontend
COPY --from=builder /gardener-dashboard/frontend/dist ../frontend/dist/

# copy workspace backend
COPY ./backend/package.json ./backend/server.js ./
COPY ./backend/lib ./lib/

# symlink frontend build
RUN ln -s ../frontend/dist public

USER node

EXPOSE $PORT

VOLUME ["/home/node"]

ENTRYPOINT [ "/sbin/tini", "--", "node", "server.js" ]
