#!/bin/bash

if [ ! -f privkey.pem ]; then
  openssl genrsa -out privkey.pem 1024 > /dev/null 2> /dev/null
fi

node serve.js
