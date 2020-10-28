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

WORKDIR /usr/src/app

COPY . .

# validate zero-installs project and disable network
RUN yarn config set enableNetwork false \
    && yarn install --immutable --immutable-cache

# run lint in all workspaces
RUN yarn workspaces foreach --all run lint

# run test in all workspaces
RUN yarn workspaces foreach --all run test-coverage

# bump backend and frontend version
RUN yarn workspaces foreach --include "*/(frontend|backend)" version "$(cat VERSION)"

# run backend production install 
RUN yarn workspace @gardener-dashboard/backend prod-install --pack /usr/src/build

# run frontend build 
RUN yarn workspace @gardener-dashboard/frontend run build

# copy files to production directory
RUN cp -r frontend/dist /usr/src/build/public \
    && find /usr/src/build/.yarn -mindepth 1 -name cache -prune -o -exec rm -rf {} +

#### Release ####
FROM alpine:3.12 as release

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && apk add --no-cache tini libstdc++

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