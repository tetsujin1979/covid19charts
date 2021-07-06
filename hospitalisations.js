const fs = require('fs');
const moment = require('moment');
const log4js = require("log4js");

const chartHelper = require("./chartHelper");
const twitterHelper = require("./twitterHelper");
const constants = require("./constants");

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('hospitalisations');

const hashtag = constants.hashtag;
const days = constants.days;

const graphData = new Array();

const dailyHospitalisations = {
  label: "Hospitalisations",
  data: [],
  borderColor: "rgba(14, 54, 201, 0.5)",
  backgroundColor: "transparent",
  borderWidth: 4,
  type: "line"
};

const dailyICU = {
  label: "ICU",
  data: [],
  borderColor: "red",
  backgroundColor: "transparent",
  borderWidth: 4,
  type: "line"
};

const oneMonthAgo = constants.oneMonthAgo;

function processData(covidData) {
  logger.info('Processing daily hospitalisations');
  covidData.forEach(function(item, index) {
    if (item.hasOwnProperty("dateString") && item.hasOwnProperty("hospitalisations") && item.hasOwnProperty("icu")) {
      let date = new Date(item.dateString);
      let hospitalisationData = {
        date: date,
        hospitalisations: item.hospitalisations,
        icu: item.icu
      }
      if (index > 7) {
        let today = covidData[index];
        let yesterday = covidData[index - 1];
        let twoDaysAgo = covidData[index - 2];
        let threeDaysAgo = covidData[index - 3];
        let fourDaysAgo = covidData[index - 4];
        let fiveDaysAgo = covidData[index - 5];
        let sixDayAgo = covidData[index - 6];
        let weeklyHospitalisations = today.hospitalisations + yesterday.hospitalisations + twoDaysAgo.hospitalisations + threeDaysAgo.hospitalisations + fourDaysAgo.hospitalisations + fiveDaysAgo.hospitalisations + sixDayAgo.hospitalisations;
        let weeklyICU = today.icu + yesterday.icu + twoDaysAgo.icu + threeDaysAgo.icu + fourDaysAgo.icu + fiveDaysAgo.icu + sixDayAgo.icu;
        hospitalisationData.sevenDayAverageHospitalisations = (weeklyHospitalisations / 7).toFixed(2);
        hospitalisationData.sevenDayAverageICU = (weeklyICU / 7).toFixed(2);
      }
      graphData.push(hospitalisationData);
    }
  });

  header = '📅 ' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM YYYY');
  processDailyHospitalisationData();
}

