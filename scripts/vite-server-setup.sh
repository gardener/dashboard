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

# Filename of the CA certificate
CA_FILENAME="${SSL_DIR}/ca.pem"

# Common name of the CA certificate
CA_COMMON_NAME="gardener-dashboard-ca"

# Generate CA key and certificate
openssl genrsa -out "${SSL_DIR}/ca-key.pem" 2048
openssl req -x509 -new -nodes -key "${SSL_DIR}/ca-key.pem" -days 3650 -out "${SSL_DIR}/ca.pem" -subj "/CN=$CA_COMMON_NAME"

# Generate server key and certificate
openssl genrsa -out "${SSL_DIR}/key.pem" 2048
openssl req -new -key "${SSL_DIR}/key.pem" -out "${SSL_DIR}/csr.pem" -subj "/CN=gardener-dashboard-server" -config "${SSL_DIR}/req.cnf"
openssl x509 -req -in "${SSL_DIR}/csr.pem" -CA "${SSL_DIR}/ca.pem" -CAkey "${SSL_DIR}/ca-key.pem" -CAcreateserial -out "${SSL_DIR}/cert.pem" -days 3650 -extensions v3_req -extfile "${SSL_DIR}/req.cnf"

# Parse command line arguments
SKIP_KEYCHAIN=false
for arg in "$@"; do
  case $arg in
    --skip-keychain | -s)
      SKIP_KEYCHAIN=true
      shift
      ;;
  esac
done

# Function to add or update CA certificate in macOS Keychain
add_or_update_ca() {
  local fingerprint
  local message

  fingerprint=$(security find-certificate -c "$CA_COMMON_NAME" -a -Z | awk '/SHA-1/ { print $NF }')
  if [ -n "$fingerprint" ]; then
    sudo security delete-certificate -Z "$fingerprint" /Library/Keychains/System.keychain
    message="The existing CA certificate has been updated in the macOS Keychain."
  else
    message="The CA certificate has been added to the macOS Keychain."
  fi
  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CA_FILENAME" && \
  printf "$message" >&2
}

# Add or update the CA certificate in the macOS Keychain, unless --skip-keychain is specified
if [ "$SKIP_KEYCHAIN" = false ]; then
  if [ "$(uname)" = "Darwin" ]; then
    printf "Adding the CA certificate to the macOS Keychain. You may be prompted to enter your credentials.\n" >&2
    add_or_update_ca
  else
    printf "It is recommended to add the CA certificate to the local trust store of your operating system." >&2
  fi
else
  printf "Skipped adding the CA certificate to the keychain as per the user's request." >&2
fi
