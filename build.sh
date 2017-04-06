#! /bin/bash
cp -r src/*.html dist/src
./node_modules/.bin/tsc -p src
./node_modules/.bin/tsc -p e2e