function processDailyHospitalisationData() {
  logger.info("Processing daily hospitalisation data");
  let labels = new Array();
  dailyHospitalisations.data = new Array();
  dailyICU.data = new Array();

  graphData.filter(item => item.date > oneMonthAgo)
           .forEach(function(value, index) {
    labels.push(value.date.toDateString());
    dailyHospitalisations.data.push(value.hospitalisations);
    dailyICU.data.push(value.icu);
  });
  let currentHospitalisations = dailyHospitalisations.data[dailyHospitalisations.data.length - 1];
  let currentICU = dailyICU.data[dailyICU.data.length - 1];
  logger.debug(`${labels[labels.length - 1]}: ${currentHospitalisations} currently in hospital`);
  logger.debug(`${labels[labels.length - 1]}: ${currentICU} currently in ICU`);

  // Array of objects where the number of hospitalisations is less than today's hospitalisations
  let lessHospitalisations = graphData.filter(item => item.hospitalisations < currentHospitalisations);
  let moreHospitalisations = graphData.filter(item => item.hospitalisations > currentHospitalisations);
  logger.debug(`Found ${lessHospitalisations.length} days with fewer people in hospital`);
  logger.debug(`Found ${moreHospitalisations.length} days with more people in hospital`);

  let lessICU = graphData.filter(item => item.icu <= currentICU);
  let moreICU = graphData.filter(item => item.icu > currentICU);
  logger.debug(`Found ${lessICU.length} days with fewer people in ICU`);
  logger.debug(`Found ${moreICU.length} days with more people in ICU`);
  // An object for the last day with less hospitalisations than today
  let lastDayLessHospitalisations = {
      date: new Date(),     // The date
      hospitalisations: 0,  // The number of hospitalisations
      dateDifference: 0     // The number of days since a lower number of people in hospital
  };
  let lastDayMoreHospitalisations = {
      date: new Date(),     // The date
      hospitalisations: 0,  // The number of hospitalisations
      dateDifference: 0     // The number of days since a higher number of people in hospital
  };
  let lastDayLessICU = {
      date: new Date(),     // The date
      icu: 0,  // The number of hospitalisations
      dateDifference: 0     // The number of days since a lower number of people in hospital
  };
  let lastDayMoreICU = {
      date: new Date(),     // The date
      icu: 0,  // The number of hospitalisations
      dateDifference: 0     // The number of days since a higher number of people in hospital
  };
  if (lessHospitalisations.length > 0) {
      // The last entry in the array, i.e. the last date with less cases than today
      let lastDayLowerHospitalisations = lessHospitalisations[lessHospitalisations.length - 1];
      // The number of days since the above
      lastDayLessHospitalisations.date = lastDayLowerHospitalisations.date;
      lastDayLessHospitalisations.hospitalisations = lastDayLowerHospitalisations.hospitalisations;
      lastDayLessHospitalisations.dateDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastDayLowerHospitalisations.date), 'days');
      logger.debug(`${lastDayLessHospitalisations.dateDifference} days since a lower number of people in hospital - ${lastDayLessHospitalisations.date}(${lastDayLessHospitalisations.hospitalisations})`);
  }
  if (moreHospitalisations.length > 0) {
      // The last entry in the array, i.e. the last date with more cases than today
      let lastDayMoreHospitalisations = moreHospitalisations[moreHospitalisations.length - 1];
      // The number of days since the above
      lastDayMoreHospitalisations.date = lastDayMoreHospitalisations.date;
      lastDayMoreHospitalisations.hospitalisations = lastDayMoreHospitalisations.hospitalisations;
      lastDayMoreHospitalisations.dateDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastDayMoreHospitalisations.date), 'days');
      logger.debug(`${lastDayMoreHospitalisations.dateDifference} days since a higher number of people in hospital - ${lastDayMoreHospitalisations.date}(${lastDayMoreHospitalisations.hospitalisations})`);
  }

  if (lessICU.length > 0) {
      // The last entry in the array, i.e. the last date with less cases than today
      let lastDayLowerICU = lessICU[lessICU.length - 1];
      // The number of days since the above
      lastDayLessICU.date = lastDayLowerICU.date;
      lastDayLessICU.icu = lastDayLowerICU.icu;
      lastDayLessICU.dateDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastDayLessICU.date), 'days');
      logger.debug(`${lastDayLessICU.dateDifference} days since a lower number of people in ICU - ${lastDayLessICU.date}(${lastDayLessICU.icu})`);
  }
  if (moreICU.length > 0) {
      // The last entry in the array, i.e. the last date with more cases than today
      let lastDayHigherICU = moreICU[moreICU.length - 1];
      // The number of days since the above
      lastDayMoreICU.date = lastDayHigherICU.date;
      lastDayMoreICU.icu = lastDayHigherICU.icu;
      lastDayMoreICU.dateDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastDayMoreICU.date), 'days');
      logger.debug(`${lastDayMoreICU.dateDifference} days since a higher number of people in ICU - ${lastDayMoreICU.date}(${lastDayMoreICU.icu})`);
  }

  let tweet = header +
              `\n🏥 Hospitalisations` +
              `\nCurrent: ${currentHospitalisations}` +
              (lastDayLessHospitalisations.dateDifference > 14 ? `(Lowest since ${moment(lastDayLessHospitalisations.date).format('dddd, Do MMMM yyyy')} - ${lastDayLessHospitalisations.hospitalisations})`: '') +
              (lastDayMoreHospitalisations.dateDifference > 14 ? `(Highest since ${moment(lastDayMoreHospitalisations.date).format('dddd, Do MMMM yyyy')} - ${lastDayMoreHospitalisations.hospitalisations})`: '') +
              `\nICU: ${currentICU}` +
              (lastDayLessICU.dateDifference > 14 ? `(Lowest since ${moment(lastDayLessICU.date).format('dddd, Do MMMM yyyy')} - ${lastDayLessICU.icu})`: '') +
              (lastDayMoreICU.dateDifference > 14 ? `(Highest since ${moment(lastDayMoreICU.date).format('dddd, Do MMMM yyyy')} - ${lastDayMoreICU.icu})`: '') +
              '\n' + 
              `\n ${hashtag}`;
//               + '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=deaths&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, dailyHospitalisations, dailyICU, "Hospitalisations");
  let b64Content = chartHelper.writeChart('hospitalisations/daily.png', configuration);
  twitterHelper.tweetChart(b64Content, tweet, processHospitalisationsByDay);
}

