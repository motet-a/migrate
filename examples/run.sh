#!/bin/sh -e

cd "$(dirname "$0")"
cd mongo

npm i
node index.js
