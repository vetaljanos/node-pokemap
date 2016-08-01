#!/bin/bash

set -e
set -u

ZIPFILE=pokemap-$(date +%Y-%m-%d).zip

rm -rf /tmp/pokemap-build/
mkdir -p /tmp/pokemap-build/{pokemap,test}

rsync -av --exclude=.git --exclude=test ./ /tmp/pokemap-build/pokemap/

pushd /tmp/pokemap-build/
  pushd /tmp/pokemap-build/pokemap/
    # remove this script
    rm -f ZIP.bash
    # remove private key
    rm -f privkey.pem

    # preserve demo.json, but remove other debug files
    rsync -av utils/demo.json ./
    rm -rf utils/
    mkdir -p utils/
    mv demo.json utils/

    # remove ursa and rely only on node-forge
    rm -rf node_modules/ursa

    pushd public/
      rm -f Dockerfile Gruntfile.js Procfile app.json package.json requirements.txt runserver.py
      rm -rf pogom/ config/ templates/ Easy\ Setup/ node_modules/
    popd

  popd

  zip -r "$ZIPFILE" pokemap/
popd

unzip /tmp/pokemap-build/"$ZIPFILE" -d /tmp/pokemap-build/test/
