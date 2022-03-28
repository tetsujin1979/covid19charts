const log4jsHelper = require('./log4jsHelper');
const logger = log4jsHelper.getLogger('updateIcus');

const swabs = require('./swabs');

const fetch = require('node-fetch');
const fs = require('fs');
const stringify = require('json-stringify-pretty-compact');

const swabData = [];

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
        var foundSWABs = false;
        covidData.forEach(covid => {
            var covidDate = new Date(covid.dateString);
            covidDate.setHours(12);
            if(covidDate.toString() === today.toString()) {
                foundToday = true;
                if (covid.hasOwnProperty('dailySwabs') && covid.hasOwnProperty('positiveSwabs')) {
                    foundSWABs = true;
                }
            }
        });
        if (!foundSWABs) {
            if (!foundToday) {
                covidData.push({"dateString": today.toISOString()});
            }
            logger.debug("No swabs attributes found - will update");
            updateICU(covidData);
        }
    }
});

const updateICU = async (covidData, addObject) => {
    try {
      const swabResponse = await fetch('https://opendata.arcgis.com/datasets/f6d6332820ca466999dbd852f6ad4d5a_0.geojson');
      const swabsData =  await swabResponse.json();
      const swabFeatures = swabsData.features;

      var previousPositiveSwabs = 0;
      var previousTotalSwabs = 0;
      var updatedSwabs = false;
      swabFeatures.forEach(swabFeature => {
        const swab = swabFeature.properties;
        var date = new Date(swab.Date_HPSC);
        date.setHours(12);

        swab.date = date;
        swab.dailySwabs = swab.TotalLabs - previousTotalSwabs;
        previousTotalSwabs = swab.TotalLabs;

        swab.positiveSwabs = swab.Positive - previousPositiveSwabs;
        previousPositiveSwabs = swab.Positive;

        swabData.push(swab);
      });

      swabData.sort((swab1, swab2) => swab1.date - swab2.date)
              .forEach(result => {
          covidData.filter(function (covid) {
              var covidDate = new Date(covid.dateString);
              covidDate.setHours(12);
              var found = covidDate.toString() === result.date.toString();
              return found;
          }).map(function(item) {
            covidDate = new Date(item.dateString);
            if (covidDate.toString() === today.toString()) {
              updatedSwabs = true;
            }
            item.dailySwabs = parseInt(result.dailySwabs);
            item.positiveSwabs = parseInt(result.positiveSwabs);
          });
      });
      if (updatedSwabs) {
        fs.writeFile('src/data.json', stringify(covidData, {maxLength: 125, indent: 2}), function(err) { });
        swabs.processData(covidData);
      }
    } catch (error) {
        console.log(error);
    }
}
