const moment = require('moment');

const chartHelper = require("./chartHelper");
const constants = require("./constants");
const log4jsHelper = require('./log4jsHelper');
const twitterHelper = require("./twitterHelper");

const logger = log4jsHelper.getLogger('swabs');

const days = constants.days();
const oneMonthAgo = constants.oneMonthAgo();

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

const records = new Array();

function processData(covidData) {
  logger.info('Processing daily swabs');
  covidData.filter((item) => (item.hasOwnProperty("dateString") && item.hasOwnProperty("positiveSwabs") && item.hasOwnProperty("dailySwabs")))
           .forEach(function(item, index) {
    let date = new Date(item.dateString);
    let percentagePositive = ((item.positiveSwabs * 100) / item.dailySwabs).toFixed(2);
    let swabData = {
      date: date,
      positiveSwabs: item.positiveSwabs,
      negativeSwabs: (item.dailySwabs - item.positiveSwabs),
      percentagePositive: Number(percentagePositive)
    }
    if (index > 7) {
      let today = covidData[index];
      let yesterday = covidData[index - 1];
      let twoDaysAgo = covidData[index - 2];
      let threeDaysAgo = covidData[index - 3];
      let fourDaysAgo = covidData[index - 4];
      let fiveDaysAgo = covidData[index - 5];
      let sixDayAgo = covidData[index - 6];
      let totalPositiveSwabs = today.positiveSwabs + yesterday.positiveSwabs + twoDaysAgo.positiveSwabs + threeDaysAgo.positiveSwabs + fourDaysAgo.positiveSwabs + fiveDaysAgo.positiveSwabs + sixDayAgo.positiveSwabs;
      let totalNegativeSwabs = (today.dailySwabs - today.positiveSwabs) +
                               (yesterday.dailySwabs - yesterday.positiveSwabs) +
                               (twoDaysAgo.dailySwabs - twoDaysAgo.positiveSwabs) +
                               (threeDaysAgo.dailySwabs - threeDaysAgo.positiveSwabs) +
                               (fourDaysAgo.dailySwabs - fourDaysAgo.positiveSwabs) +
                               (fiveDaysAgo.dailySwabs - fiveDaysAgo.positiveSwabs) +
                               (sixDayAgo.dailySwabs - sixDayAgo.positiveSwabs);

      let sevenDayTotalSwabs = totalPositiveSwabs + totalNegativeSwabs;
      swabData.sevenDayAveragePositiveSwabs = (totalPositiveSwabs / 7).toFixed(2);
      swabData.sevenDayAverageNegativeSwabs = (totalNegativeSwabs / 7).toFixed(2);
      swabData.sevenDayAveragePercentagePositive = ((totalPositiveSwabs * 100) / sevenDayTotalSwabs).toFixed(2);
      if (date.getDay() === 0) {
        swabData.weeklyPositiveSwabs = totalPositiveSwabs;
        swabData.weeklyNegativeSwabs = totalNegativeSwabs;
        swabData.weeklyPercentagePositive = ((totalPositiveSwabs * 100) / (totalPositiveSwabs + totalNegativeSwabs));
      }
    }
    graphData.push(swabData);
  });
  header = '📅 ' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM YYYY');
  processNewSwabs();
}

