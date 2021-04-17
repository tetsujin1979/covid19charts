const fs = require('fs');
const moment = require('moment');
const log4js = require("log4js");

const chartHelper = require("./chartHelper");
const twitterChart = require("./twitterChart");
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

logger.info('Processing daily deaths');
fs.readFile('./covid19dashboard/data.json', 'utf8', (err, data) => {
    if (err) {
        logger.error(`Error reading file from disk: ${err}`);
    } else {
        // parse JSON string to JSON object
        let dataFrom = new Date();
        dataFrom.setMonth(dataFrom.getMonth() - 1);
        const covidData = JSON.parse(data);
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
                if (date > dataFrom) {
                    graphData.push(deathData);
                }
            }
        });
        header = '📅 ' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM YYYY');
        processNewDeaths();
    }
});

function processNewDeaths() {
  logger.info("Processing new deaths");
  let labels = new Array();
  dailyDeaths.data = new Array();
  totalDeaths.data = new Array();

  graphData.forEach(function(value, index) {
    labels.push(value.date.toDateString());
    dailyDeaths.data.push(value.deaths);
    totalDeaths.data.push(value.totalDeaths);
  });

  let tweet = header +
              '\nDeaths announced: ' + dailyDeaths.data[dailyDeaths.data.length - 1] +
//              '\nTotal deaths: ' + Number(totalDeaths.data[totalDeaths.data.length - 2]).toLocaleString('en') +
              '\n' + 
              '\n' + hashtag +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=deaths&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, totalDeaths, dailyDeaths);
  let b64Content = chartHelper.writeChart('deaths/daily.png', configuration);
  twitterChart.tweetChart(b64Content, tweet, function() {});
}

/*
function processDeathsByDay(inReplyToId)
  let labels = new Array();
  dailyDeaths.data = new Array();
  totalDeaths.data = new Array();

  let day = graphData[graphData.length - 1].date.getDay();
  graphData.forEach(function(value, index) { 
    if (value.date.getDay() == day) {
      labels.push(value.date.toDateString());
      dailyDeaths.data.push(value.deaths);
      totalDeaths.data.push(value.totalDeaths);
    }
  });
  newCases = dailyCases.data[dailyCases.data.length - 1];
  previousDaysCases = dailyCases.data[dailyCases.data.length - 2];
  change = newCases - previousDaysCases;
  percentageChange = ((change * 100) / previousDaysCases).toFixed(2)
  tweet = header +
          '\n🦠 Daily cases by day' + 
          '\nToday\'s new cases: ' + newCases + 
          '\nLast ' + days[day] + '\'s cases: ' + previousDaysCases + 
          '\nChange: ' + change + 
          '\nPercentage change: ' + percentageChange + '%' +
          '\n' + hashtag + 
          '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=byWeekday&day=' + day + '&displayType=graph&trendLine=false';

  console.log("Writing cases by day");
  writeChartToFile('cases/byDay.png', labels, totalCases, dailyCases, tweet, processRollingSevenDayAverage, inReplyToId);
  
  thisObject.byDay = function(day) {
    reset();
    thisObject.graphData.forEach(function(value, index) { 
      if (value.date.getDay() == day) {
      }
    });
  };
  
  thisObject.dayAverage = function(increment, prefix) {
    reset();
    let initialTestsIndex = 0;
    let todayDay = new Date().getDay();
    for (let counter = 6; counter < 13; counter++) {
      if (thisObject.graphData[counter].date.getDay() === todayDay) {
        initialTestsIndex = counter;
        break;
      }
    }
    for (let counter = initialTestsIndex; counter < thisObject.graphData.length; counter += increment) {
      let today = thisObject.graphData[counter];
      let yesterday = thisObject.graphData[counter - 1];
      let twoDaysAgo = thisObject.graphData[counter - 2];
      let threeDaysAgo = thisObject.graphData[counter - 3];
      let fourDaysAgo = thisObject.graphData[counter - 4];
      let fiveDaysAgo = thisObject.graphData[counter - 5];
      let sixDayAgo = thisObject.graphData[counter - 6];
      let totalDeaths = today.deaths + yesterday.deaths + twoDaysAgo.deaths + threeDaysAgo.deaths + fourDaysAgo.deaths + fiveDaysAgo.deaths + sixDayAgo.deaths;
      
      thisObject.chartConfig.data.labels.push(prefix + today.date.toDateString());
      thisObject.dailyDeaths.data.push((totalDeaths / 7).toFixed(2));
      thisObject.totalDeaths.data.push(today.totalDeaths);
    }
  };

  // thisObject.weeklyTotal = function() {
  //   reset();
  //   for (let counter = 6; counter < thisObject.graphData.length; counter++) {
  //     let today = thisObject.graphData[counter];
  //     if (today.date.getDay() === 6) {
  //       let today = thisObject.graphData[counter];
  //       let yesterday = thisObject.graphData[counter - 1];
  //       let twoDaysAgo = thisObject.graphData[counter - 2];
  //       let threeDaysAgo = thisObject.graphData[counter - 3];
  //       let fourDaysAgo = thisObject.graphData[counter - 4];
  //       let fiveDaysAgo = thisObject.graphData[counter - 5];
  //       let sixDayAgo = thisObject.graphData[counter - 6];
  //       let totalDeaths = today.deaths + yesterday.deaths + twoDaysAgo.deaths + threeDaysAgo.deaths + fourDaysAgo.deaths + fiveDaysAgo.deaths + sixDayAgo.deaths;

  //       thisObject.chartConfig.data.labels.push('Week ending ' + today.date.toDateString());
  //       thisObject.dailyDeaths.data.push(totalDeaths);
  //       thisObject.totalDeaths.data.push(today.totalDeaths);
  //     }
  //   }
  // };
*/

function generateConfiguration(labels, totalDeaths, dailyDeaths) {
  return {
    type: "bar",
    data: {
      labels: labels,
      datasets: [totalDeaths, dailyDeaths]
    },
    options: {
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
