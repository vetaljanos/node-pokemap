#!/bin/bash

DIR=$(dirname $0)

if [ ! -f privkey.pem ]; then
  echo "Generating 1024-bit RSA private key..."
  openssl genrsa -out "$DIR/privkey.pem" 1024 > /dev/null 2> /dev/null
  echo "done."
fi

node "$DIR/serve.js"