function processNewSwabs() {
  logger.info("Processing new swab data");
  let labels = new Array();
  positiveSwabs.data = new Array();
  negativeSwabs.data = new Array();
  percentagePositive.data = new Array();
  graphData.filter(item => item.date > oneMonthAgo)
           .forEach(function(value, index) {
    labels.push(value.date.toDateString());
    positiveSwabs.data.push(value.positiveSwabs);
    negativeSwabs.data.push(value.negativeSwabs);
    percentagePositive.data.push(value.percentagePositive);
  });
  let dailyPositiveSwabs = Number(positiveSwabs.data[positiveSwabs.data.length - 1]);
  let dailyNegativeSwabs = Number(negativeSwabs.data[negativeSwabs.data.length - 1]);
  let dailyTotalSwabs = dailyPositiveSwabs + dailyNegativeSwabs;
  let dailyPercentagePositive = percentagePositive.data[percentagePositive.data.length - 1];
  let daysWithLowerDailyPercentage = graphData.slice().filter(item => item.percentagePositive < dailyPercentagePositive);
  logger.debug(`Found ${daysWithLowerDailyPercentage.length} days with lower daily positivity percentage ${dailyPercentagePositive}%`);
  if (daysWithLowerDailyPercentage.length > 0) {
    let lastDayLowerPercentage = daysWithLowerDailyPercentage[daysWithLowerDailyPercentage.length - 1];
    let dateDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastDayLowerPercentage.date), 'days');
    logger.debug(`Lowest daily percentage in ${dateDifference} days - ${lastDayLowerPercentage.percentagePositive}%`);
    if (dateDifference > 21) {
      records.push(`🔽 Lowest daily positivity percentage since ${moment(lastDayLowerPercentage.date).format('dddd, Do MMMM YYYY')}(${lastDayLowerPercentage.percentagePositive}%)`);
    }
  }

  const status = `🧪 Swabs: Daily results\n${moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM YYYY')}` +
                 `\nPositive: ${dailyPositiveSwabs.toLocaleString('en')}(${dailyPercentagePositive}%)` +
                 `\nNegative: ${dailyNegativeSwabs.toLocaleString('en')}(${(100 - dailyPercentagePositive)}%)` +
                 `\nTotal: ${Number(dailyTotalSwabs).toLocaleString('en')}`;

  const url = 'https://tetsujin1979.github.io/covid19dashboard?dataSelection=swabs&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=false';
  const tweet = constants.createTweet(status, url);
  let configuration = generateConfiguration(labels, percentagePositive, positiveSwabs, negativeSwabs, "Daily Swab Results");
  let b64Content = chartHelper.writeChart('swabs/dailySwabs.png', configuration, );
  twitterHelper.tweetChart(b64Content, tweet, processRollingSevenDayAverage);
}

