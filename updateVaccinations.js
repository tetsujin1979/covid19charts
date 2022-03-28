const log4jsHelper = require('./log4jsHelper');
const logger = log4jsHelper.getLogger('updateVaccinations');

const vaccinations = require('./vaccinations');

const fetch = require('node-fetch');
const fs = require('fs');
const stringify = require('json-stringify-pretty-compact');

/// Ignore self signed certificates
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

var yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(12);
yesterday.setMinutes(0);
yesterday.setSeconds(0);
yesterday.setMilliseconds(0);
logger.debug("Getting vaccinations for " + yesterday.toString());
fs.readFile('./src/data.json', 'utf8', (err, data) => {
    if (err) {
        console.log(`Error reading file from disk: ${err}`);
    } else {
        // parse JSON string to JSON object
        const covidData = JSON.parse(data);
        var foundYesterday = false;
        var foundVaccinations = false;
        covidData.forEach(covid => {
            var covidDate = new Date(covid.dateString);
            covidDate.setHours(12);
            if(covidDate.toString() === yesterday.toString()) {
                foundYesterday = true;
                if (covid.hasOwnProperty('firstDose') && covid.hasOwnProperty('booster')) {
                    foundVaccinations = true;
                }
            }
        });
        if (!foundVaccinations) {
            if (!foundYesterday) {
                covidData.push({"dateString": today.toISOString()});
            }
            logger.debug("No vaccination attributes found - will update");
            updateVaccinations(covidData);
        }
    }
});

const updateVaccinations = async (covidData) => {
    var updatingDoses = false;
    var updatingBoosters = false;

    const vaccinationsResponse = await fetch('https://opendata.arcgis.com/datasets/a0e3a1c53ad8422faf00604ee08955db_0.geojson');
    const vaccinationsData =  await vaccinationsResponse.json();

    const boostersResponse = await fetch('https://opendata.arcgis.com/datasets/e6a25866439249e1a03629dd823934c2_0.geojson');
    const boostersData =  await boostersResponse.json();

    let updates = processUpdates(vaccinationsData.features);
    updates.sort((vaccination1, vaccination2) => vaccination1.date - vaccination2.date)
           .forEach(update => {
      covidData.filter(function (covid) {
          var covidDate = new Date(covid.dateString);
          covidDate.setHours(12);
          covidDate.setMinutes(0);
          covidDate.setSeconds(0);
          covidDate.setMilliseconds(0);
          return covidDate.toString() === update.date.toString();
      }).map(function(item) {
          var covidDate = new Date(item.dateString);
          if (covidDate.toString() === yesterday.toString()) {
          logger.debug('Updating doses on ' + item.dateString + ' with ' + update.Dose1 + ', ' + update.Dose2 + ', ' + update.SingleDose);
            updatingDoses = true;
          }
          item.firstDose = parseInt(update.Dose1);
          item.secondDose = parseInt(update.Dose2);
          item.singleDose = parseInt(update.SingleDose);
      });
    });

    updates = processUpdates(boostersData.features);
    updates.sort((vaccination1, vaccination2) => vaccination1.date - vaccination2.date)
           .forEach(update => {
      covidData.filter(function (covid) {
          var covidDate = new Date(covid.dateString);
          covidDate.setHours(12);
          covidDate.setMinutes(0);
          covidDate.setSeconds(0);
          covidDate.setMilliseconds(0);
          return covidDate.toString() === update.date.toString();
      }).map(function(item) {
          var covidDate = new Date(item.dateString);
          if (covidDate.toString() === yesterday.toString()) {
        logger.debug(`Updating boosters on ${item.dateString} with ${update.AdditionalDose}, ${update.ImmunoDose}`);
          updatingBoosters = true;
        }
        item.booster = parseInt(update.AdditionalDose);
        item.immunocompromised = parseInt(update.ImmunoDose);
      });
    });

      fs.writeFile('src/data.json', stringify(covidData, {maxLength: 120, indent: 2}), function(err) { });
    if (updatingBoosters && updatingDoses) {
      vaccinations.processData(covidData);
    }

    function processUpdates(updates) {
      let results = [];
      updates.forEach(update => {
        const updateData = update.properties;
        let date = new Date(updateData.VaccinationDate);
        date.setHours(12);
        updateData.date = date;
        results.push(updateData);
      });
      return results;
    }
}
