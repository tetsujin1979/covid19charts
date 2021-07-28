const log4js = require("log4js");
const loggerConfiguration = {
    appenders: {
        console: {  type: 'stdout'  },
        file_log: { type: 'file', filename: 'application.log' },
        debugFilter: {  type:'logLevelFilter', level: 'debug', appender: 'file_log' },
        infoFilter:  {  type:'logLevelFilter', level: 'info', appender: 'console' }
    },
    categories: {
       default: {
           appenders: [ 'debugFilter','infoFilter'], level: 'debug'}
    }
}

log4js.configure(loggerConfiguration);

exports.getLogger = (loggerName) => log4js.getLogger(loggerName);
