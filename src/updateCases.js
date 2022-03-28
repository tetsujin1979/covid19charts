const log4jsHelper = require('./log4jsHelper');
const logger = log4jsHelper.getLogger('updateIcus');

const cases = require('./cases');

const fetch = require('node-fetch');
const fs = require('fs');
const stringify = require('json-stringify-pretty-compact');

var today = new Date();
today.setHours(12);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);

var yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(12);
yesterday.setMinutes(0);
yesterday.setSeconds(0);
yesterday.setMilliseconds(0);

fs.readFile('./src/data.json', 'utf8', (err, data) => {
    if (err) {
        console.log(`Error reading file from disk: ${err}`);
    } else {
        // parse JSON string to JSON object
        const covidData = JSON.parse(data);
        var foundToday = false;
        var foundCases = false;
        var foundAntigen = false;
        covidData.forEach(covid => {
            var covidDate = new Date(covid.dateString);
            covidDate.setHours(12);
            if(covidDate.toString() === today.toString()) {
                foundToday = true;
                if (covid.hasOwnProperty('cases')) {
                    logger.info(`PCR cases set for ${today}, will not update`);
                    foundCases = true;
                }
            }
            if(covidDate.toString() === yesterday.toString()) {
                if (covid.hasOwnProperty('antigen')) {
                    logger.info(`antigen set for ${yesterday}, will not update`);
                    foundAntigen = true;
                }
            }
        });
        if (!foundCases || !foundAntigen) {
            if (!foundToday) {
                covidData.push({"dateString": today.toISOString()});
            }
            logger.debug("No cases found - will update");
            updateCases(covidData);
        }
    }
});

const updateCases = async (covidData, addObject) => {
    try {
        const pcrResponse = await fetch('https://opendata.arcgis.com/datasets/d8eb52d56273413b84b0187a4e9117be_0.geojson');
        const pcrResponseData =  await pcrResponse.json();
        const pcrFeatures = pcrResponseData.features;
        const pcrData = [];
        var updatedPCR = false;
        pcrFeatures.forEach(pcrFeature => {
          const pcr = pcrFeature.properties;
          var date = new Date(pcr.Date);
          date.setHours(12);
          date.setMinutes(0);
          date.setSeconds(0);
          date.setMilliseconds(0);

          pcr.date = date;
          pcrData.push(pcr);
        });

        const antigenResponse = await fetch('https://services-eu1.arcgis.com/z6bHNio59iTqqSUY/ArcGIS/rest/services/Registered_Positive_Antigen_View/FeatureServer/0/query?where=RegisteredPositiveAntigenFigure+is+not+null&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&returnGeodetic=false&outFields=DateOfData%2CRegisteredPositiveAntigenFigure&returnGeometry=false&featureEncoding=esriDefault&multipatchOption=none&maxAllowableOffset=&geometryPrecision=&outSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnExceededLimitFeatures=false&quantizationParameters=&sqlFormat=none&f=json&token=');
        const antigenResponseData =  await antigenResponse.json();
        const antigenFeatures = antigenResponseData.features;
        const antigenData = [];
        var updatedAntigen = false;
        antigenFeatures.forEach(antigenFeature => {
          var date = new Date(antigenFeature.attributes.DateOfData);
          date.setDate(date.getDate() - 1);
          date.setHours(12);
          date.setMinutes(0);
          date.setSeconds(0);
          date.setMilliseconds(0);

          antigenFeature.date = date;
          antigenData.push(antigenFeature);
        });

        pcrData.sort((pcr1, pcr2) => pcr1.date - pcr2.date)
                .forEach(result => {
            covidData.filter(function (covid) {
                var covidDate = new Date(covid.dateString);
                covidDate.setHours(12);
          covidDate.setMinutes(0);
          covidDate.setSeconds(0);
          covidDate.setMilliseconds(0);
                var found = covidDate.toString() === result.date.toString();
                return found;
            }).map(function(item) {
                covidDate = new Date(item.dateString);
                if (covidDate.toString() === today.toString()) {
                    logger.debug(`Updating PCR cases for ${item.dateString}`);
                  updatedPCR  = true;
                }
                item.cases = parseInt(result.ConfirmedCovidCases);
            });
        });

        antigenData.sort((antigen1, antigen2) => antigen1.date - antigen2.date)
                .forEach(result => {
            covidData.filter(function (covid) {
                var covidDate = new Date(covid.dateString);
                covidDate.setHours(12);
                covidDate.setMinutes(0);
                covidDate.setSeconds(0);
                covidDate.setMilliseconds(0);
                var found = covidDate.toString() === result.date.toString();
                return found;
            }).map(function(item) {
                covidDate = new Date(item.dateString);
                if (covidDate.toString() === yesterday.toString()) {
                    logger.debug(`Updating antigen cases for ${item.dateString}`);
                    updatedAntigen  = true;
                }
                item.antigen = parseInt(result.attributes.RegisteredPositiveAntigenFigure);
            });
        });

        if (updatedPCR && updatedAntigen) {
            fs.writeFile('./src/data.json', stringify(covidData, {maxLength: 125, indent: 2}), function(err) { });
            cases.processData(covidData);
        }
    } catch (error) {
        console.log(error);
    }
}
