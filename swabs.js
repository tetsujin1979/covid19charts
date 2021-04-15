const fs = require('fs');
const moment = require('moment');
const log4js = require("log4js");

const chartHelper = require("./chartHelper");
const twitterChart = require("./twitterChart");
const constants = require("./constants");

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('swabs');

const hashtag = constants.hashtag;
const days = constants.days;

const graphData = new Array();

const positiveSwabs = {
  label: "Positive Tests",
  data: [],
  backgroundColor: "rgba(237, 100, 127, .6)",
  borderColor: "rgba(233,0,45, 1)",
  borderWidth: 0,
  yAxisID: "SwabsAxis"
};

const negativeSwabs = {
  label: "Negative Tests",
  data: [],
  backgroundColor: "rgba(63, 63, 191, 0.6)",
  borderColor: "rgba(14, 54, 201, 0.5)",
  borderWidth: 0,
  yAxisID: "SwabsAxis"
};

const percentagePositive = {
  label: "% Positive",
  data: [],
  backgroundColor: "transparent",
  borderColor: "red",
  borderWidth: 4,
  yAxisID: "PercentagePositiveAxis",
  type: "line"
};

logger.info('Processing daily swabs');
fs.readFile('./covid19dashboard/data.json', 'utf8', (err, data) => {
  if (err) {
      logger.error(`Error reading file from disk: ${err}`);
  } else {
    const covidData = JSON.parse(data);
    logger.debug(`Processing ${covidData.length} items`);
    let dataFrom = new Date();
    dataFrom.setMonth(dataFrom.getMonth() - 1);
    covidData.forEach(function(item, index) {
      if (item.hasOwnProperty("dateString") && item.hasOwnProperty("positiveSwabs") && item.hasOwnProperty("dailySwabs")) {
        let date = new Date(item.dateString);
        let percentagePositive = ((item.positiveSwabs * 100) / item.dailySwabs).toFixed(2);
        let swabData = {
          date: date,
          positiveSwabs: item.positiveSwabs,
          negativeSwabs: (item.dailySwabs - item.positiveSwabs),
          percentagePositive: percentagePositive
        }
        if (date > dataFrom) {
          graphData.push(swabData);
        }
      }
    });
    header = '📅 ' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM YYYY');
    processNewSwabs();
  }
});

function processNewSwabs() {
  logger.info("Processing new swab data");
  let labels = new Array();
  positiveSwabs.data = new Array();
  negativeSwabs.data = new Array();
  percentagePositive.data = new Array();
  graphData.forEach(function(value, index) {
    labels.push(value.date.toDateString());
    positiveSwabs.data.push(value.positiveSwabs);
    negativeSwabs.data.push(value.negativeSwabs);
    percentagePositive.data.push(value.percentagePositive);
  });
  let dailyPositiveSwabs = Number(positiveSwabs.data[positiveSwabs.data.length - 1]);
  let dailyNegativeSwabs = Number(negativeSwabs.data[negativeSwabs.data.length - 1]);
  let dailyTotalSwabs = dailyPositiveSwabs + dailyNegativeSwabs;
  let dailyPercentagePositive = Number(percentagePositive.data[percentagePositive.data.length - 1]);

  let tweet = '\n🧪 Swabs: Daily results' +
              '\n' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM YYYY') +
              '\nPositive: ' + dailyPositiveSwabs.toLocaleString('en') + '(' + dailyPercentagePositive + '%)' +
              '\nNegative: ' + dailyNegativeSwabs.toLocaleString('en') + '(' + (100 - dailyPercentagePositive) + '%)' +
              '\nTotal: ' + Number(dailyTotalSwabs).toLocaleString('en') +
              '\n' +
              '\n' + hashtag +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=swabs&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, percentagePositive, positiveSwabs, negativeSwabs);
  let b64Content = chartHelper.writeChart('swabs/dailySwabs.png', configuration, );
  twitterChart.tweetChart(b64Content, tweet, processRollingSevenDayAverage);
}

