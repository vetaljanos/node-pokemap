#!/bin/bash

# TODO http://sveinbjorn.org/platypus

DIR=$(dirname $0)

if [ ! -f privkey.pem ]; then
  openssl genrsa -out "$DIR/privkey.pem" 1024 > /dev/null 2> /dev/null
fi

node "$DIR/serve.js"
