// Adapted from https://github.com/paulirish/automated-chrome-profiling

import * as fs from 'fs';

const Chrome = require('chrome-remote-interface');

/**
 * See https://chromedevtools.github.io/debugger-protocol-viewer/tot/Profiler/#type-ScriptCoverage
 */
interface CoverageEntry {
    url: string;
    functions: {
        startOffset: number;
        endOffset: number;
        count: number;
    }[]
}

const url = 'http://localhost:8080/index.html';
const script = 'main.js';

Chrome(function (chrome: {Page: any, Runtime: any, Profiler: any, send: any, close: any}) {
        chrome.Page.enable();
        chrome.Profiler.enable()
            .then( () => chrome.send('Profiler.startPreciseCoverage'))
            .then( () => chrome.Page.navigate({'url': url}) )
            .then( () => waitForPageLoad() )
            .then( () => console.log(`>>> Loaded ${url}`))
            .then( () => chrome.send('Profiler.takePreciseCoverage') )
            .then( (results: {result: CoverageEntry[]}) => {
                const mainJsProfile = results.result.find(entry => entry.url.endsWith(script));
                console.log(`>>> coverage for ${script}`);
                console.log(mainJsProfile.functions.map(entry => JSON.stringify(entry)).join('\n'));
            }).then( () => chrome.close());
    }
).on('error', function () {
    console.error('Cannot connect to Chrome');
});

function waitForPageLoad() {
    return new Promise((resolve) => {
        setTimeout(resolve, 3000);
    });
}
