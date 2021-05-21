const fs = require('fs');
const moment = require('moment');
const log4js = require("log4js");

const chartHelper = require("./chartHelper");
const twitterHelper = require("./twitterHelper");
const constants = require("./constants");

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('deaths');

const hashtag = constants.hashtag;
const days = constants.days;

const graphData = new Array();

const dailyDeaths = {
  label: "Deaths",
  data: [],
  backgroundColor: "rgba(63, 63, 191, 0.6)",
  borderColor: "rgba(14, 54, 201, 0.5)",
  borderWidth: 0,
  yAxisID: "dailyDeathsAxis"
};

const totalDeaths = {
  label: "Total Deaths",
  data: [],
  backgroundColor: "transparent",
  borderColor: "red",
  borderWidth: 4,
  type: "line",
  yAxisID: "totalDeathsAxis"
};

const oneMonthAgo = constants.oneMonthAgo;

logger.info('Processing daily deaths');
function processData(covidData) {
  let deaths = [];
  let runningTotal = 0;
  covidData.forEach(function(item, index) {
    if (item.hasOwnProperty("dateString") && item.hasOwnProperty("deaths")) {
      runningTotal += item.deaths;
      let date = new Date(item.dateString);
      let deathData = {
        date: date,
        deaths: item.deaths,
        totalDeaths: runningTotal
      }
      if (index > 7) {
        let today = covidData[index];
        let yesterday = covidData[index - 1];
        let twoDaysAgo = covidData[index - 2];
        let threeDaysAgo = covidData[index - 3];
        let fourDaysAgo = covidData[index - 4];
        let fiveDaysAgo = covidData[index - 5];
        let sixDayAgo = covidData[index - 6];
        let weeklyDeaths = today.deaths + yesterday.deaths + twoDaysAgo.deaths + threeDaysAgo.deaths + fourDaysAgo.deaths + fiveDaysAgo.deaths + sixDayAgo.deaths;
        deathData.sevenDayAverage = (weeklyDeaths / 7).toFixed(2);
        if (date.getDay() === 0) {
          deathData.weeklyDeaths = weeklyDeaths;
        }
      }
      graphData.push(deathData);
    }
  });
  header = '📅 ' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM YYYY');
  processNewDeaths();
}

function processNewDeaths() {
  logger.info("Processing new deaths");
  let labels = new Array();
  dailyDeaths.data = new Array();
  totalDeaths.data = new Array();

  graphData.filter(item => item.date > oneMonthAgo)
           .forEach(function(value, index) {
    labels.push(value.date.toDateString());
    dailyDeaths.data.push(value.deaths);
    totalDeaths.data.push(value.totalDeaths);
  });
  let tweet = header +
              '\nDeaths announced: ' + dailyDeaths.data[dailyDeaths.data.length - 1] +
//            '\nTotal deaths: ' + Number(totalDeaths.data[totalDeaths.data.length - 2]).toLocaleString('en') +
              '\n' + 
              '\n' + hashtag +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=deaths&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, totalDeaths, dailyDeaths, "Daily Deaths");
  let b64Content = chartHelper.writeChart('deaths/daily.png', configuration);
  twitterHelper.tweetChart(b64Content, tweet, processWeeklyDeaths);
}

