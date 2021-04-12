const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const hashtag = '#COVID19Ireland';

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

exports.days = days;
exports.hashtag = hashtag;
exports.loggerConfiguration = loggerConfiguration;
