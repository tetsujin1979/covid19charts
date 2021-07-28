'use strict';

const fs = require('fs');

const constants = require("./constants");
const log4jsHelper = require('./log4jsHelper');
const metrics = require("./metrics").metrics;

const logger = log4jsHelper.getLogger('index');

if (process.argv.length == 3) {
    const metric = metrics[process.argv[2]];
    if (metric != undefined) {
        fs.readFile('./covid19dashboard/data.json', 'utf8', (err, data) => {
            if (err) {
                logger.error(`Error reading file from disk: ${err}`);
            } else {
                const covidData = JSON.parse(data);
                logger.debug(`Processing ${covidData.length} items`);
                metric.processData(covidData);
            };
        });
    } else {
        logger.info(`Metric "${process.argv[2]}" not found.`);
        logger.info(`Valid values: [deaths|cases|swabs|vaccinations|hospitalisations]`);
    }
} else {
    logger.info('Usage: node index [deaths|cases|swabs|vaccinations|hospitalisations]');
}