function processWeeklyDeaths(inReplyToId) {
  if (graphData[graphData.length - 1].date.getDay() === 0) {
    logger.info("Processing weekly totals");
    let labels = new Array();
    dailyDeaths.data = new Array();
    totalDeaths.data = new Array();
    let weeklyData = graphData.filter(item => item.date > oneMonthAgo && item.date.getDay() === 0);
    weeklyData.forEach(function(value, index) { 
      labels.push(value.date.toDateString());
      dailyDeaths.data.push(value.weeklyDeaths);
      totalDeaths.data.push(value.totalDeaths);
    });
    let lastDayLessDeaths = {
        date: new Date(),   // The date
        cases: 0,           // The number of cases
        dateDifference: 0   // The number of days since a lower number of cases
    };
    let lastDayMoreDeaths = {
        date: new Date(),   // The date
        cases: 0,           // The number of cases
        dateDifference: 0   // The number of days since a lower number of cases
    };
    let newDeaths = dailyDeaths.data[dailyDeaths.data.length - 1];
    let lessDeaths = graphData.filter(item => item.date.getDay() === 0 && item.weeklyDeaths < newDeaths);
    let higherDeaths = graphData.filter(item => item.date.getDay() === 0 && item.weeklyDeaths > newDeaths);
    logger.debug(`Found ${lessDeaths.length} weeks with less deaths`);
    logger.debug(`Found ${higherDeaths.length} weeks with more deaths`);
    if (lessDeaths.length > 0) {
        // The last entry in the array, i.e. the last date with less cases than today
        let lastDayLowerDeaths = lessDeaths[lessDeaths.length - 1];
        // The number of days since the above
        lastDayLessDeaths.date = lastDayLowerDeaths.date;
        lastDayLessDeaths.weeklyDeaths = lastDayLowerDeaths.weeklyDeaths;
        lastDayLessDeaths.weeksDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastDayLessDeaths.date), 'weeks');
        logger.debug(`${lastDayLessDeaths.weeksDifference} weeks since a lower number of deaths - ${lastDayLessDeaths.date}(${lastDayLessDeaths.weeklyDeaths})`);
    }
    if (higherDeaths.length > 0) {
        // The last entry in the array, i.e. the last date with less cases than today
        let lastDayHigherDeaths = higherDeaths[higherDeaths.length - 1];
        // The number of days since the above
        lastDayMoreDeaths.date = lastDayHigherDeaths.date;
        lastDayMoreDeaths.weeklyDeaths = lastDayHigherDeaths.weeklyDeaths;
        lastDayMoreDeaths.weeksDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastDayMoreDeaths.date), 'weeks');
        logger.debug(`${lastDayMoreDeaths.weeksDifference} weeks since a higher number of deaths - ${lastDayMoreDeaths.date}(${lastDayMoreDeaths.weeklyDeaths})`);
    }
    let previousDaysDeaths = dailyDeaths.data[dailyDeaths.data.length - 2];
    let previousDaysDeathsChange = Number(newDeaths - previousDaysDeaths).toFixed(2);
    let previousDaysDeathsPercentageChange = ((previousDaysDeathsChange * 100) / previousDaysDeaths).toFixed(2)

    let previousWeeksDeaths = dailyDeaths.data[dailyDeaths.data.length - 3];
    let previousWeeksDeathsChange = Number(newDeaths - previousWeeksDeaths).toFixed(2);
    let previousWeeksDeathsPercentageChange = ((previousWeeksDeathsChange * 100) / previousWeeksDeaths).toFixed(2);

    let lastDayMoreDeathsDate = moment(lastDayMoreDeaths.date).format('dddd, Do MMMM YYYY');
    let lastDayLessDeathsDate = moment(lastDayLessDeaths.date).format('dddd, Do MMMM YYYY');

    let tweet = 'Deaths: Weekly totals' +
                '\nDate: Deaths(Difference | % difference)' +
                '\n' + moment(weeklyData[weeklyData.length - 1].date).format('dddd, Do MMMM') + ': ' + newDeaths.toLocaleString('en') + 
                (lastDayMoreDeaths.weeksDifference > 3 ? `(🔼 Highest since week ending ${lastDayMoreDeathsDate}(${lastDayMoreDeaths.weeklyDeaths}))` : '') +
                (lastDayLessDeaths.weeksDifference > 3 ? `(🔽 Lowest since week ending ${lastDayLessDeathsDate}(${lastDayLessDeaths.weeklyDeaths}))` : '') +
                '\n' + moment(weeklyData[weeklyData.length - 2].date).format('dddd, Do MMMM') + ': ' + previousDaysDeaths.toLocaleString('en') + '(' + Number(previousDaysDeathsChange) + ' | ' + previousDaysDeathsPercentageChange + '%' + ')' +
                '\n' + moment(weeklyData[weeklyData.length - 3].date).format('dddd, Do MMMM') + ': ' + previousWeeksDeaths.toLocaleString('en') + '(' + Number(previousWeeksDeathsChange) + ' | ' + previousWeeksDeathsPercentageChange + '%' + ')' +
  //            '\nTotal deaths: ' + Number(totalDeaths.data[totalDeaths.data.length - 2]).toLocaleString('en') +
                '\n' + 
                '\n' + hashtag +
                '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=deaths&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=false';

    let configuration = generateConfiguration(labels, totalDeaths, dailyDeaths, "Daily Deaths");
    let b64Content = chartHelper.writeChart('/tmp/weeklyDeaths.png', configuration);
    twitterHelper.tweetChart(b64Content, tweet, function() {}, inReplyToId);
  }
}

function generateConfiguration(labels, totalDeaths, dailyDeaths, title) {
  return {
    type: "bar",
    data: {
      labels: labels,
      datasets: [totalDeaths, dailyDeaths]
    },
    options: {
      title: {
        text: title
      },
      scales: {
        yAxes: [{
          id: "dailyDeathsAxis",
          ticks: {
              beginAtZero: true
          },
          gridLines: {
              display: false
          },
          scaleLabel: {
              display: true,
              labelString: "Daily Deaths"
          }
        }, {
          id: "totalDeathsAxis",
          position: "right",
          ticks: {
              beginAtZero: true
          },
          gridLines: {
              display: false
          },
          scaleLabel: {
              display: true,
              labelString: "Total Deaths"
          }
        }]
      }
    }
  };
}

exports.processData = processData;
