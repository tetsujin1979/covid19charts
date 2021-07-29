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

let debug = false;
let environment = 'local';

if (typeof process.env.debug === 'undefined') {

    debug = properties.get('main.application.debug');

} else {

    debug = (process.env.debug === 'true');
}

if (typeof process.env.environment === 'undefined') {

    environment = properties.get('main.application.environment');

} else {

    environment = process.env.environment;
}

const directories = {
    local: {
        cases: "cases",
        deaths: "deaths", 
        hospitalisations: "hospitalisations",
        swabs: "swabs",
        vaccinations: "vaccinations"
    },
    lambda: {
        cases: "/tmp",
        deaths: "/tmp", 
        hospitalisations: "/tmp",
        swabs: "/tmp",
        vaccinations: "/tmp"
    }
}
exports.days = () => days;
exports.oneMonthAgo = () => oneMonthAgo;
exports.directories = () => directories[environment];

exports.createTweet = createTweet;
exports.difference = difference;
exports.valueAndString = valueAndString;

exports.debug = () => debug;
