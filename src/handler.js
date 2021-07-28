'use strict';

const fetch = require('node-fetch');
const metrics = require("./metrics");
const log4js = require('log4js');
const constants = require("./constants");

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('handler');

const url = "https://raw.githubusercontent.com/tetsujin1979/covid19dashboard/main/data.json";
const settings = { method: "Get" };

module.exports.processData = (event, context, callback) => {
	const metric = metrics[event.metric];
	if (metric != undefined) {
		fetch(url, settings)
		  .then(res => res.json())
		  .then((json) => {
		    metric.processData(json);
		    const returnData = {
		    	"result": "success"
		    };
		    callback(null, returnData);
		  });		
	} else {
	    const returnData = {
	    	"result": "failure"
	    };
		logger.info(`Unknown metric: ${event.metric}`);
		callback(null, returnData);
	}
};
