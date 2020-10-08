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

WORKDIR /tmp/src

COPY . .

# validate zero-installs monorepo project (slightly safer because we accept external PRs)
RUN yarn install --immutable --immutable-cache --check-cache

# run lint in all workspaces
RUN yarn workspaces foreach --all run lint

# run test in all workspaces
RUN yarn workspaces foreach --all run test-coverage

# run frontend build 
RUN yarn workspace @gardener-dashboard/frontend run build

# install backend workspace and its dependencies
RUN rm .pnp.js \
    && rm -rf .yarn/cache \
    && yarn workspaces focus --production @gardener-dashboard/backend

# create production monorepo project
RUN mkdir -p dist/.yarn dist/backend \
    && find packages -type d -regex ".*/\(__tests__\|coverage\)$" -prune -exec rm -rf {} \; \
    && cp -r package.json ./.pnp.js packages dist \
    && cp -r ./.yarn/cache dist/.yarn \
    && cp -r backend/package.json backend/server.js backend/lib dist/backend \
    && cp -r frontend/dist dist/backend/public

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
COPY --from=builder /tmp/src/dist ../

USER node

EXPOSE $PORT

VOLUME ["/home/node"]

ENTRYPOINT [ "/sbin/tini", "--", "node", "server" ]
