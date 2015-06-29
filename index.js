'use strict';

// Logger for lib logging.
var localLogger;

// Supported logging levels, in ascending order.
var levels = [
    'trace',
    'debug',
    'verbose',
    'info',
    'warn',
    'error',
    'fatal',
];

// Default no-op implementation.
function defaultImplementation() {
    var result = {};
    for (var i = 0; i < levels.length; i++) {
        result[levels[i]] = function () {
        }
    }
    return result;
}

// Default loggers configuration.
// Only root with error level.
function defaultLoggers() {
    return [
        {
            name: /.*/,
            level: 'error',
            target: defaultImplementation(),
        }
    ];
}

// Default formatter for argument concatenation mode.
function defaultFormatter(args) {
    return args.join(' ');
}

// The current configuration.
var configuration = {
    // The list of loggers:
    // {
    //  name: regex to match the used logger name
    //  level: string level threshold
    //  target: object implementation of all logging levels
    // }
    loggers: defaultLoggers(),
    // The formatter is a function used to merge multi string input.
    formatter: defaultFormatter,
    // Standard output redirection.
    // Either boolean or object with target logger name.
    redirectStd: false,
    // The main text property to add.
    msgProperty: 'msg',
};

// Configure the logging framework globally,
// can be done partially multiple times.
function configure(conf) {
    if ('loggers' in conf) configuration.loggers = conf.loggers;
    if ('formatter' in conf) configuration.formatter = conf.formatter;
    if ('redirectStd' in conf) configuration.redirectStd = conf.redirectStd;
    if ('msgProperty' in conf) configuration.msgProperty = conf.msgProperty;
    confDirty = true;
}

// Has the configuration been changed since last applyConfiguration().
var confDirty = true;

// Configuration is only applied when requesting a logger,
// so configure() can be called multiple times.
function applyConfiguration() {
    if (confDirty) {
        confDirty = false;
        // Standard output redirection.
        if (configuration.redirectStd === true || typeof configuration.redirectStd === 'object') {
            var loggerName;
            if (typeof configuration.redirectStd === 'object') {
                loggerName = configuration.redirectStd.name;
            }
            if (!loggerName) {
                loggerName = 'console';
            }
            standard.redirect(loggerName);
        } else if (typeof configuration.redirectStd === false) {
            standard.restore();
        }
        localLogger = getLogger('log-facade');
    }
}

// stdout/stderr hook to redirect console output to log-facade.
// Useful to catch debug output from libraries.
// Do not use log-facade to log to console after doing this.
var standard = (function () {

    function redirect(name) {
        var consoleLogger = getLogger(name);

        process.stdout.write = function (str) {
            consoleLogger.info(str.replace(/(\r\n|\n|\r)$/m, ''));
        };

        process.stderr.write = function (str) {
            consoleLogger.error(str.replace(/(\r\n|\n|\r)$/m, ''));
        };
    }

    function restore() {
        process.stdout.write = stdout;
        process.stderr.write = stderr;
    }

    // Backup standard writers to rollback configuration.
    var stdout = process.stdout.write;
    var stderr = process.stderr.write;

    return {
        redirect: redirect,
        restore: restore,
    };

})();

// Look for a logger by name in the list.
function findLogger(name) {
    for (var i = 0; i < configuration.loggers.length; i++) {
        var logger = configuration.loggers[i];
        if (logger.name.test(name)) {
            return logger;
        }
    }
}

// Create a named logger implementing all the logging functions.
function getLogger(name) {

    applyConfiguration();

    var methods = {};
    var logger = findLogger(name);

    if (!logger) {
        if (localLogger) {
            localLogger.verbose('Couldn\'t match', name, 'to any logger');
        }
    } else {
        if (localLogger) {
            localLogger.verbose('Matched', name, 'to logger', logger.name, 'with level', logger.level);
        }
        var above = false;
        for (var i = 0; i < levels.length; i++) {
            if (logger.level === levels[i]) {
                above = true;
            }
            (function (level, valid) {
                methods[level] = function () {
                    if (valid && typeof logger.target[level] === 'function') {
                        var a = [name, level];
                        var b = Array.prototype.slice.call(arguments, 0);
                        if (b.length) {
                            var data;
                            if (typeof b[0] === 'function') {
                                b[0] = b[0]();
                            }
                            if (typeof b[0] === 'object') {
                                data = b.shift();
                            } else {
                                data = {};
                            }
                            if (b.length) {
                                if (typeof b[0] === 'string' || typeof b[0] === 'number') {
                                    data[configuration.msgProperty] = b.length > 1 ? configuration.formatter(b) : b[0];
                                }
                            }
                        }
                        logger.target[level](name, level, data);
                    } else {
                        // Level not configured or below threshold, do nothing.
                        if (localLogger) {
                            localLogger.debug('Intercepted log to logger', logger.name, 'with level', level);
                        }
                    }
                };
            })(levels[i], above);
        }
    }

    return methods;
}

module.exports = {
    configure: configure,
    getLogger: getLogger,
};
