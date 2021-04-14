const fs = require('fs');
const moment = require('moment'); 
const log4js = require('log4js'); 

const chartHelper = require("./chartHelper");
const twitterChart = require("./twitterChart");
const constants = require("./constants");

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('cases');

const hashtag = constants.hashtag;
const days = constants.days;

const dailyCases = {
    label: "Cases",
    data: [],
    backgroundColor: "rgba(237, 100, 127, .6)",
    borderColor: "rgba(233,0,45, 1)",
    borderWidth: 0,
    yAxisID: "dailyCasesAxis"
};

const totalCases = {
    label: "Total Cases",
    data: [],
    backgroundColor: "transparent",
    borderColor: "rgba(63, 63, 191, 0.6)",
    borderWidth: 4,
    type: "line",
    yAxisID: "totalCasesAxis"
};

const graphData = new Array();

logger.info('Processing daily cases');
fs.readFile('./covid19dashboard/data.json', 'utf8', (err, data) => {
    if (err) {
        logger.error(`Error reading file from disk: ${err}`);
    } else {
        const covidData = JSON.parse(data);
        let cases = [];
        let totalCases = 0;
        let dataFrom = new Date();
        dataFrom.setMonth(dataFrom.getMonth() - 1);
        covidData.forEach(function(item, index) {
            if (item.hasOwnProperty("dateString") && item.hasOwnProperty("cases")) {
                totalCases += item.cases;
                let date = new Date(item.dateString);
                let caseData = {
                  date: date,
                  cases: item.cases,
                  totalCases: totalCases
                };
                if (date > dataFrom) {
                    graphData.push(caseData);
                }
            }
        });
        header = '📅 ' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM YYYY');
        processNewCases();
    }
});

function processNewCases() {
    logger.info("Processing new cases");
    let labels = new Array();
    dailyCases.data = new Array();
    totalCases.data = new Array();

    graphData.forEach(function(value, index) {
        labels.push(value.date.toDateString());
        dailyCases.data.push(value.cases);
        totalCases.data.push(value.totalCases);
    });
    let newCases = dailyCases.data[dailyCases.data.length - 1];
    let previousDaysCases = dailyCases.data[dailyCases.data.length - 2];
    let change = newCases - previousDaysCases;
    let percentageChange = ((change * 100) / previousDaysCases).toFixed(2)
    let tweet = header +
                '\n🦠 Cases: Daily cases' + 
                '\nNew cases: ' + newCases + 
                '\nYesterday\'s cases: ' + previousDaysCases + 
                '\nDifference: ' + change + 
                '\nPercentage difference: ' + percentageChange + '%' +
//                '\nTotal cases: ' + Number(totalCases.data[totalCases.data.length - 1]).toLocaleString('en') + 
                '\n' +
                '\n' + hashtag + 
                '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=true';

    let configuration = generateConfiguration(labels, totalCases, dailyCases);
    let b64Content = chartHelper.writeChart('cases/dailyCases.png', configuration);
    twitterChart.tweetChart(b64Content, tweet, processRollingSevenDayAverage);
}

function processCasesByDay(inReplyToId) {
    logger.info("Processing cases by day");
    let labels = new Array();
    dailyCases.data = new Array();
    totalCases.data = new Array();

    let day = graphData[graphData.length - 1].date.getDay();
    graphData.forEach(function(value, index) { 
      if (value.date.getDay() == day) {
        labels.push(value.date.toDateString());
        dailyCases.data.push(value.cases);
        totalCases.data.push(value.totalCases);
      }
    });
    let newCases = dailyCases.data[dailyCases.data.length - 1];
    let lastWeeksCases = dailyCases.data[dailyCases.data.length - 2];
    let previousWeeksCases = dailyCases.data[dailyCases.data.length - 3];

    let lastWeeksChange = newCases - lastWeeksCases;
    let previousWeeksChange = newCases - previousWeeksCases;

    let lastWeeksPercentageChange = ((lastWeeksChange * 100) / lastWeeksCases).toFixed(2);
    let previousWeeksPercentageChange = ((previousWeeksChange * 100) / previousWeeksCases).toFixed(2);

    tweet = header +
            '\n🦠 Cases: By day' + 
            '\nToday: ' + newCases + 
            '\n' +
            '\nDate: Cases(Difference | % difference)' +
            '\n' + moment(graphData[graphData.length - 8].date).format('dddd, Do MMMM') + ': ' + lastWeeksCases + '(' + lastWeeksChange + ' | ' + lastWeeksPercentageChange + '%)' +
            '\n' + moment(graphData[graphData.length - 15].date).format('dddd, Do MMMM') + ': ' + previousWeeksCases + '(' + previousWeeksChange + ' | ' + previousWeeksPercentageChange + '%)' +
            '\n' +
            '\n' + hashtag + 
            '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=byWeekday&day=' + day + '&displayType=graph&trendLine=false';

    let configuration = generateConfiguration(labels, totalCases, dailyCases);
    let b64Content = chartHelper.writeChart('cases/byDay.png', configuration);
    twitterChart.tweetChart(b64Content, tweet, function() {}, inReplyToId);
}


