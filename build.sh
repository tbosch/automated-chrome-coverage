#! /bin/bash
rm -rf dist/e2e
# cp -r src/*.html dist/src
# ./node_modules/.bin/tsc -p src
./node_modules/.bin/tsc -p e2e
