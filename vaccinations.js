const fs = require('fs');
const moment = require('moment');
const log4js = require("log4js");

const chartHelper = require("./chartHelper");
const twitterChart = require("./twitterChart");
const constants = require("./constants");

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('vaccinations');

const hashtag = constants.hashtag;

const population = 4977400;
const over16 = 3863147;

const graphData = new Array();

const firstDose = {
  label: "First Dose",
  data: [],
  backgroundColor: "rgba(237, 100, 127, .6)",
  borderColor: "rgba(233,0,45, 1)",
  borderWidth: 0,
  yAxisID: "DosesAxis"
};

const secondDose = {
  label: "Second Dose",
  data: [],
  backgroundColor: "rgba(63, 63, 191, 0.6)",
  borderColor: "rgba(14, 54, 201, 0.5)",
  borderWidth: 0,
  yAxisID: "DosesAxis"
};

const populationFirstDose = {
  label: "Population - 1st Dose",
  data: [],
  backgroundColor: "transparent",
  borderColor: "red",
  borderWidth: 4,
  yAxisID: "VaccinatedAxis",
  type: "line"
};

const populationSecondDose = {
  label: "Population - 2nd Dose",
  data: [],
  backgroundColor: "transparent",
  borderColor: "green",
  borderWidth: 4,
  yAxisID: "VaccinatedAxis",
  type: "line"
};

logger.info('Processing vaccinations');
fs.readFile('./covid19dashboard/data.json', 'utf8', (err, data) => {
  if (err) {
      logger.error(`Error reading file from disk: ${err}`);
  } else {
    const covidData = JSON.parse(data);
    logger.debug(`Processing ${covidData.length} items`);
    let vaccinations = [];
    let totalFirstDose = 0;
    let totalSecondDose = 0;
    let dataFrom = new Date();
    dataFrom.setMonth(dataFrom.getMonth() - 1);
    covidData.forEach(function(item, index) {
      if (item.hasOwnProperty("dateString") && item.hasOwnProperty("firstDose")) {
        let date = new Date(item.dateString);
        totalFirstDose += item.firstDose;
        let populationFirstDose = ((totalFirstDose * 100) / population).toFixed(2);
        let populationSecondDose = 0;
        if (item.hasOwnProperty("secondDose")) {
          totalSecondDose += item.secondDose;
          populationSecondDose = ((totalSecondDose * 100) / population).toFixed(2);
        }
        let vaccinatedData = {
          date: date,
          firstDose: item.firstDose,
          secondDose: (item.hasOwnProperty("secondDose") ? item.secondDose : 0),
          totalFirstDose: totalFirstDose,
          totalSecondDose: totalSecondDose,
          populationFirstDose: populationFirstDose,
          populationSecondDose: populationSecondDose
        };
        if (date > dataFrom) {
          graphData.push(vaccinatedData);
        }
      }
    });
    header = '📅 ' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM YYYY');
    processNewVaccinations();
  }
});

function processNewVaccinations() {
logger.info('Processing daily vaccinations');
  let labels = new Array();
  firstDose.data = new Array();
  secondDose.data = new Array();
  populationFirstDose.data = new Array();
  populationSecondDose.data = new Array();
  graphData.forEach(function(value, index) {
    labels.push(value.date.toDateString());
    firstDose.data.push(value.firstDose);
    secondDose.data.push(value.secondDose);
    populationFirstDose.data.push(value.totalFirstDose);
    populationSecondDose.data.push(value.totalSecondDose);
  });
  let dailyFirstDose = firstDose.data[firstDose.data.length - 1];
  let dailySecondDose = secondDose.data[secondDose.data.length - 1];

  let finalEntry = graphData[graphData.length - 1];
  let totalFirstDose = finalEntry.totalFirstDose;
  let totalSecondDose = finalEntry.totalSecondDose;

  let tweet = '💉 Vaccinations: Daily doses' +
              '\n' + moment(finalEntry.date).format('dddd, Do MMMM') + 
              '\n1st dose: ' + Number(dailyFirstDose).toLocaleString('en') +
              '\n2nd dose: ' + Number(dailySecondDose).toLocaleString('en') +
              '\nTotal daily doses: ' + Number(dailyFirstDose + dailySecondDose).toLocaleString('en') +
              '\n' +
              '\nTotal 1st dose: ' + Number(totalFirstDose).toLocaleString('en') + '(' + finalEntry.populationFirstDose + '% of population)' +
              '\nTotal 2nd dose: ' + Number(totalSecondDose).toLocaleString('en') + '(' + finalEntry.populationSecondDose + '% of population)' +
              '\nTotal doses: ' + Number(totalFirstDose + totalSecondDose).toLocaleString('en') +
              '\n' + hashtag +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=false';

  let b64Content = new Array();
  let configuration = generateConfiguration(labels, firstDose, secondDose, populationFirstDose, populationSecondDose);
  b64Content.push(chartHelper.writeChart('vaccinations/dailyVaccinations.png', configuration));
  configuration = generateDoughnutConfiguration(labels, finalEntry.populationFirstDose, finalEntry.populationSecondDose);
  b64Content.push(chartHelper.writeChart('vaccinations/vaccinationProgress.png', configuration));
  twitterChart.tweetChart(b64Content, tweet, processRollingSevenDayAverage);
}

