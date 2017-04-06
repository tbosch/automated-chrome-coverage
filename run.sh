#! /bin/bash
./node_modules/.bin/http-server dist/src -p 8080 -a 0.0.0.0 &
HTTP_PID=$!

/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --remote-debugging-port=9222 --user-data-dir=$TMPDIR/chrome-profiling --no-default-browser-check &
CHROME_PID=$!

function finish {
  echo killing http server
  kill $HTTP_PID

  echo killing chrome
  kill $CHROME_PID
}

trap finish EXIT

echo "Waiting for HTTP and chrome to start..."
sleep 4

node dist/e2e/coverage.js
