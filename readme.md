
# log-facade

Structured log facade for NodeJs to abstract away the choice of a particular logger.

## Installation

```bash
$ npm install log-facade
```

## Usage

```js
var logger = require('log-facade').getLogger('my-app');
logger.info('log text');
logger.info('log', 'concatenated', 'text');
logger.info({data: 'add a property'}, 'and', 'log text');
logger.info(function () { return 'log' + ' text '; });
```

## Configuration

```javascript
var logFacade = require('log-facade');
logFacade.configure({
    loggers: [
        {name: /^log-facade$/, level: 'trace', target: impl},
        {name: /^console$/, level: 'info', target: impl},
        {name: /^my-app$/, level: 'verbose', target: impl},
        {name: /^my-lib_1\.data/, level: 'debug', target: impl},
        {name: /^my-lib_1/, level: 'error', target: impl},
        {name: /^.*$/, level: 'error', target: impl},
    ],
    // Catch output from libs that log to console.
    // Do not use log-facade to log to console if you select this.
    redirectStd: false,
});
```

To create a target, implement all the level functions.
For a simple console logger:

```javascript
function get(fun) {
    return function (src, lvl, data) {
        console[fun](lvl + ' - ' + src + ' - ' + data.msg);
    };
}

var impl = {
    'trace': get('info'),
    'debug': get('info'),
    'verbose': get('info'),
    'info': get('info'),
    'warn': get('warn'),
    'error': get('error'),
    'fatal': get('error'),
};
```
Or, to add some metadata and send straight json to Winston:

```javascript
var winston = require('winston');

var winstonLogger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({
            filename: 'test.log',
            json: false,
            formatter: function (val) { return JSON.stringify(val.meta); }
        })
    ],
});

function get(fun) {
    return function (src, lvl, data) {
        data.timestamp = (new Date()).getTime();
        data.source = src;
        data.level = lvl;
        winstonLogger[fun](data);
    };
}

var impl = {
    'trace': get('silly'),
    'debug': get('debug'),
    'verbose': get('verbose'),
    'info': get('info'),
    'warn': get('warn'),
    'error': get('error'),
    'fatal': get('error'),
};
```
