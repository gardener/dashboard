#
# Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

FROM node:10.12-alpine

# Install Tini
RUN apk add --no-cache tini

# Create app directory
RUN mkdir -p /usr/src/app/public
WORKDIR      /usr/src/app

ENV NODE_ENV production

ARG PORT=8080
ENV PORT $PORT

# Install backend app dependencies
COPY backend/package*.json ./

# Only building code for production
RUN npm install --only=production && npm cache clean --force

# Bundle backend app source
COPY backend .

# Copy frontend app build results to express static directory
COPY frontend/dist ./public

EXPOSE $PORT

USER node

VOLUME ["/home/node", "/var/run/secrets/kubernetes.io/serviceaccount"]

ENTRYPOINT ["/sbin/tini", "--", "node", "server.js"]