function processSwabsByDay(lastTweetId) {
  logger.info("Processing swab data by day");
  let lastDay = graphData[graphData.length - 1].date.getDay();
  let labels = new Array();
  positiveSwabs.data = new Array();
  negativeSwabs.data = new Array();
  percentagePositive.data = new Array();
  graphData.filter(item => item.date > oneMonthAgo && item.date.getDay() == lastDay)
           .forEach(function(value, index) {
    labels.push(value.date.toDateString());
    positiveSwabs.data.push(value.positiveSwabs);
    negativeSwabs.data.push(value.negativeSwabs);
    percentagePositive.data.push(value.percentagePositive);
  });
  let previousDay = moment(graphData[graphData.length - 8].date).format('ddd, Do MMM');


  let dailyPositiveSwabs = constants.valueAndString(positiveSwabs.data[positiveSwabs.data.length - 1]);
  let dailyNegativeSwabs = constants.valueAndString(negativeSwabs.data[negativeSwabs.data.length - 1]);
  let dailyTotalSwabs = dailyPositiveSwabs.value + dailyNegativeSwabs.value;
  let dailyPercentagePositive = Number(percentagePositive.data[percentagePositive.data.length - 1]);

  let previousPositiveSwabs = constants.valueAndString(positiveSwabs.data[positiveSwabs.data.length - 2]);
  let previousNegativeSwabs = constants.valueAndString(negativeSwabs.data[negativeSwabs.data.length - 2]);
  let previousTotalSwabs = previousPositiveSwabs.value + previousNegativeSwabs.value;
  let previousPercentagePositive = Number(percentagePositive.data[percentagePositive.data.length - 2]);

  let positiveDifference = constants.difference(dailyPositiveSwabs.value, previousPositiveSwabs.value);
  let negativeDifference = constants.difference(dailyNegativeSwabs.value, previousNegativeSwabs.value);
  let totalDifference = constants.difference(dailyTotalSwabs, previousTotalSwabs);

  let daysWithLowerDailyPercentage = graphData.slice().filter(item => item.date.getDay() == lastDay && item.percentagePositive < dailyPercentagePositive);
  if (daysWithLowerDailyPercentage.length > 0) {
    logger.debug(`Found ${daysWithLowerDailyPercentage.length} ${days[lastDay]}s with lower daily positivity percentage`);
    let lastDayLowerPercentage = daysWithLowerDailyPercentage[daysWithLowerDailyPercentage.length - 1];
    let dateDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastDayLowerPercentage.date), 'days');
    logger.debug(`Lowest daily percentage on a a ${days[lastDay]} in ${dateDifference} days - ${lastDayLowerPercentage.percentagePositive}%`);
    if (dateDifference > 21) {
      records.push(`🔽 Lowest daily percentage on a ${days[lastDay]}(${dailyPercentagePositive}%) since ${moment(lastDayLowerPercentage.date).format('dddd, Do MMMM YYYY')}(${lastDayLowerPercentage.percentagePositive})%`);
    }
  }
  const status = `🧪 Swabs: By day\n${moment(graphData[graphData.length - 1].date).format('ddd, Do MMM')}` +
                 `\nPositive: ${dailyPositiveSwabs.string}(${dailyPercentagePositive}%)` +
                 `\nNegative: ${dailyNegativeSwabs.string}{${100 - dailyPercentagePositive}%)` +
                 `\n\n${previousDay}` +
                 '\nResults(%)(Difference | % Diff)' +
                 `\nPositive: ${previousPositiveSwabs.string}(${previousPercentagePositive}%)${positiveDifference.toString}` +
                 `\nNegative: ${previousNegativeSwabs.string}(${(100 - previousPercentagePositive)}%)${negativeDifference.toString}` +
                 `\nTotal: ${Number(previousTotalSwabs).toLocaleString('en')}${totalDifference.toString}`;

  const url = `https://tetsujin1979.github.io/covid19dashboard?dataSelection=swabs&dateSelection=lastTwoMonths&graphType=byWeekday&day=${lastDay}&displayType=graph&trendLine=false`;
  const tweet = constants.createTweet(status, url);
  let configuration = generateConfiguration(labels, percentagePositive, positiveSwabs, negativeSwabs, "Swab Results By Day");
  let b64Content = chartHelper.writeChart('swabs/swabsByDay.png', configuration);
  twitterHelper.tweetChart(b64Content, tweet, processWeeklyTotals, lastTweetId);
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
    let value = graphData[counter];
    if (value.date > oneMonthAgo) {
      labels.push(value.date.toDateString());
      positiveSwabs.data.push(value.sevenDayAveragePositiveSwabs);
      negativeSwabs.data.push(value.sevenDayAverageNegativeSwabs);
      percentagePositive.data.push(value.sevenDayAveragePercentagePositive);
    }
  }
  let dailyPositiveSwabs = Number(positiveSwabs.data[positiveSwabs.data.length - 1]);
  let dailyNegativeSwabs = Number(negativeSwabs.data[negativeSwabs.data.length - 1]);
  let dailyTotalSwabs = dailyPositiveSwabs + dailyNegativeSwabs;
  let dailyPercentagePositive = Number(percentagePositive.data[percentagePositive.data.length - 1]);
  let daysWithLowerSevenDayAveragePercentage = graphData.slice().filter(item => item.sevenDayAveragePercentagePositive < dailyPercentagePositive);
  if (daysWithLowerSevenDayAveragePercentage.length > 0) {
    let lastDayLowerPercentage = daysWithLowerSevenDayAveragePercentage[daysWithLowerSevenDayAveragePercentage.length - 1];
    logger.debug(`Found ${daysWithLowerSevenDayAveragePercentage.length} days with lower seven data average`);
    let dateDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastDayLowerPercentage.date), 'days');
    logger.debug(`Lowest seven day average percentage in ${dateDifference} days - ${lastDayLowerPercentage.sevenDayAveragePercentagePositive}%`);
    if (dateDifference > 21) {
      records.push(`🔽 Lowest seven day average positivity percentage - ${dailyPercentagePositive}% - since ${moment(lastDayLowerPercentage.date).format('dddd, Do MMMM YYYY')}(${lastDayLowerPercentage.sevenDayAveragePercentagePositive}%)`);
    }
  }
  const status = `🧪 Swabs: Seven day average\n${moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM')}` +
                 `\nPositive tests: ${dailyPositiveSwabs.toLocaleString('en')}(${dailyPercentagePositive}%)` +
                 `\nNegative tests: ${dailyNegativeSwabs.toLocaleString('en')}(${(100 - dailyPercentagePositive)}%)` +
                 `\nTotal tests: ${Number(dailyTotalSwabs).toLocaleString('en')}`;
              
  const url = 'https://tetsujin1979.github.io/covid19dashboard?dataSelection=swabs&dateSelection=lastTwoMonths&graphType=rollingSevenDayAverage&displayType=graph&trendLine=false';
  const tweet = constants.createTweet(status, url);
  let configuration = generateConfiguration(labels, percentagePositive, positiveSwabs, negativeSwabs, "Seven Day Average Swab Results");
  let b64Content = chartHelper.writeChart('swabs/rollingSevenDayAverage.png', configuration);
  twitterHelper.tweetChart(b64Content, tweet, processSwabsByDay, inReplyToId);
}