function processRollingSevenDayAverage(inReplyToId) {
    logger.info("Processing seven day average");
    let labels = new Array();
    dailyCases.data = new Array();
    totalCases.data = new Array();

    let initialCasesIndex = 0;
    let todayDay = new Date().getDay();
    for (let counter = 6; counter < 13; counter++) {
      if (graphData[counter].date.getDay() === todayDay) {
        initialCasesIndex = counter;
        break;
      }
    }
    for (let counter = initialCasesIndex; counter < graphData.length; counter += 1) {
      let today = graphData[counter];
      let yesterday = graphData[counter - 1];
      let twoDaysAgo = graphData[counter - 2];
      let threeDaysAgo = graphData[counter - 3];
      let fourDaysAgo = graphData[counter - 4];
      let fiveDaysAgo = graphData[counter - 5];
      let sixDayAgo = graphData[counter - 6];

      let weeklyCases = today.cases + yesterday.cases + twoDaysAgo.cases + threeDaysAgo.cases + fourDaysAgo.cases + fiveDaysAgo.cases + sixDayAgo.cases;
      labels.push(today.date.toDateString());
      dailyCases.data.push((weeklyCases / 7).toFixed(2));
      totalCases.data.push(today.totalCases);
    }
    let newCases = dailyCases.data[dailyCases.data.length - 1];

    let previousDaysCases = dailyCases.data[dailyCases.data.length - 8];
    let previousDaysCasesChange = Number(newCases - previousDaysCases).toFixed(2);
    let previousDaysCasesPercentageChange = ((previousDaysCasesChange * 100) / previousDaysCases).toFixed(2)

    let previousWeeksCases = dailyCases.data[dailyCases.data.length - 15];
    let previousWeeksCasesChange = Number(newCases - previousWeeksCases).toFixed(2);
    let previousWeeksCasesPercentageChange = ((previousWeeksCasesChange * 100) / previousWeeksCases).toFixed(2)

    let tweet = header +
            '\n🦠 Cases: Seven day average' +
            '\nToday: ' + newCases +
            '\n' +
            '\nDate: Cases(Difference | % difference)' +
            '\n' + moment(graphData[graphData.length - 8].date).format('dddd, Do MMMM') + ': ' + previousDaysCases + '(' + previousDaysCasesChange + ' | ' + previousDaysCasesPercentageChange + '%' + ')' +
            '\n' + moment(graphData[graphData.length - 15].date).format('dddd, Do MMMM') + ': ' + previousWeeksCases + '(' + previousWeeksCasesChange + ' | ' + previousWeeksCasesPercentageChange + '%' + ')' +
            '\n' +
            '\n' + hashtag +
            '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=rollingSevenDayAverage&displayType=graph&trendLine=false';

    let configuration = generateConfiguration(labels, totalCases, dailyCases);
    writeChartToFile.processChart('cases/rollingSevenDayAverage.png', configuration, tweet, processCasesByDay, inReplyToId);
}

/*
function processSevenDayAverage(inReplyToId) {
    let labels = new Array();
    dailyCases.data = new Array();
    totalCases.data = new Array();

    let initialCasesIndex = 0;
    let day = new Date().getDay();
    for (let counter = 6; counter < 13; counter++) {
      if (graphData[counter].date.getDay() === day) {
        initialCasesIndex = counter;
        break;
      }
    }
    for (let counter = initialCasesIndex; counter < graphData.length; counter += 7) {
      let today = graphData[counter];
      let yesterday = graphData[counter - 1];
      let twoDaysAgo = graphData[counter - 2];
      let threeDaysAgo = graphData[counter - 3];
      let fourDaysAgo = graphData[counter - 4];
      let fiveDaysAgo = graphData[counter - 5];
      let sixDayAgo = graphData[counter - 6];

      let weeklyCases = today.cases + yesterday.cases + twoDaysAgo.cases + threeDaysAgo.cases + fourDaysAgo.cases + fiveDaysAgo.cases + sixDayAgo.cases;        
      labels.push(today.date.toDateString());
      dailyCases.data.push((weeklyCases / 7).toFixed(2));
      totalCases.data.push(today.totalCases);
    }
    console.log("Writing seven day average");
    let tweet = header +
            '\n🦠 Seven day average cases' + 
            '\nToday\'s seven day average: ' + newCases + 
            '\nLast ' + days[day] + '\'s seven day average: ' + previousDaysCases + 
            '\nChange: ' + change + 
            '\nPercentage change: ' + percentageChange + '%' +
            '\n' + hashtag + 
            '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=sevenDayAverage&displayType=graph&trendLine=false';

    let configuration = generateConfiguration(labels, totalCases, dailyCases);
    writeChartToFile.processChart('cases/sevenDayAverage.png', configuration, tweet, function() {}, inReplyToId);
}
*/

function generateConfiguration(labels, totalCases, dailyCases) {
    return {
        type: "bar",
        data: {
            labels: labels,
            datasets: [totalCases, dailyCases]
        },
        options: {
            scales: {
                yAxes: [{
                    id: "dailyCasesAxis",
                    position: "left",
                    ticks: {
                        beginAtZero: true,
                        autoskip: false
                    },
                    scaleLabel: {
                        display: true,
                        labelString: "Daily Cases"
                    }
                }, {
                    id: "totalCasesAxis",
                    position: "right",
                    ticks: {
                        beginAtZero: true,
                        autoskip: false
                    },
                    gridLines: {
                        display: false
                    },
                    scaleLabel: {
                        display: true,
                        labelString: "Total Cases"
                    }
                }],
                xAxes: [{
                  ticks: {
                    autoSkip: false
                  }
                }]
            }
        }
    };
}
