#
# Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
FROM node:12-alpine as builder

WORKDIR /usr/src/app

COPY . .

RUN yarn --cwd=backend install --no-progress --production \
    && cp -R backend/node_modules backend/production_node_modules \
    && yarn --cwd=backend install --no-progress \
    && yarn --cwd=backend lint \
    && yarn --cwd=backend test:coverage \
    && yarn --cwd=backend sync-version \
    && yarn --cwd=frontend install --no-progress \
    && yarn --cwd=frontend lint \
    && yarn --cwd=frontend test:unit \
    && yarn --cwd=frontend build

# Release
FROM alpine:3.9 as release

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && apk add --no-cache tini libstdc++

WORKDIR /usr/src/app

ENV NODE_ENV production

ARG PORT=8080
ENV PORT $PORT

COPY --from=builder /usr/local/bin/node /usr/local/bin/

COPY --from=builder /usr/src/app/backend/package.json /usr/src/app/backend/server.js ./
COPY --from=builder /usr/src/app/backend/lib ./lib/
COPY --from=builder /usr/src/app/backend/production_node_modules ./node_modules/

COPY --from=builder /usr/src/app/frontend/dist ./public/

USER node

EXPOSE $PORT

VOLUME ["/home/node"]

ENTRYPOINT [ "/sbin/tini", "--", "node", "server.js" ]
