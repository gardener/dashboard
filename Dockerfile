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

FROM node:8.9-alpine

# Create app directory
RUN mkdir -p /usr/src/app/public
WORKDIR      /usr/src/app

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

ARG PORT=8080
ENV PORT $PORT

# Install backend app
COPY backend .
RUN npm install --production && npm cache clean --force

# Install frontend app
COPY frontend/dist ./public

EXPOSE $PORT
CMD ["node","server.js"]
