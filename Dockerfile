#*********************************************************************
# Copyright (c) Intel Corporation 2021
# SPDX-License-Identifier: Apache-2.0
#*********************************************************************/
#Multistage docker layer to isolate the git credentials
#First stage copy and install dependencies
FROM node:lts-bullseye-slim@sha256:61bfe4ca608025ed7da3575f66a11eaf76178b6f7e69607be88ca10ca0a94a22 as builder

WORKDIR /mps

COPY package*.json ./

# Install dependencies
RUN npm ci --unsafe-perm

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src/
COPY agent ./agent/
COPY .mpsrc ./

# Transpile TS -> JS
RUN npm run build
RUN npm prune --production

FROM alpine:latest@sha256:4b7ce07002c69e8f3d704a9c5d6fd3053be500b7f1c69fc0d80990c2ad8dd412
LABEL license='SPDX-License-Identifier: Apache-2.0' \
      copyright='Copyright (c) Intel Corporation 2021'

RUN addgroup -g 1000 node && adduser -u 1000 -G node -s /bin/sh -D node 
RUN apk update && apk upgrade --no-cache && apk add nodejs --no-cache

COPY --from=builder  /mps/dist /mps/dist
# for healthcheck backwards compatibility
COPY --from=builder  /mps/.mpsrc /.mpsrc
COPY --from=builder  /mps/node_modules /mps/node_modules
COPY --from=builder  /mps/package.json /mps/package.json
# set the user to non-root
USER node
# Default Ports Used
EXPOSE 4433
EXPOSE 3000

CMD ["node", "/mps/dist/index.js"]