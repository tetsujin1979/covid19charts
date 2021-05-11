const fs = require('fs');
const moment = require('moment'); 
const log4js = require('log4js'); 

const chartHelper = require("./chartHelper");
const twitterHelper = require("./twitterHelper");
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

let covidData = '';
const graphData = new Array();

const oneMonthAgo = constants.oneMonthAgo;

logger.info('Processing daily cases');
fs.readFile('./covid19dashboard/data.json', 'utf8', (err, data) => {
    if (err) {
        logger.error(`Error reading file from disk: ${err}`);
    } else {
        covidData = JSON.parse(data);
        let cases = [];
        let totalCases = 0;
        covidData.forEach(function(item, index) {
            if (item.hasOwnProperty("dateString") && item.hasOwnProperty("cases")) {
                totalCases += item.cases;
                let date = new Date(item.dateString);
                let caseData = {
                  date: date,
                  cases: item.cases,
                  totalCases: totalCases
                };
                if (index > 7) {
                    let today = covidData[index];
                    let yesterday = covidData[index - 1];
                    let twoDaysAgo = covidData[index - 2];
                    let threeDaysAgo = covidData[index - 3];
                    let fourDaysAgo = covidData[index - 4];
                    let fiveDaysAgo = covidData[index - 5];
                    let sixDayAgo = covidData[index - 6];
                    let weeklyCases = today.cases + yesterday.cases + twoDaysAgo.cases + threeDaysAgo.cases + fourDaysAgo.cases + fiveDaysAgo.cases + sixDayAgo.cases;
                    caseData.sevenDayAverage = (weeklyCases / 7).toFixed(2);
                    if (date.getDay() === 0) {
                        caseData.weeklyCases = weeklyCases;
                    }
                }
                graphData.push(caseData);
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
    graphData.filter(item => item.date > oneMonthAgo)
             .forEach(function(value, index) {
        labels.push(value.date.toDateString());
        dailyCases.data.push(value.cases);
        totalCases.data.push(value.totalCases);
    });
    let newCases = dailyCases.data[dailyCases.data.length - 1];
    logger.debug(`${labels[labels.length - 1]}: ${newCases} new cases`);
    // Array of objects where the number of new cases is less than today's new cases
    let lessCases = graphData.filter(item => item.cases < newCases);
    let higherCases = graphData.filter(item => item.cases > newCases);
    logger.debug(`Found ${lessCases.length} days with less cases`);
    logger.debug(`Found ${higherCases.length} days with more cases`);
    // An object for the last day with less cases than today
    let lastDayLessCases = {
        date: new Date(),   // The date
        cases: 0,           // The number of cases
        dateDifference: 0   // The number of days since a lower number of cases
    };
    let lastDayMoreCases = {
        date: new Date(),   // The date
        cases: 0,           // The number of cases
        dateDifference: 0   // The number of days since a lower number of cases
    };
    if (lessCases.length > 0) {
        // The last entry in the array, i.e. the last date with less cases than today
        let lastDayLowCases = lessCases[lessCases.length - 1];
        // The number of days since the above
        lastDayLessCases.date = lastDayLowCases.date;
        lastDayLessCases.cases = lastDayLowCases.cases;
        lastDayLessCases.dateDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastDayLessCases.date), 'days');
        logger.debug(`${lastDayLessCases.dateDifference} days since a lower number of cases - ${lastDayLessCases.date}(${lastDayLessCases.cases})`);
    }
    if (higherCases.length > 0) {
        // The last entry in the array, i.e. the last date with more cases than today
        let lastWeekHighCases = higherCases[higherCases.length - 1];
        // The number of days since the above
        lastDayMoreCases.date = lastWeekHighCases.date;
        lastDayMoreCases.cases = lastWeekHighCases.cases;
        lastDayMoreCases.dateDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastWeekHighCases.date), 'days');
        logger.debug(`${lastDayMoreCases.dateDifference} days since a higher number of cases - ${lastWeekHighCases.date}(${lastWeekHighCases.cases})`);
    }
    let previousDaysCases = dailyCases.data[dailyCases.data.length - 2];
    let change = newCases - previousDaysCases;
    let percentageChange = ((change * 100) / previousDaysCases).toFixed(2)
    let tweet = '🦠 Cases: Daily cases' + 
                '\n' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM') + ': ' + newCases + 
//                '\nTotal cases: ' + Number(totalCases.data[totalCases.data.length - 1]).toLocaleString('en') + 
                // If it's been more than 14 days since a lower number of new cases, add that to the tweet
                (lastDayLessCases.dateDifference > 14 ? `\nLowest since ${moment(lastDayLessCases.date).format('dddd, Do MMMM')}(${lastDayLessCases.cases})`: '') +
                // If it's been more than 14 days since a higher number of new cases, add that to the tweet
                (lastDayMoreCases.dateDifference > 14 ? `\nHighest since ${moment(lastDayMoreCases.date).format('dddd, Do MMMM')}(${lastDayMoreCases.cases})`: '') +
                '\n' +
                '\n' + hashtag + 
                '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=true';

    let configuration = generateConfiguration(labels, totalCases, dailyCases, "Daily Cases");
    let b64Content = chartHelper.writeChart('cases/dailyCases.png', configuration);
    twitterHelper.tweetChart(b64Content, tweet, processRollingSevenDayAverage);
}

function processCasesByDay(inReplyToId) {
    logger.info("Processing cases by day");
    let labels = new Array();
    dailyCases.data = new Array();
    totalCases.data = new Array();

    let day = graphData[graphData.length - 1].date.getDay();
    graphData.filter(item => ((item.date > oneMonthAgo) && (item.date.getDay() === day)))
             .forEach(function(value, index) { 
        labels.push(value.date.toDateString());
        dailyCases.data.push(value.cases);
        totalCases.data.push(value.totalCases);
    });
    let newCases = dailyCases.data[dailyCases.data.length - 1];
    let lastWeeksCases = dailyCases.data[dailyCases.data.length - 2];
    let previousWeeksCases = dailyCases.data[dailyCases.data.length - 3];

    let lastWeeksChange = newCases - lastWeeksCases;
    let previousWeeksChange = newCases - previousWeeksCases;

    let lastWeeksPercentageChange = ((lastWeeksChange * 100) / lastWeeksCases).toFixed(2);
    let previousWeeksPercentageChange = ((previousWeeksChange * 100) / previousWeeksCases).toFixed(2);

    tweet = '🦠 Cases: By day' + 
            '\nDate: Cases(Difference | % difference)' +
            '\n' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM') + ': ' + newCases + 
            '\n' + moment(graphData[graphData.length - 8].date).format('dddd, Do MMMM') + ': ' + lastWeeksCases + '(' + lastWeeksChange + ' | ' + lastWeeksPercentageChange + '%)' +
            '\n' + moment(graphData[graphData.length - 15].date).format('dddd, Do MMMM') + ': ' + previousWeeksCases + '(' + previousWeeksChange + ' | ' + previousWeeksPercentageChange + '%)' +
            '\n' +
            '\n' + hashtag + 
            '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=byWeekday&day=' + day + '&displayType=graph&trendLine=false';

    let configuration = generateConfiguration(labels, totalCases, dailyCases, "Daily Cases By Day - " + days[day]);
    let b64Content = chartHelper.writeChart('cases/byDay.png', configuration);
    twitterHelper.tweetChart(b64Content, tweet, processWeeklyCases, inReplyToId);
}


function processRollingSevenDayAverage(inReplyToId) {
    logger.info("Processing seven day average");
    let labels = new Array();
    dailyCases.data = new Array();
    totalCases.data = new Array();

    let initialCasesIndex = 0;
    let todayDay = new Date().getDay();
    for (let index = 6; index < 13; index++) {
      if (graphData[index].date.getDay() === todayDay) {
        initialCasesIndex = index;
        break;
      }
    }
    for (let index = initialCasesIndex; index < graphData.length; index += 1) {
        let value = graphData[index];
        if (value.date > oneMonthAgo) {
            labels.push(value.date.toDateString());
            dailyCases.data.push(value.sevenDayAverage);
            totalCases.data.push(value.totalCases);
        }
    }
    let newCases = dailyCases.data[dailyCases.data.length - 1];

    let previousDaysCases = dailyCases.data[dailyCases.data.length - 8];
    let previousDaysCasesChange = Number(newCases - previousDaysCases).toFixed(2);
    let previousDaysCasesPercentageChange = ((previousDaysCasesChange * 100) / previousDaysCases).toFixed(2)

    let previousWeeksCases = dailyCases.data[dailyCases.data.length - 15];
    let previousWeeksCasesChange = Number(newCases - previousWeeksCases).toFixed(2);
    let previousWeeksCasesPercentageChange = ((previousWeeksCasesChange * 100) / previousWeeksCases).toFixed(2)

    let tweet = '🦠 Cases: Seven day average' +
                '\nDate: Cases(Difference | % difference)' +
                '\n' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM') + ': ' + newCases + 
                '\n' + moment(graphData[graphData.length - 8].date).format('dddd, Do MMMM') + ': ' + previousDaysCases + '(' + previousDaysCasesChange + ' | ' + previousDaysCasesPercentageChange + '%' + ')' +
                '\n' + moment(graphData[graphData.length - 15].date).format('dddd, Do MMMM') + ': ' + previousWeeksCases + '(' + previousWeeksCasesChange + ' | ' + previousWeeksCasesPercentageChange + '%' + ')' +
                '\n' +
                '\n' + hashtag +
                '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=rollingSevenDayAverage&displayType=graph&trendLine=false';

    let configuration = generateConfiguration(labels, totalCases, dailyCases, "Seven Day Average Cases");
    let b64Content = chartHelper.writeChart('cases/rollingSevenDayAverage.png', configuration);
    twitterHelper.tweetChart(b64Content, tweet, processCasesByDay, inReplyToId);
}

function processWeeklyCases(inReplyToId) {
    if (graphData[graphData.length - 1].date.getDay() === 0) {
        logger.info("Processing weekly totals");
        let labels = new Array();
        dailyCases.data = new Array();
        totalCases.data = new Array();
        let weeklyData = graphData.filter(item => item.date > oneMonthAgo && item.date.getDay() === 0);
        weeklyData.forEach(function(value, index) { 
            labels.push(value.date.toDateString());
            dailyCases.data.push(value.weeklyCases);
            totalCases.data.push(value.totalCases);
        });
        let newCases = dailyCases.data[dailyCases.data.length - 1];
        let lessCases = graphData.filter(item => item.date.getDay() === 0 && item.weeklyCases < newCases);
        let higherCases = graphData.filter(item => item.date.getDay() === 0 && item.weeklyCases > newCases);

        logger.debug(`Found ${lessCases.length} weeks with less cases`);
        logger.debug(`Found ${higherCases.length} weeks with more cases`);
        // An object for the last day with less cases than today
        let lastWeekLessCases = {
            date: new Date(),   // The date
            cases: 0,           // The number of cases
            dateDifference: 0   // The number of days since a lower number of cases
        };
        let lastWeekMoreCases = {
            date: new Date(),   // The date
            cases: 0,           // The number of cases
            dateDifference: 0   // The number of days since a lower number of cases
        };
        if (lessCases.length > 0) {
            // The last entry in the array, i.e. the last date with less cases than today
            let lastDayLowCases = lessCases[lessCases.length - 1];
            // The number of days since the above
            lastWeekLessCases.date = lastDayLowCases.date;
            lastWeekLessCases.weeklyCases = lastDayLowCases.weeklyCases;
            lastWeekLessCases.dateDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastWeekLessCases.date), 'weeks');
            logger.debug(`${lastWeekLessCases.dateDifference} weeks since a lower number of weekly cases - ${lastWeekLessCases.date}(${lastWeekLessCases.weeklyCases})`);
        }
        if (higherCases.length > 0) {
            // The last entry in the array, i.e. the last date with more cases than today
            let lastWeekHighCases = higherCases[higherCases.length - 1];
            // The number of days since the above
            lastWeekMoreCases.date = lastWeekHighCases.date;
            lastWeekMoreCases.weeklyCases = lastWeekHighCases.weeklyCases;
            lastWeekMoreCases.dateDifference = moment(graphData[graphData.length - 1].date).diff(moment(lastWeekHighCases.date), 'weeks');
            logger.debug(`${lastWeekMoreCases.dateDifference} days since a higher number of cases - ${lastWeekMoreCases.date}(${lastWeekMoreCases.weeklyCases})`);
        }
        
        let previousDaysCases = dailyCases.data[dailyCases.data.length - 2];
        let previousDaysCasesChange = Number(newCases - previousDaysCases).toFixed(2);
        let previousDaysCasesPercentageChange = ((previousDaysCasesChange * 100) / previousDaysCases).toFixed(2)

        let previousWeeksCases = dailyCases.data[dailyCases.data.length - 3];
        let previousWeeksCasesChange = Number(newCases - previousWeeksCases).toFixed(2);
        let previousWeeksCasesPercentageChange = ((previousWeeksCasesChange * 100) / previousWeeksCases).toFixed(2)
        let tweet = '🦠 Cases: Weekly total' +
                    '\nDate: Cases(Difference | % difference)' +
                    '\n' + moment(weeklyData[weeklyData.length - 1].date).format('dddd, Do MMMM') + ': ' + newCases.toLocaleString('en') + 
                    ((lastWeekLessCases.dateDifference > 3) ? `${lastWeekLessCases.dateDifference} weeks since a lower number of cases(${lastWeekLessCases.weeklyCases})` : '') +
                    ((lastWeekMoreCases.dateDifference > 3) ? `${lastWeekMoreCases.dateDifference} weeks since a higher number of cases(${lastWeekMoreCases.weeklyCases})` : '') +
                    '\n' + moment(weeklyData[weeklyData.length - 2].date).format('dddd, Do MMMM') + ': ' + previousDaysCases.toLocaleString('en') + '(' + Number(previousDaysCasesChange) + ' | ' + previousDaysCasesPercentageChange + '%' + ')' +
                    '\n' + moment(weeklyData[weeklyData.length - 3].date).format('dddd, Do MMMM') + ': ' + previousWeeksCases.toLocaleString('en') + '(' + Number(previousWeeksCasesChange) + ' | ' + previousWeeksCasesPercentageChange + '%' + ')' +
                    '\n' +
                    '\n' + hashtag +
                    '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=rollingSevenDayAverage&displayType=graph&trendLine=false';

        let configuration = generateConfiguration(labels, totalCases, dailyCases, "Weekly cases");
        let b64Content = chartHelper.writeChart('cases/weeklyCases.png', configuration);
        twitterHelper.tweetChart(b64Content, tweet, function() { }, inReplyToId);        
    }
}

/*
function processSevenDayAverage(inReplyToId) {
    let labels = new Array();
    dailyCases.data = new Array();
    totalCases.data = new Array();

    let initialCasesIndex = 0;
    let day = new Date().getDay();
    for (let index = 6; index < 13; index++) {
      if (graphData[index].date.getDay() === day) {
        initialCasesIndex = index;
        break;
      }
    }
    for (let index = initialCasesIndex; index < graphData.length; index += 7) {
      let today = graphData[index];
      let yesterday = graphData[index - 1];
      let twoDaysAgo = graphData[index - 2];
      let threeDaysAgo = graphData[index - 3];
      let fourDaysAgo = graphData[index - 4];
      let fiveDaysAgo = graphData[index - 5];
      let sixDayAgo = graphData[index - 6];

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

function generateConfiguration(labels, totalCases, dailyCases, title) {
    return {
        type: "bar",
        data: {
            labels: labels,
            datasets: [totalCases, dailyCases]
        },
        options: {
            title: {
                text: title
            },
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