function processWeeklyTotals(inReplyToId) {
  if (graphData[graphData.length - 1].date.getDay() === 0) {
    logger.info("Processing weekly swab totals");
    let labels = new Array();
    positiveSwabs.data = new Array();
    negativeSwabs.data = new Array();
    percentagePositive.data = new Array();
    let weeklyData = graphData.filter(item => item.date > oneMonthAgo && item.date.getDay() === 0);
    weeklyData.forEach(function (item, index) { 
      labels.push(`Week ending ` + item.date.toDateString());
      positiveSwabs.data.push(item.weeklyPositiveSwabs);
      negativeSwabs.data.push(item.weeklyNegativeSwabs);
      percentagePositive.data.push(item.weeklyPercentagePositive);
    });
    let weeklyPositiveSwabs = Number(positiveSwabs.data[positiveSwabs.data.length - 1]);
    let weeklyNegativeSwabs = Number(negativeSwabs.data[negativeSwabs.data.length - 1]);
    let weeklyTotalSwabs = weeklyPositiveSwabs + weeklyNegativeSwabs;
    let weeklyPercentagePositive = Number(percentagePositive.data[percentagePositive.data.length - 1]);

    let previousWeeklyPositiveSwabs = Number(positiveSwabs.data[positiveSwabs.data.length - 2]);
    let previousWeeklyNegativeSwabs = Number(negativeSwabs.data[negativeSwabs.data.length - 2]);
    let previousWeeklyTotalSwabs = previousWeeklyPositiveSwabs + previousWeeklyNegativeSwabs;
    let previousWeeklyPercentagePositive = Number(percentagePositive.data[percentagePositive.data.length - 2]);

    let weeksWithLowerSevenDayAveragePercentage = graphData.slice().filter(item => item.date.getDay() === 0 && item.weeklyPercentagePositive < weeklyPercentagePositive);
    if (weeksWithLowerSevenDayAveragePercentage.length > 0) {
      let lastWeekLowerPercentage = weeksWithLowerSevenDayAveragePercentage[weeksWithLowerSevenDayAveragePercentage.length - 1];
      logger.debug(`Found ${weeksWithLowerSevenDayAveragePercentage.length} weeks with lower positivity rate`);
      let weekDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastWeekLowerPercentage.date), 'weeks');
      logger.debug(`Lowest seven day average percentage in ${weekDifference} weeks - ${lastDayLowerPercentage.weeklyPercentagePositive}%`);
      if (weekDifference > 3) {
        records.push(`🔽 Lowest weekly positivity percentage - ${weeklyPercentagePositive}% - since ${moment(lastWeekLowerPercentage.date).format('dddd, Do MMMM YYYY')}(${lastWeekLowerPercentage.weeklyPercentagePositive}%)`);
      }
    }

    const status = `🧪 Swabs: Weekly total\n${moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM')}` +
                   `\nPositive: ${weeklyPositiveSwabs.toLocaleString('en')}(${weeklyPercentagePositive.toFixed(2)}%)` +
                   `\nNegative: ${weeklyNegativeSwabs.toLocaleString('en')}(${(100 - weeklyPercentagePositive).toFixed(2)}%)` +
                   `\nTotal: ${Number(weeklyTotalSwabs).toLocaleString('en')}` +
                   '\n' +
                   `\n${moment(graphData[graphData.length - 8].date).format('dddd, Do MMMM')}` +
                   `\nPositive: ${previousWeeklyPositiveSwabs.toLocaleString('en')}(${previousWeeklyPercentagePositive.toFixed(2)}%)` +
                   `\nNegative: ${previousWeeklyNegativeSwabs.toLocaleString('en')}(${(100 - previousWeeklyPercentagePositive).toFixed(2)}%)` +
                   `\nTotal: ${Number(previousWeeklyTotalSwabs).toLocaleString('en')}`;
                
    const url = '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=swabs&dateSelection=lastTwoMonths&graphType=rollingSevenDayAverage&displayType=graph&trendLine=false';
    const tweet = constants.createTweet(status, url);
    let configuration = generateConfiguration(labels, percentagePositive, positiveSwabs, negativeSwabs, "Seven Day Average Swab Results");
    let b64Content = chartHelper.writeChart('swabs/weeklyTotals.png', configuration);
    twitterHelper.tweetChart(b64Content, tweet, tweetRecords, inReplyToId);
  } else {
    tweetRecords(inReplyToId);
  }
}

function tweetRecords(inReplyToId) {
  twitterHelper.tweetRecords(records, inReplyToId);
}

function generateConfiguration(labels, percentagePositive, positiveSwabs, negativeSwabs, title) {
  return {
    type: "bar",
    data: {
      labels: labels,
      datasets: [percentagePositive, positiveSwabs, negativeSwabs]
    },
    options: {
      title: {
        text: title
      },
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

exports.processData = processData;