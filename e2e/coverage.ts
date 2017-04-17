// Adapted from https://github.com/paulirish/automated-chrome-profiling

import * as fs from 'fs';
import * as path from 'path';
import * as uglify from 'uglify-js';

const Chrome = require('chrome-remote-interface');

/**
 * See https://chromedevtools.github.io/debugger-protocol-viewer/tot/Profiler/#type-ScriptCoverage
 */
interface CoverageRange {
  startOffset: number;
  endOffset: number;
  count: number;
}
interface FunctionCoverage {
  functionName: string;
  ranges: CoverageRange[];
}
interface ScriptCoverage {
  scriptId: string;
  url: string;
  functions: FunctionCoverage[]
}

const url = 'http://localhost:8080/index.html';
const script = 'main.js';

Chrome(function (chrome: { Page: any, Runtime: any, Profiler: any, send: any, close: any }) {
  chrome.Page.enable();
  chrome.Profiler.enable()
    .then(() => chrome.send('Profiler.startPreciseCoverage'))
    .then(() => chrome.Page.navigate({ 'url': url }))
    .then(() => waitForPageLoad())
    .then(() => console.log(`>>> Loaded ${url}`))
    .then(() => chrome.send('Profiler.takePreciseCoverage'))
    .then((results: { result: ScriptCoverage[] }) => {
      results.result.filter(sc => /.*\.js/.test(sc.url))
        .forEach(sc => {
          // Grab the "main.X.bundle.js" file"
          const pathArr = sc.url.split('/');
          const baseFileName = pathArr[pathArr.length - 1];
          (function (baseFileName:string) {
            const fileName = path.join(__dirname, "..", "src", baseFileName);
            fs.readFile(fileName, "utf8", function(err, fileContents) {
            if (err) return console.log(err);

            // Turn the whole file into an array so ranges can be easily replaced out.
            let file = fileContents.split("");

            // Iterate over the returned file and get rid of the junk
            sc.functions.filter(fc => {
              if (fc.ranges.length !== 1) throw "Ranges should have one entry";
              return fc.ranges[0].count === 0;
            })
            .forEach(fc => {
              let startOffset = fc.ranges[0].startOffset;
              let endOffset = getEndOffset(file, fc.ranges[0].endOffset - 1);
              function getEndOffset(a:string[], offset:number): number {
                if (a[offset] !== "}") return getEndOffset(a, offset - 1);
                return offset;
              }
              
              // Verify this is a function call
              function isFunction(start: number): boolean {
                console.log(file.slice(start, start + 8).join("") === "function", file.slice(start, start + 8).join(""));
                return file.slice(start, start + 8).join("") === "function";
              }
              if (isFunction(startOffset)) {
                // if ((endOffset - startOffset) > 25 ) {
                //   file.splice(startOffset, 0, ..."/*@__PURE__*/".split(''));
                //   startOffset += 21;
                //   endOffset += 13;
                // } else {
                  file[startOffset] = 'ɵ';
                  startOffset += 8;
                // }
                let foundFuncStart = false;
                for (let i = startOffset, k = 0 ; i <= endOffset ; i++, k++) {

                  if (!foundFuncStart) {
                    if (file[i] === "(") {
                      foundFuncStart = true;
                      i++;
                      file[i] = ")";
                      i++;
                      file[i] = "{";
                    }
                  } else if (i === endOffset) {
                    file[i] = "}";
                  } else {
                    file[i] = " ";
                  }
                }
              }
              // file.splice(startOffet, fc.ranges[0].endOffset, "X")
            });
            let writeFile = file.join("");
            writeFile = writeFile.replace(/ɵunction/g, '/*@__PURE__*/function');
            fs.writeFileSync(path.join(__dirname, "..", "coverage", baseFileName), writeFile, "utf8");
          })})(baseFileName);
        })
        // .filter(fn => {
        //   if (fn.ranges.length !== 1) throw "Ranges should have one entry";
        //   return fn.ranges[0].count === 0;
        // })
        
        // .reverse()
        // .forEach(entry => {
        //   console.log(`>>> coverage for ${entry.url}`);
        //   console.log(entry.functions.map(data => JSON.stringify(data)).join('\n'))
        // });
      
      // const mainJsProfile = results.result.find(entry => entry.url.endsWith(script));
      // console.log(`>>> coverage for ${script}`);
      // console.log(mainJsProfile.functions.map(entry => JSON.stringify(entry)).join('\n'));
    }).then(() => chrome.close());
}
).on('error', function () {
  console.error('Cannot connect to Chrome');
});

function waitForPageLoad() {
  return new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
}