function processVaccinationsByDay(lastTweetId) {
  logger.info('Processing vaccinations by day');
  let lastDay = graphData[graphData.length - 1].date.getDay();
  let labels = new Array();

  firstDose.data = new Array();
  secondDose.data = new Array();
  populationFirstDose.data = new Array();
  populationSecondDose.data = new Array();

  graphData.forEach(function(value, index) {
    if(value.date.getDay() == lastDay) {
      firstDose.data.push();
      secondDose.data.push();
      labels.push(value.date.toDateString());
      firstDose.data.push(value.firstDose);
      secondDose.data.push(value.secondDose);
      populationFirstDose.data.push(value.totalFirstDose);
      populationSecondDose.data.push(value.totalSecondDose);
    }
  });
  let previousDay = moment(graphData[graphData.length - 8].date).format('ddd, Do MMMM');
  let dailyFirstDose = firstDose.data[firstDose.data.length - 1];
  let dailySecondDose = secondDose.data[secondDose.data.length - 1];
  let previousFirstDose = firstDose.data[firstDose.data.length - 2];
  let previousSecondDose = secondDose.data[secondDose.data.length - 2];

  let totalFirstDose = graphData[graphData.length - 1].totalFirstDose;
  let totalSecondDose = graphData[graphData.length - 1].totalSecondDose;

  let firstDoseChange = dailyFirstDose - previousFirstDose;
  let secondDoseChange = dailySecondDose - previousSecondDose;
  let totalDosesChange = firstDoseChange + secondDoseChange;

  let tweet = '💉 Vaccinations: By day' +
              '\n' + moment(graphData[graphData.length - 1].date).format('ddd, Do MMMM') + 
              '\n1st dose: ' + Number(dailyFirstDose).toLocaleString('en') +
              '\n2nd dose: ' + Number(dailySecondDose).toLocaleString('en') +
              '\n' +
              '\n' + previousDay +
              '\nDoses(Difference | % difference)' + 
              '\n1st dose: ' + Number(previousFirstDose).toLocaleString('en') + '(' + (firstDoseChange > 0 ? '+' : '') + (firstDoseChange).toLocaleString('en') + ' | ' + ((firstDoseChange * 100) / previousFirstDose).toFixed(2) + '%)' +
              '\n2nd dose: ' + Number(previousSecondDose).toLocaleString('en') + '(' + (secondDoseChange > 0 ? '+' : '') + (secondDoseChange).toLocaleString('en') + ' | ' + ((secondDoseChange * 100) / previousSecondDose).toFixed(2) + '%)' +
              '\nTotal: ' + Number(previousFirstDose + previousSecondDose).toLocaleString('en') + '(' + (totalDosesChange > 0 ? '+' : '') + (totalDosesChange).toLocaleString('en') + ' | ' + ((totalDosesChange * 100) / (previousFirstDose + previousSecondDose)).toFixed(2) + '%)' +
              '\n' +
              '\n' + hashtag +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=byWeekday&day=' +  lastDay + '&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, firstDose, secondDose, populationFirstDose, populationSecondDose);
  let b64Content = chartHelper.writeChart('vaccinations/byDay.png', configuration);
  twitterChart.tweetChart(b64Content, tweet, function() {}, lastTweetId);
}

