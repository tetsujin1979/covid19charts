'use strict';
const fs = require('fs');
const log4js = require('log4js');

const deaths = require('./deaths');
const cases = require('./cases');
const swabs = require('./swabs');
const vaccinations = require('./vaccinations');
const hospitalisations = require('./hospitalisations');

const constants = require("./constants");

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('index');

const metrics = {
	cases: cases,
	deaths: deaths,
	swabs: swabs,
	vaccinations: vaccinations,
	hospitalisations: hospitalisations
};

if (process.argv.length == 3) {

	fs.readFile('./covid19dashboard/data.json', 'utf8', (err, data) => {
		if (err) {
	    	logger.error(`Error reading file from disk: ${err}`);
	  	} else {
	    	const covidData = JSON.parse(data);
	    	logger.debug(`Processing ${covidData.length} items`);
	    	metrics[process.argv[2]].processData(covidData);
		};
	});

} else {
	logger.info('Usage: node index [deaths|cases|swabs|vaccinations|hospitalisations]');
}