function processSwabsByDay(lastTweetId) {
  logger.info("Processing swab data by day");
  let lastDay = graphData[graphData.length - 1].date.getDay();
  let labels = new Array();
  positiveSwabs.data = new Array();
  negativeSwabs.data = new Array();
  percentagePositive.data = new Array();
  graphData.forEach(function(value, index) {
    if (value.date.getDay() == lastDay) {
      labels.push(value.date.toDateString());
      positiveSwabs.data.push(value.positiveSwabs);
      negativeSwabs.data.push(value.negativeSwabs);
      percentagePositive.data.push(value.percentagePositive);
    }
  });
  let previousDay = moment(graphData[graphData.length - 8].date).format('ddd, Do MMM');
  let previousPositiveSwabs = Number(positiveSwabs.data[positiveSwabs.data.length - 2]);
  let previousNegativeSwabs = Number(negativeSwabs.data[negativeSwabs.data.length - 2]);
  let previousTotalSwabs = previousPositiveSwabs + previousNegativeSwabs;
  let previousPercentagePositive = Number(percentagePositive.data[percentagePositive.data.length - 2]);

  let dailyPositiveSwabs = Number(positiveSwabs.data[positiveSwabs.data.length - 1]);
  let dailyNegativeSwabs = Number(negativeSwabs.data[negativeSwabs.data.length - 1]);
  let dailyTotalSwabs = dailyPositiveSwabs + dailyNegativeSwabs;
  let dailyPercentagePositive = Number(percentagePositive.data[percentagePositive.data.length - 1]);

  let positiveDifference = dailyPositiveSwabs - previousPositiveSwabs;
  let negativeDifference = dailyNegativeSwabs - previousNegativeSwabs;
  let totalDifference = dailyTotalSwabs - previousTotalSwabs;
  let tweet = '🧪 Swabs: By day' +
            '\n' + moment(graphData[graphData.length - 1].date).format('ddd, Do MMM') +
            '\nPositive: ' + dailyPositiveSwabs.toLocaleString('en') +
            '\nNegative: ' + dailyNegativeSwabs.toLocaleString('en') +
            '\n' +
            '\n' + previousDay +
            '\nResults(%)(Difference | % difference)' +
            '\nPositive: ' + previousPositiveSwabs.toLocaleString('en') + '(' + previousPercentagePositive + '%)(' + positiveDifference + ' | ' + ((positiveDifference * 100) / previousPositiveSwabs).toFixed(2) +'%)' +
            '\nNegative: ' + previousNegativeSwabs.toLocaleString('en') + '(' + (100 - previousPercentagePositive) + '%)(' + negativeDifference + ' | ' + ((negativeDifference * 100) / previousNegativeSwabs).toFixed(2) + '%)' +
            '\nTotal: ' + Number(previousTotalSwabs).toLocaleString('en') + '(' + totalDifference + ' | ' + ((totalDifference * 100) / previousTotalSwabs).toFixed(2) + '%)' +
            '\n' + hashtag + 
            '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=swabs&dateSelection=lastTwoMonths&graphType=byWeekday&day=' + lastDay + '&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, percentagePositive, positiveSwabs, negativeSwabs);
  let b64Content = chartHelper.writeChart('swabs/swabsByDay.png', configuration);
  twitterChart.tweetChart(b64Content, tweet, function() {}, lastTweetId);
}