function processRollingSevenDayAverage(inReplyToId) {
  logger.info('Processing seven day average vaccinations');
  let labels = new Array();
  let finalEntry = graphData[graphData.length - 1];
  firstDose.data = new Array();
  secondDose.data = new Array();
  populationFirstDose.data = new Array();
  populationSecondDose.data = new Array();
  let initialTestsIndex = 0;
  let todayDay = finalEntry.date.getDay();
  for (let counter = 6; counter < 13; counter++) {
    if (graphData[counter].date.getDay() === todayDay) {
      initialTestsIndex = counter;
      break;
    }
  }
  for (let counter = initialTestsIndex; counter < graphData.length; counter += 1) {
    let today = graphData[counter];
    let yesterday = graphData[counter - 1];
    let twoDaysAgo = graphData[counter - 2];
    let threeDaysAgo = graphData[counter - 3];
    let fourDaysAgo = graphData[counter - 4];
    let fiveDaysAgo = graphData[counter - 5];
    let sixDayAgo = graphData[counter - 6];
    let totalFirstDose = today.firstDose + yesterday.firstDose + twoDaysAgo.firstDose + threeDaysAgo.firstDose + fourDaysAgo.firstDose + fiveDaysAgo.firstDose + sixDayAgo.firstDose;
    let totalSecondDose = today.secondDose + yesterday.secondDose + twoDaysAgo.secondDose + threeDaysAgo.secondDose + fourDaysAgo.secondDose + fiveDaysAgo.secondDose + sixDayAgo.secondDose;
    let dailyDoses = totalFirstDose + totalSecondDose;
    labels.push('Seven days to ' + today.date.toDateString());
    firstDose.data.push((totalFirstDose / 7).toFixed(2));
    secondDose.data.push((totalSecondDose / 7).toFixed(2));
    populationFirstDose.data.push(today.totalFirstDose);
    populationSecondDose.data.push(today.totalSecondDose);
  }
  let sevenDayAverageFirstDose = Number(firstDose.data[firstDose.data.length - 1]);
  let sevenDayAverageSecondDose = Number(secondDose.data[firstDose.data.length - 1]);
  let sevenDayAverageTotalDose = sevenDayAverageFirstDose + sevenDayAverageSecondDose;

  let firstDosesOver16Remaining = over16 - finalEntry.totalFirstDose;
  let estimatedDaysToTotalFirstDose = (firstDosesOver16Remaining / sevenDayAverageFirstDose);

  let secondDosesAdministered = sevenDayAverageSecondDose * estimatedDaysToTotalFirstDose;
  let secondDosesOver16Remaining = over16 - (finalEntry.totalSecondDose + secondDosesAdministered);
  let estimatedDaysToTotalSecondDose = Math.ceil(secondDosesOver16Remaining / sevenDayAverageTotalDose);

  let finalFirstDose = new Date();
  finalFirstDose.setDate(finalFirstDose.getDate() + Math.ceil(estimatedDaysToTotalFirstDose));

  let finalSecondDose = new Date(finalFirstDose.getTime());
  finalSecondDose.setDate(finalSecondDose.getDate() + Math.ceil(estimatedDaysToTotalSecondDose));

  let tweet = '💉 Vaccinations: Seven day average' +
              '\n' + moment(finalEntry.date).format('dddd, Do MMMM') + 
              '\n1st dose: ' + Number(sevenDayAverageFirstDose).toLocaleString('en') + 
              '\n2nd dose: ' + Number(sevenDayAverageSecondDose).toLocaleString('en') + 
              '\nTotal doses: ' + Number(sevenDayAverageTotalDose).toLocaleString('en') +
              '\n' +
              '\nEstimated final vaccinations' +
              '\n1st dose: ' + moment(finalFirstDose).format('ddd, Do MMM YYYY') + '(' + Math.ceil(estimatedDaysToTotalFirstDose)  + ' days)' +
              '\n2nd dose: ' + moment(finalSecondDose).format('ddd, Do MMM YYYY') + '(' + Math.ceil(estimatedDaysToTotalFirstDose + estimatedDaysToTotalSecondDose) + ' days)' +
              '\n' + hashtag +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=rollingSevenDayAverage&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, firstDose, secondDose, populationFirstDose, populationSecondDose);
  let b64Content = chartHelper.writeChart('vaccinations/processRollingSevenDayAverage.png', configuration);
  twitterChart.tweetChart(b64Content, tweet, processVaccinationsByDay, inReplyToId);
}

