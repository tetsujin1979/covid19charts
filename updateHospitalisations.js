const log4jsHelper = require('./log4jsHelper');
const logger = log4jsHelper.getLogger('updateHospitalisations');

const hospitalisations = require('./hospitalisations');

const fetch = require('node-fetch');
const csv = require('csv-parser');
const fs = require('fs');
const stringify = require('json-stringify-pretty-compact');

const hospitalisationData = [];

var today = new Date();
today.setHours(12);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);

fs.readFile('./src/data.json', 'utf8', (err, data) => {
    if (err) {
        cosole.log(`Error reading file from disk: ${err}`);
    } else {
        // parse JSON string to JSON object
        const covidData = JSON.parse(data);
        var foundToday = false;
        var foundHospitalisationObject = false;
        logger.debug("Parsed JSON");
        covidData.forEach(covid => {
            var covidDate = new Date(covid.dateString);
            covidDate.setHours(12);
            if(covidDate.toString() === today.toString()) {
                foundToday = true;
                if (covid.hasOwnProperty('hospitalisations')) {
                    logger.debug("Found object", covid);
                    foundHospitalisationObject = true;
                }
            }
        });
        if (!foundHospitalisationObject) {
            logger.debug("No hospitalisations object found - will update");
            if (foundToday) {            
                covidData.filter(function (covid) {
                    var covidDate = new Date(covid.dateString);
                    covidDate.setHours(12);
                    var found = covidDate.toString() === today.toString();
                    return found;
                }).map(function(item) {
                    logger.debug("Adding hospitalisations object to existing object");
                    item.hospitalisations = {};
                });
            } else {
                logger.debug("Adding new hospitalisaions object to existing object");
                covidData.push({
                    dateString: today.toISOString(),
                    hospitalisations: {}
                });
            }
            updateHospitalisations(covidData);
        }
    }
});

const updateHospitalisations = async (covidData, addObject) => {
    try {
        const hospitalisationResponse = await fetch('https://opendata.arcgis.com/datasets/fe9bb23592ec4142a4f4c2c9bd32f749_0.geojson');
        const hospitalisationsData =  await hospitalisationResponse.json();
        const hospitalisationFeatures = hospitalisationsData.features;
        var updatedHospitalisations = false;
        hospitalisationFeatures.forEach(hospitalisationFeature => {
          const hospitalisation = hospitalisationFeature.properties;
          var date = new Date(hospitalisation.Date);
          date.setHours(12);

          hospitalisation.date = date;
          hospitalisationData.push(hospitalisation);
        });

        hospitalisationData.sort((hospitalisation1, hospitalisation2) => hospitalisation1.date - hospitalisation2.date)
                .forEach(result => {
            covidData.filter(function (covid) {
                var covidDate = new Date(covid.dateString);
                covidDate.setHours(12);
                var found = covidDate.toString() === result.date.toString();
                return found;
            }).map(function(item) {
                covidDate = new Date(item.dateString);
                if (covidDate.toString() === today.toString()) {
                  updatedHospitalisations = true;
                }
              item.hospitalisations.cases = parseInt(result.SUM_number_of_confirmed_covid_1);
              item.hospitalisations.admissions = parseInt(result.SUM_no_new_admissions_covid19_p);
              item.hospitalisations.discharges = parseInt(result.SUM_no_discharges_covid19_posit);
              item.hospitalisations.hospitalAcquired = parseInt(result.SUM_number_of_new_covid_19_cases_co) - parseInt(result.SUM_no_new_admissions_covid19_p);
            });
        });
        if (updatedHospitalisations) {
            fs.writeFile('./src/data.json', stringify(covidData, {maxLength: 125, indent: 2}), function(err) { });
            hospitalisations.processData(covidData);
        }
    } catch (error) {
        logger.debug(error);
    }
}
