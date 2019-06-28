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

#### Base ####
FROM node:12-alpine as base

WORKDIR /usr/src/app

RUN npm set progress=false \
    && npm config set depth 0

#### Backend base ####
FROM base as backend

COPY backend/package*.json ./

RUN npm install --only=production \
    && cp -R node_modules dist \
    && npm install

COPY backend ./
COPY VERSION ../
COPY Dockerfile ../

RUN npm run lint \
    && npm run test-cov \
    && npm run sync-version

#### Frontend  base ####
FROM base as frontend

COPY frontend/package*.json ./

RUN npm install

COPY frontend ./
COPY VERSION ../

RUN npm run lint \
    && npm run test:unit \
    && npm run build

# Release
FROM alpine:3.9 as release

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && apk add --no-cache tini libstdc++

WORKDIR /usr/src/app

ENV NODE_ENV production

ARG PORT=8080
ENV PORT $PORT

COPY --from=backend /usr/local/bin/node /usr/local/bin/

COPY --from=backend /usr/src/app/package.json ./
COPY --from=backend /usr/src/app/dist  ./node_modules/
COPY --from=backend /usr/src/app/lib ./lib/
COPY --from=backend /usr/src/app/server.js ./

COPY --from=frontend /usr/src/app/dist ./public/

USER node

EXPOSE $PORT

VOLUME ["/home/node"]

ENTRYPOINT [ "/sbin/tini", "--", "node", "server.js" ]