/*
function processSevenDayAverage(inReplyToId) {
  let labels = new Array();
  firstDose.data = new Array();
  secondDose.data = new Array();
  populationFirstDose.data = new Array();
  populationSecondDose.data = new Array();
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
    let totalFirstDose = today.firstDose + yesterday.firstDose + twoDaysAgo.firstDose + threeDaysAgo.firstDose + fourDaysAgo.firstDose + fiveDaysAgo.firstDose + sixDayAgo.firstDose;
    let totalSecondDose = today.secondDose + yesterday.secondDose + twoDaysAgo.secondDose + threeDaysAgo.secondDose + fourDaysAgo.secondDose + fiveDaysAgo.secondDose + sixDayAgo.secondDose;
    let dailyDoses = totalFirstDose + totalSecondDose;
    labels.push('Seven days to ' + today.date.toDateString());
    firstDose.data.push((totalFirstDose / 7).toFixed(2));
    secondDose.data.push((totalSecondDose / 7).toFixed(2));
    populationFirstDose.data.push(today.totalFirstDose);
    populationSecondDose.data.push(today.totalSecondDose);
  }
  let sevenDayAverageFirstDose = firstDose.data[firstDose.data.length - 1];
  let sevenDayAverageSecondDose = secondDose.data[firstDose.data.length - 1];
  let sevenDayAverageTotalDose = Number(sevenDayAverageFirstDose) + Number(sevenDayAverageSecondDose);
  let previousSevenDayAverageFirstDose = firstDose.data[firstDose.data.length - 2];
  let previousSevenDayAverageSecondDose = secondDose.data[firstDose.data.length - 2];
  let previousSevenDayAverageTotalDose = Number(previousSevenDayAverageFirstDose) + Number(previousSevenDayAverageSecondDose);
  let tweet = header +
              '\n💉 7 day average vaccinations' +
              '\n1st dose: ' + Number(sevenDayAverageFirstDose).toLocaleString('en') +
              '\n2nd dose: ' + Number(sevenDayAverageSecondDose).toLocaleString('en') +
              '\nTotal doses: ' + Number(sevenDayAverageTotalDose).toLocaleString('en') +
              '\n' +
              '\nPrevious average vaccinations' +
              '\n1st doses: ' + Number(previousSevenDayAverageFirstDose).toLocaleString('en') +
              '\n2nd doses: ' + Number(previousSevenDayAverageSecondDose).toLocaleString('en') +
              '\nTotal doses: ' + Number(previousSevenDayAverageTotalDose).toLocaleString('en') +
              '\n' + hashtag +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=sevenDayAverage&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, firstDose, secondDose, populationFirstDose, populationSecondDose);
  writeChartToFile.processChart('vaccinations/sevenDayAverage.png', configuration, tweet, function() {}, inReplyToId);
}
*/

function generateConfiguration(labels, firstDose, secondDose, populationFirstDose, populationSecondDose) {
  return {
    type: "bar",
    data: {
      labels: labels,
      datasets: [firstDose, secondDose, populationFirstDose, populationSecondDose]
    },
    options: {
      scales: {
        xAxes: [{
          stacked: true
        }],
        yAxes: [{
          id: "DosesAxis",
          stacked: true,
          position: "left",
          ticks: {
            beginAtZero: true
          },
          scaleLabel: {
            display: true,
            labelString: "Total Vaccinated"
          }
        }, {
          id: "VaccinatedAxis",
          position: "right",
          ticks: {
            beginAtZero: true
          },
          gridLines: {
            display: false
          },
          scaleLabel: {
            display: true,
            labelString: "Population Vaccinated"
          }
        }]
      }
    }
  };
}

function generateDoughnutConfiguration(labels, firstDosePercentage, secondDosePercentage) {
  return {
    type: "doughnut",
    data: {
      labels: ['First Dose', 'Second Dose'],
      datasets: [{
        label: 'First Dose label',
        data: [firstDosePercentage, (100 - firstDosePercentage)],
        backgroundColor: ['rgba(237, 100, 127, .6)', 'rgba(228, 233, 237, 1)'],
        color: 'black'
      }, {
        label: 'Second Dose label',
        data: [secondDosePercentage, (100 - secondDosePercentage)],
        backgroundColor: ['rgba(63, 63, 191, 0.6)', 'rgba(228, 233, 237, 1)'],
        color: 'yellow'
      }]
    }
  };
}
