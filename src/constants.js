const propertiesReader = require('properties-reader');

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

const valueAndString = (value) => {
    return {
        value: value,
        string: Number(value).toLocaleString('en')
    }
};

const difference = (a, b) => {
    const difference = ((a > b) ? '+' : '') + (a - b).toLocaleString('en'); 
    const percentage = ((a > b) ? '+' : '') + (((a - b) * 100) / b).toFixed(2) + '%';
    const string = `(${difference} | ${percentage})`;
    return {
        difference: difference,
        percentage: percentage,
        toString: string
    };
};

const createTweet = (status, url) => {
    return {
        status: status,
        url: url
    };
};

const properties = propertiesReader('application.properties');
const environmentDebugVariable = (typeof process.env.debug === 'undefined') ? false : (process.env.debug === 'true');

exports.days = () => days;
exports.oneMonthAgo = () => oneMonthAgo;

exports.createTweet = createTweet;
exports.difference = difference;
exports.valueAndString = valueAndString;

exports.debug = () => (properties.get('main.application.debug') || environmentDebugVariable);