function processHospitalisationsByDay(inReplyToId) {
  logger.info("Processing hospitalisations by day");
  let labels = new Array();
  dailyHospitalisations.data = new Array();
  dailyICU.data = new Array();

  let day = graphData[graphData.length - 1].date.getDay();
  graphData.filter(item => ((item.date > oneMonthAgo) && (item.date.getDay() === day)))
           .forEach(function(value, index) { 
      labels.push(value.date.toDateString());
      dailyHospitalisations.data.push(value.hospitalisations);
      dailyICU.data.push(value.icu);
  });
  let currentHospitalisations =  dailyHospitalisations.data[ dailyHospitalisations.data.length - 1];
  let lastWeeksHospitalisations = dailyHospitalisations.data[dailyHospitalisations.data.length - 2];
  let previousWeeksHospitalisations = dailyHospitalisations.data[dailyHospitalisations.data.length - 3];

  let currentICU =  dailyICU.data[ dailyICU.data.length - 1];
  let lastWeeksICU = dailyICU.data[dailyICU.data.length - 2];
  let previousWeeksICU = dailyICU.data[dailyICU.data.length - 3];

  let lastWeeksHospitalisationChange = currentHospitalisations - lastWeeksHospitalisations;
  let previousWeeksHospitalisationChange = currentHospitalisations - previousWeeksHospitalisations;

  let lastWeeksHospitalisationPercentageChange = ((lastWeeksHospitalisationChange * 100) / lastWeeksHospitalisations).toFixed(2);
  let previousWeeksHospitalisationPercentageChange = ((previousWeeksHospitalisationChange * 100) / previousWeeksHospitalisations).toFixed(2);

  let lastWeeksICUChange = currentICU - lastWeeksICU;
  let previousWeeksICUChange = currentICU - previousWeeksICU;

  let lastWeeksICUPercentageChange = ((lastWeeksICUChange * 100) / lastWeeksICU).toFixed(2);
  let previousWeeksICUPercentageChange = ((previousWeeksICUChange * 100) / previousWeeksICU).toFixed(2);

  tweet = `🏥 Hospitalisations: By day` +
          '\nDate: Hospitalised(Diff | % diff)' +
          '\n' + moment(graphData[graphData.length - 1].date).format('ddd, Do MMMM') + ': ' + currentHospitalisations + 
          '\n' + moment(graphData[graphData.length - 8].date).format('ddd, Do MMMM') + ': ' + lastWeeksHospitalisations + '(' + lastWeeksHospitalisationChange + ' | ' + lastWeeksHospitalisationPercentageChange + '%)' +
          '\n' + moment(graphData[graphData.length - 15].date).format('ddd, Do MMMM') + ': ' + previousWeeksHospitalisations + '(' + previousWeeksHospitalisationChange + ' | ' + previousWeeksHospitalisationPercentageChange + '%)' +
          '\n' +
          '\nDate: ICU(Diff | % diff)' +
          '\n' + moment(graphData[graphData.length - 1].date).format('ddd, Do MMMM') + ': ' + currentICU + 
          '\n' + moment(graphData[graphData.length - 8].date).format('ddd, Do MMMM') + ': ' + lastWeeksICU + '(' + lastWeeksICUChange + ' | ' + lastWeeksICUPercentageChange + '%)' +
          '\n' + moment(graphData[graphData.length - 15].date).format('ddd, Do MMMM') + ': ' + previousWeeksICU + '(' + previousWeeksICUChange + ' | ' + previousWeeksICUPercentageChange + '%)' +
          '\n\n' + hashtag;
           // + '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=byWeekday&day=' + day + '&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, dailyHospitalisations, dailyICU, "Hospitalisations");
  let b64Content = chartHelper.writeChart('hospitalisations/byDay.png', configuration);
  twitterHelper.tweetChart(b64Content, tweet, function() { }, inReplyToId);
}

function generateConfiguration(labels, dailyHospitalisations, dailyICU, title) {
  return {
    type: "line",
    data: {
      labels: labels,
      datasets: [dailyHospitalisations, dailyICU]
    },
    options: {
      title: {
        text: title
      },
      scales: {
        yAxes: [{
          id: "dailyHospitalisationsAxis",
          ticks: {
              beginAtZero: true
          },
          gridLines: {
              display: false
          }
        }]
      }
    }
  };
}

module.processData = processData;
