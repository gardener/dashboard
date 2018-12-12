# Based on alpine image
FROM alpine:3.8

# Install curl
RUN apk add --no-cache curl

# Install jq
RUN apk add --no-cache jq

# install scripts in /usr/src/app directory
WORKDIR /usr/src/cleanup
COPY cleanup.sh ./
RUN chmod a+x ./cleanup.sh

CMD ["sh", "/usr/src/cleanup/cleanup.sh"]