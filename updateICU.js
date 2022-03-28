const log4jsHelper = require('./log4jsHelper');
const logger = log4jsHelper.getLogger('updateIcus');

const icu = require('./icu');

const fetch = require('node-fetch');
const fs = require('fs');
const stringify = require('json-stringify-pretty-compact');

const icuData = [];

var today = new Date();
today.setHours(12);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);

fs.readFile('./src/data.json', 'utf8', (err, data) => {
    if (err) {
        console.log(`Error reading file from disk: ${err}`);
    } else {
        // parse JSON string to JSON object
        const covidData = JSON.parse(data);
        var foundToday = false;
        var foundICUObject = false;
        covidData.forEach(covid => {
            var covidDate = new Date(covid.dateString);
            covidDate.setHours(12);
            if(covidDate.toString() === today.toString()) {
                foundToday = true;
                if (covid.hasOwnProperty('icu')) {
                    foundICUObject = true;
                }
            }
        });
        if (!foundICUObject) {
            logger.debug("No icu object found - will update");
            if (foundToday) {            
                covidData.filter(function (covid) {
                    var covidDate = new Date(covid.dateString);
                    covidDate.setHours(12);
                    var found = covidDate.toString() === today.toString();
                    return found;
                }).map(function(item) {
                    logger.debug("Adding icu object to existing object");
                    item.icu = {};
                });
            } else {
                logger.debug("Creating new object with ICU attribute");
                covidData.push({
                    dateString: today.toISOString(),
                    icu: {}
                });
            }
            updateICU(covidData);
        }
    }
});

const updateICU = async (covidData, addObject) => {
    try {
        const icuResponse = await fetch('https://opendata.arcgis.com/datasets/c8208a0a8ff04a45b2922ae69e9b2206_0.geojson');
        const icuResponseData =  await icuResponse.json();
        const icuFeatures = icuResponseData.features;
        const icuDate = [];
        var updatedIcu = false;
        icuFeatures.forEach(icuFeature => {
          const icu = icuFeature.properties;
          var date = new Date(icu.extract);
          date.setHours(12);
          date.setMinutes(0);
          date.setSeconds(0);
          date.setMilliseconds(0);

          icu.date = date;
          icuData.push(icu);
        });

        icuData.sort((icu1, icu2) => icu1.date - icu2.date)
                .forEach(result => {
            covidData.filter(function (covid) {
                var covidDate = new Date(covid.dateString);
                covidDate.setHours(12);
                var found = covidDate.toString() === result.date.toString();
                return found;
            }).map(function(item) {
                covidDate = new Date(item.dateString);
                if (covidDate.toString() === today.toString()) {
                  updatedIcu  = true;
                }
                item.icu.cases = parseInt(result.ncovidconf);
                item.icu.admissions = parseInt(result.adcconf);
                item.icu.discharges = parseInt(result.ndischcovidconf);
            });
        });
        if (updatedIcu) {
            fs.writeFile('./src/data.json', stringify(covidData, {maxLength: 125, indent: 2}), function(err) { });
            icu.processData(covidData);
        }
    } catch (error) {
        console.log(error);
    }
}
