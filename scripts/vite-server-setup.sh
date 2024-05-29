#!/bin/sh
#
# SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0
#

# Determine the directory of the script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Define the SSL directory relative to the script directory
SSL_DIR="${SCRIPT_DIR}/../frontend/ssl"

# Create the SSL directory
mkdir -p "${SSL_DIR}"

# Create the req.cnf file in the SSL directory
cat << EOF > "${SSL_DIR}/req.cnf"
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name

[req_distinguished_name]

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
IP.1 = 127.0.0.1
DNS.1 = localhost
EOF

# Generate CA key and certificate
openssl genrsa -out "${SSL_DIR}/ca-key.pem" 2048
openssl req -x509 -new -nodes -key "${SSL_DIR}/ca-key.pem" -days 3650 -out "${SSL_DIR}/ca.pem" -subj "/CN=local-ca"

# Generate server key and certificate
openssl genrsa -out "${SSL_DIR}/key.pem" 2048
openssl req -new -key "${SSL_DIR}/key.pem" -out "${SSL_DIR}/csr.pem" -subj "/CN=local-ca" -config "${SSL_DIR}/req.cnf"
openssl x509 -req -in "${SSL_DIR}/csr.pem" -CA "${SSL_DIR}/ca.pem" -CAkey "${SSL_DIR}/ca-key.pem" -CAcreateserial -out "${SSL_DIR}/cert.pem" -days 3650 -extensions v3_req -extfile "${SSL_DIR}/req.cnf"

# Add the CA certificate to the macOS Keychain
if [ "$(uname)" = "Darwin" ]; then
  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${SSL_DIR}/ca.pem"
fi