function processRollingSevenDayAverage(inReplyToId) {
  logger.info("Processing rolling average swab data");
  let labels = new Array();
  positiveSwabs.data = new Array();
  negativeSwabs.data = new Array();
  percentagePositive.data = new Array();
  let initialTestsIndex = 0;
  let todayDay = graphData[graphData.length - 1].date.getDay();
  for (let counter = 6; counter < 13; counter++) {
    if (graphData[counter].date.getDay() === todayDay) {
      initialTestsIndex = counter;
      break;
    }
  }
  for (let counter = initialTestsIndex; counter < graphData.length; counter ++) {
    let today = graphData[counter];
    let yesterday = graphData[counter - 1];
    let twoDaysAgo = graphData[counter - 2];
    let threeDaysAgo = graphData[counter - 3];
    let fourDaysAgo = graphData[counter - 4];
    let fiveDaysAgo = graphData[counter - 5];
    let sixDayAgo = graphData[counter - 6];
    let totalPositiveSwabs = today.positiveSwabs + yesterday.positiveSwabs + twoDaysAgo.positiveSwabs + threeDaysAgo.positiveSwabs + fourDaysAgo.positiveSwabs + fiveDaysAgo.positiveSwabs + sixDayAgo.positiveSwabs;
    let totalNegativeSwabs = today.negativeSwabs + yesterday.negativeSwabs + twoDaysAgo.negativeSwabs + threeDaysAgo.negativeSwabs + fourDaysAgo.negativeSwabs + fiveDaysAgo.negativeSwabs + sixDayAgo.negativeSwabs;
    let dailySwabs = totalPositiveSwabs + totalNegativeSwabs;
    labels.push('Seven days to '+ today.date.toDateString());
    positiveSwabs.data.push((totalPositiveSwabs / 7).toFixed(2));
    negativeSwabs.data.push((totalNegativeSwabs / 7).toFixed(2));
    percentagePositive.data.push(((totalPositiveSwabs * 100) / dailySwabs).toFixed(2));
  }
  let dailyPositiveSwabs = Number(positiveSwabs.data[positiveSwabs.data.length - 1]);
  let dailyNegativeSwabs = Number(negativeSwabs.data[negativeSwabs.data.length - 1]);
  let dailyTotalSwabs = dailyPositiveSwabs + dailyNegativeSwabs;
  let dailyPercentagePositive = Number(percentagePositive.data[percentagePositive.data.length - 1]);
  let tweet = header + 
              '\n🧪 Swabs: Seven day average' +
              '\n' + moment(graphData[graphData.length - 1].date).format('ddd, Do MMM') +
              '\nPositive tests: ' + dailyPositiveSwabs.toLocaleString('en') + '(' + dailyPercentagePositive + '%)' +
              '\nNegative tests: ' + dailyNegativeSwabs.toLocaleString('en') + '(' + (100 - dailyPercentagePositive) + '%)' +
              '\nTotal tests: ' + Number(dailyTotalSwabs).toLocaleString('en') +
              '\n' +
              '\n' + hashtag +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=swabs&dateSelection=lastTwoMonths&graphType=rollingSevenDayAverage&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, percentagePositive, positiveSwabs, negativeSwabs);
  let b64Content = chartHelper.writeChart('swabs/rollingSevenDayAverage.png', configuration);
  twitterChart.tweetChart(b64Content, tweet, processSwabsByDay, inReplyToId);
}

