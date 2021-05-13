const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const hashtag = '#COVID19Ireland';

let records = '';
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

const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

const valueAndString = (value) => {
    return {
        value: value,
        string: Number(value).toLocaleString('en')
    }
};

const difference = (a, b) => {
    return {
        difference: ((a > b) ? '+' : '') + (a - b).toLocaleString('en'),
        percentage: ((a > b) ? '+' : '') + (((a - b) * 100) / b).toFixed(2) + '%'
    };
};

exports.days = days;
exports.hashtag = hashtag;
exports.loggerConfiguration = loggerConfiguration;
exports.oneMonthAgo = oneMonthAgo;
exports.valueAndString = valueAndString;
exports.difference = difference;
exports.debug = false;
