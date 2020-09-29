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

RUN yarn install \
    && yarn lint \
    && yarn test \
    && yarn build \
    && yarn workspaces focus --production @gardener-dashboard/backend

# Release
FROM alpine:3.12 as release

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && apk add --no-cache tini libstdc++

WORKDIR /usr/src/app

ENV NODE_ENV production

ARG PORT=8080
ENV PORT $PORT

COPY --from=builder /usr/local/bin/node /usr/local/bin/

COPY --from=builder /usr/src/app/.yarn ./.yarn/
COPY --from=builder /usr/src/app/.pnp.js  /usr/src/app/backend/package.json /usr/src/app/backend/server.js ./
COPY --from=builder /usr/src/app/backend/lib ./lib/

COPY --from=builder /usr/src/app/frontend/dist ./public/

USER node

EXPOSE $PORT

VOLUME ["/home/node"]

ENTRYPOINT [ "/sbin/tini", "--", "node", "--require", "/usr/src/app/.pnp.js", "server.js" ]