/*
function processSevenDayAverage(inReplyToId) {
  let labels = new Array();
  positiveSwabs.data = new Array();
  negativeSwabs.data = new Array();
  percentagePositive.data = new Array();
  let initialTestsIndex = 0;
  let todayDay = graphData[graphData.length - 1].date.getDay();
  for (let counter = 6; counter < 13; counter++) {
    if (graphData[counter].date.getDay() === todayDay) {
      initialTestsIndex = counter;
      break;
    }
  }
  for (let counter = initialTestsIndex; counter < graphData.length; counter += 7) {
    let today = graphData[counter];
    let yesterday = graphData[counter - 1];
    let twoDaysAgo = graphData[counter - 2];
    let threeDaysAgo = graphData[counter - 3];
    let fourDaysAgo = graphData[counter - 4];
    let fiveDaysAgo = graphData[counter - 5];
    let sixDayAgo = graphData[counter - 6];
    let totalPositiveSwabs = today.positiveSwabs + yesterday.positiveSwabs + twoDaysAgo.positiveSwabs + threeDaysAgo.positiveSwabs + fourDaysAgo.positiveSwabs + fiveDaysAgo.positiveSwabs + sixDayAgo.positiveSwabs;
    let totalNegativeSwabs = today.negativeSwabs + yesterday.negativeSwabs + twoDaysAgo.negativeSwabs + threeDaysAgo.negativeSwabs + fourDaysAgo.negativeSwabs + fiveDaysAgo.negativeSwabs + sixDayAgo.negativeSwabs;
    let dailySwabs = totalPositiveSwabs + totalNegativeSwabs;
    labels.push('Seven days to '+ today.date.toDateString());
    positiveSwabs.data.push((totalPositiveSwabs / 7).toFixed(2));
    negativeSwabs.data.push((totalNegativeSwabs / 7).toFixed(2));
    percentagePositive.data.push(((totalPositiveSwabs * 100) / dailySwabs).toFixed(2));
  }
  let previousDay = moment(graphData[graphData.length - 8].date).format('dddd, Do MMMM');
  let previousPositiveSwabs = Number(positiveSwabs.data[positiveSwabs.data.length - 2]);
  let previousNegativeSwabs = Number(negativeSwabs.data[negativeSwabs.data.length - 2]);
  let previousTotalSwabs = previousPositiveSwabs + previousNegativeSwabs;
  let previousPercentagePositive = Number(percentagePositive.data[percentagePositive.data.length - 2]);

  let dailyPositiveSwabs = Number(positiveSwabs.data[positiveSwabs.data.length - 1]);
  let dailyNegativeSwabs = Number(negativeSwabs.data[negativeSwabs.data.length - 1]);
  let dailyTotalSwabs = dailyPositiveSwabs + dailyNegativeSwabs;
  let dailyPercentagePositive = Number(percentagePositive.data[percentagePositive.data.length - 1]);

  let positiveDifference = dailyPositiveSwabs - previousPositiveSwabs;
  let negativeDifference = dailyNegativeSwabs - previousNegativeSwabs;
  let totalDifference = dailyTotalSwabs - previousTotalSwabs;

  let tweet = '🧪 Seven day average change' +
            '\n' + previousDay + '\'s seven day averages' + 
            '\nPositive: ' + previousPositiveSwabs.toLocaleString('en') + '(' + previousPercentagePositive + '%)' +
            '\nNegative: ' + previousNegativeSwabs.toLocaleString('en') + '(' + (100 - previousPercentagePositive) + '%)' +
            '\nTotal: ' + Number(previousTotalSwabs).toLocaleString('en') + 
            '\n' +
            '\nToday\'s tests(change)' +
            '\nPositive: ' + dailyPositiveSwabs.toLocaleString('en') + '(' + (positiveDifference > 0 ? '+' : '') + positiveDifference.toFixed(2) + ')' +
            '\nNegative: ' + dailyNegativeSwabs.toLocaleString('en') + '(' + (negativeDifference > 0 ? '+' : '') + negativeDifference.toFixed(2) + ')' +
            '\nTotal: ' + Number(dailyTotalSwabs).toLocaleString('en') + '(' + (totalDifference > 0 ? '+' : '') + totalDifference.toFixed(2) + ')' +
            '\n' + hashtag + 
            '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=swabs&dateSelection=lastTwoMonths&graphType=rollingSevenDayAverage&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, percentagePositive, positiveSwabs, negativeSwabs);
  writeChartToFile.processChart('swabs/sevenDayAverage.png', configuration, tweet, function() {}, inReplyToId);
}
*/
/* 
  thisObject.weeklyTotal = function() {
    reset();
    for (let counter = 6; counter < thisObject.graphData.length; counter++) {
      let today = thisObject.graphData[counter];
      if (today.date.getDay() === 6) {
        let yesterday = thisObject.graphData[counter - 1];
        let twoDaysAgo = thisObject.graphData[counter - 2];
        let threeDaysAgo = thisObject.graphData[counter - 3];
        let fourDaysAgo = thisObject.graphData[counter - 4];
        let fiveDaysAgo = thisObject.graphData[counter - 5];
        let sixDayAgo = thisObject.graphData[counter - 6];
        let totalPositiveSwabs = today.positiveSwabs + yesterday.positiveSwabs + twoDaysAgo.positiveSwabs + threeDaysAgo.positiveSwabs + fourDaysAgo.positiveSwabs + fiveDaysAgo.positiveSwabs + sixDayAgo.positiveSwabs;
        let totalNegativeSwabs = today.negativeSwabs + yesterday.negativeSwabs + twoDaysAgo.negativeSwabs + threeDaysAgo.negativeSwabs + fourDaysAgo.negativeSwabs + fiveDaysAgo.negativeSwabs + sixDayAgo.negativeSwabs;
        let totalSwabs = totalPositiveSwabs + totalNegativeSwabs;
        
        thisObject.chartConfig.data.labels.push('Week ending ' + today.date.toDateString());
        thisObject.positiveSwabs.data.push(totalPositiveSwabs);
        thisObject.negativeSwabs.data.push(totalNegativeSwabs);
        thisObject.percentagePositive.data.push(((totalPositiveSwabs * 100) / totalSwabs).toFixed(2));
      }
    }
  };
*/


function generateConfiguration(labels, percentagePositive, positiveSwabs, negativeSwabs) {
  return {
    type: "bar",
    data: {
      labels: labels,
      datasets: [percentagePositive, positiveSwabs, negativeSwabs]
    },
    options: {
      scales: {
          xAxes: [{
              stacked: true
          }],
          yAxes: [{
              id: "SwabsAxis",
              stacked: true,
              position: "left",
              ticks: {
                  beginAtZero: true
              },
              scaleLabel: {
                  display: true,
                  labelString: "Total Tests"
              }
          }, {
              id: "PercentagePositiveAxis",
              position: "right",
              ticks: {
                  beginAtZero: true
              },
              gridLines: {
                  display: false
              },
              scaleLabel: {
                  display: true,
                  labelString: "% Positive"
              }
          }]
        }
      }
    };
}
