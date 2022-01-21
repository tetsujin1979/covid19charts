const moment = require('moment');

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const constants = require("./constants");
const log4jsHelper = require('./log4jsHelper');
const twitterHelper = require("./twitterHelper");

const logger = log4jsHelper.getLogger('hospitalisations');

const days = constants.days();
const directory = constants.directories().hospitalisations;
const oneMonthAgo = constants.oneMonthAgo();

const graphData = new Array();

const width = 1200;
const height = 675;
const Canvas = require("canvas");
const fs = require('fs');

const watermark = new Canvas.Image;
watermark.src = fs.readFileSync('./watermark.png');

const admissions = {
    label: "Admissions",
    data: [],
    borderColor: "transparent",
    backgroundColor: "rgba(0, 139, 139, 0.75)",
    borderWidth: 4,
    type: "bar",
    yAxisID: "dailyValuesAxis",
    order: 2
};

const discharges = {
    label: "Discharges",
    data: [],
    borderColor: "transparent",
    backgroundColor: "rgba(85, 187, 31, 0.75)",
    borderWidth: 4,
    type: "bar",
    yAxisID: "dailyValuesAxis",
    order: 2
};

const cases = {
    label: "Cases",
    data: [],
    borderColor: "rgba(220, 20, 60, 1.0)",
    backgroundColor: "transparent",
    borderWidth: 4,
    type: "line",
    yAxisID: "runningTotalAxis",
    order: 1
};

let labels = '';
let dailyCasesAxisMaximumValue = 0;
let dailyCasesAxisMinimumValue = 0;
let runningTotalAxisMaximumValue = 0;

function processData(covidData) {
    logger.info('Processing daily icu values');
    covidData.filter(item => (item.hasOwnProperty("dateString") && item.hasOwnProperty("icu")))
        .forEach(function(item, index) {
            let date = new Date(item.dateString);
            let hospitalisationData = {
                date: date,
                cases: item.icu.cases,
                admissions: item.icu.admissions,
                discharges: item.icu.discharges * -1
            };
            if (index > 0) {
              let yesterday = graphData[graphData.length - 1];
              hospitalisationData.difference = constants.difference(hospitalisationData.cases, yesterday.cases);
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
                hospitalisationData.sevenDayAverageHospitalisations = (weeklyHospitalisations / 7).toFixed(2);
            }
            graphData.push(hospitalisationData);
        });

    processDailyICUData();
}

function processDailyICUData() {
    logger.info("Processing daily icu data");
    initialise();
    graphData.filter(item => item.date > oneMonthAgo)
        .forEach(function(value, index) {
            labels.push(value.date.toDateString());
            admissions.data.push(value.admissions);
            discharges.data.push(value.discharges);
            cases.data.push(value.cases);
        });
    let currentHospitalisations = cases.data[cases.data.length - 1];
    logger.debug(`${labels[labels.length - 1]}: ${currentHospitalisations} currently in hospital`);

    let finalEntry = graphData[graphData.length - 1];

    let dailyCasesRecord = '';
    let dischargesRecord = '';
    let hospitalisationsRecord = '';

    let higherHospitalisations = graphData.filter(item => item.cases >= finalEntry.cases);
    let lowerHospitalisations = graphData.filter(item => item.cases < finalEntry.cases);

    // Discharges are negative values, so "higher" values are lower negatives
    let higherDischarges = graphData.filter(item => item.discharges < finalEntry.discharges);
    let lowerDischarges = graphData.filter(item => item.discharges > finalEntry.discharges);

    let higherDailyAdmissions = graphData.filter(item => (item.admissions) > (finalEntry.admissions));
    let lowerDailyAdmissions = graphData.filter(item => (item.admissions) < (finalEntry.admissions));

    if (higherHospitalisations.length > 0) {
        let higherHospitalisation = higherHospitalisations[higherHospitalisations.length - 1];
        let dateDifference = moment(finalEntry.date).diff(moment(higherHospitalisation.date), 'days');
        if (dateDifference > 14) {
            hospitalisationsRecord = `\nHighest icu cases since ${formatDate(higherHospitalisation.date, finalEntry.date)}(${higherHospitalisation.cases})`;
        }
    } else {
        hospitalisationsRecord = '\nNew record high icu cases';
    }

    if (lowerHospitalisations.length > 0) {
        let lowerHospitalisation = lowerHospitalisations[lowerHospitalisations.length - 1];
        let dateDifference = moment(finalEntry.date).diff(moment(lowerHospitalisations.date), 'days');
        if (dateDifference > 14) {
            hospitalisationsRecord = `\nLowest icu cases since ${formatDate(lowerHospitalisation.date, finalEntry.date)}(${lowerHospitalisation.cases})`;
        }
    } else {
        hospitalisationsRecord = '\nNew record low icu cases';
    }

    if (higherDischarges.length > 0) {
        let higherDischarge = higherDischarges[higherDischarges.length - 1];
        let dateDifference = moment(finalEntry.date).diff(moment(higherDischarge.date), 'days');
        if (dateDifference > 14) {
            dischargesRecord = `\nMost discharges since ${formatDate(higherDischarge.date, finalEntry.date)}(${higherDischarge.discharges * -1})`;
        }
    } else {
        dischargesRecord = '\nNew record high discharges';
    }

    if (lowerDischarges.length > 0) {
        let lowerDischarge = lowerDischarges[lowerDischarges.length - 1];
        let dateDifference = moment(finalEntry.date).diff(moment(lowerDischarge.date), 'days');
        if (dateDifference > 14) {
            dischargesRecord = `\nLowest discharges since ${formatDate(lowerDischarge.date, finalEntry.date)}(${lowerDischarge.discharges * -1})`;
        }
    } else {
        dischargesRecord = '\nNew record low discharges';
    }

    if (higherDailyAdmissions.length > 0) {
        let higherDailyCase = higherDailyAdmissions[higherDailyAdmissions.length - 1];
        let dateDifference = moment(finalEntry.date).diff(moment(higherDailyCase.date), 'days');
        if (dateDifference > 14) {
            dailyCasesRecord = `\nHighest daily icu admissions since ${formatDate(higherDailyCase.date, finalEntry.date)}(${higherDailyCase.admissions})`;
        }
    } else {
        dailyCasesRecord = '\nNew record high daily icu admissions';
    }

    if (lowerDailyAdmissions.length > 0) {
        let lowerDailyCase = lowerDailyAdmissions[lowerDailyAdmissions.length - 1];
        let dateDifference = moment(finalEntry.date).diff(moment(lowerDailyCase.date), 'days');
        if (dateDifference > 14) {
            dailyCasesRecord = `\nLowest daily icu admissions since ${formatDate(lowerDailyCase.date, finalEntry.date)}(${lowerDailyCase.admissions})`;
        }
    } else {
        dailyCasesRecord = '\nNew record low daily icu admissions';
    }

    const status = `🏥 ICU - ${moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM')}` +
        `\nICU Cases: ${cases.data[cases.data.length - 1]}${finalEntry.difference.toString}` +
        hospitalisationsRecord +
        `\nAdmissions: ${admissions.data[admissions.data.length - 1]}` +
        dailyCasesRecord +
        `\nDischarges: ${discharges.data[discharges.data.length - 1] * -1}` +
        dischargesRecord;

    let configuration = generateConfiguration(0, "ICU");
    const chartJSNodeCanvas1 = new ChartJSNodeCanvas({
        width,
        height,
        chartCallback
    });
    chartJSNodeCanvas1.renderToBufferSync(configuration, "ICU");

    let ratio = runningTotalAxisMaximumValue / dailyCasesAxisMaximumValue;
    let newMinimumValue = dailyCasesAxisMinimumValue * ratio;
    configuration = generateConfiguration(newMinimumValue, "ICU");

    const chartJSNodeCanvas2 = new ChartJSNodeCanvas({
        width,
        height,
        chartCallback
    });
    let chartBuffer = chartJSNodeCanvas2.renderToBufferSync(configuration);
    let tweet = constants.createTweet(status, '');
    let b64Content = writeChart(directory + '/icu-daily.png', chartBuffer);
    twitterHelper.tweetChart(b64Content, tweet, processICUByDay);
}

function processICUByDay(inReplyToId) {
    logger.info("Processing icu cases by day");
    initialise();
    let day = graphData[graphData.length - 1].date.getDay();
    let twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    graphData.filter(item => ((item.date > twoMonthsAgo) && (item.date.getDay() === day)))
        .forEach(function(value, index) {
          labels.push(value.date.toDateString());
          admissions.data.push(value.admissions);
          discharges.data.push(value.discharges);
          cases.data.push(value.cases);
        });
    let currentHospitalisations = cases.data[cases.data.length - 1];
    let lastWeeksHospitalisations = cases.data[cases.data.length - 2];
    let previousWeeksHospitalisations = cases.data[cases.data.length - 3];
    let threeWeeksHospitalisations = cases.data[cases.data.length - 4];

    let lastWeeksHospitalisationChange = constants.difference(currentHospitalisations, lastWeeksHospitalisations);
    let previousWeeksHospitalisationChange = constants.difference(currentHospitalisations, previousWeeksHospitalisations);
    let threeWeeksHospitalisationChange = constants.difference(currentHospitalisations, threeWeeksHospitalisations);

    const status = '🏥 ICU: By day\nDate: Cases(Diff with today | % diff)' +
        `\n${moment(graphData[graphData.length - 1].date).format('ddd, Do MMM')}: ${currentHospitalisations}` +
        `\n${moment(graphData[graphData.length - 8].date).format('ddd, Do MMM')}: ${lastWeeksHospitalisations}${lastWeeksHospitalisationChange.toString}` +
        `\n${moment(graphData[graphData.length - 15].date).format('ddd, Do MMM')}: ${previousWeeksHospitalisations}${previousWeeksHospitalisationChange.toString}` +
        `\n${moment(graphData[graphData.length - 22].date).format('ddd, Do MMM')}: ${threeWeeksHospitalisations}${threeWeeksHospitalisationChange.toString}`;

    logger.debug(`status: ${status.length} characters\n${status}`);
    // + '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=byWeekday&day=' + day + '&displayType=graph&trendLine=false';
    let configuration = generateConfiguration(0, "ICU - By Day");
    const chartJSNodeCanvas1 = new ChartJSNodeCanvas({
        width,
        height,
        chartCallback
    });
    chartJSNodeCanvas1.renderToBufferSync(configuration, "ICU");

    let ratio = runningTotalAxisMaximumValue / dailyCasesAxisMaximumValue;
    let newMinimumValue = dailyCasesAxisMinimumValue * ratio;
    configuration = generateConfiguration(newMinimumValue, "ICU");

    const chartJSNodeCanvas2 = new ChartJSNodeCanvas({
        width,
        height,
        chartCallback
    });
    let chartBuffer = chartJSNodeCanvas2.renderToBufferSync(configuration);
    let tweet = constants.createTweet(status, '');
    let b64Content = writeChart(directory + '/icu-byDay.png', chartBuffer);
    twitterHelper.tweetChart(b64Content, tweet, () => {}, inReplyToId);
}

const writeChart = (filename, data) => {
  logger.info(`Creating chart at ${filename}`);
  if (fs.existsSync(filename)) {
    logger.debug(`${filename} exists, deleting`);
    fs.unlinkSync(filename);
  }
  try {
    fs.writeFileSync(filename, data);
  } catch (err) {
    logger.error(`Error occured writing ${filename}\t${err}`);
    process.exit(-1);
  }
  let b64Content = fs.readFileSync(filename, { encoding: 'base64' });
  logger.debug(`Returning ${b64Content}`);
  return b64Content;
};    

const generateConfiguration = (runningTotalAxisMinimum, title) => {
  return {
      type: "bar",
      data: {
        labels: labels,
        datasets: [admissions, discharges, cases]
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
                id: "dailyValuesAxis",
                stacked: true,
                position: "left",
                ticks: {
                    beginAtZero: true,
                    autoskip: false,
                    callback: function(val, index, values) {
                // Hide negative values on axis
                return val < 0 ? (val * -1) : val;
              }
                },
                scaleLabel: {
                    display: true,
                    labelString: 'Total Cases'
                }
            }, {
                id: "runningTotalAxis",
                position: "right",
                ticks: {
                    beginAtZero: true,
                    autoskip: false,
                    min: runningTotalAxisMinimum,
                    callback: function(val, index, values) {
                // Hide negative values on axis
                return val >= 0 ? val : '';
              }
                },
                gridLines: {
                    display: false
                },
                scaleLabel: {
                    display: false
                }
            }]
        }
      }
  };
}

const initialise = () => {
    labels = new Array();
    admissions.data = new Array();
    discharges.data = new Array();
    cases.data = new Array();
}

const formatDate = (year1, year2) => {
  let format = (year1.getFullYear() === year2.getFullYear()) ? 'dddd, Do MMM' : 'ddd, Do MMM yyyy';
  return moment(year1).format(format);
};

const chartCallback = (ChartJS) => {
    // Global config example: https://www.chartjs.org/docs/latest/configuration/
    ChartJS.defaults.global.elements.rectangle.borderWidth = 2;
    // ChartJS.defaults.global.layout.padding.bottom = 50;
    ChartJS.defaults.global.title.display = true;
    ChartJS.defaults.global.title.fontSize = 20;
    ChartJS.defaults.global.title.fontStyle = "normal";
    ChartJS.defaults.global.title.position = "bottom";
    // Global plugin example: https://www.chartjs.org/docs/latest/developers/plugins.html
    ChartJS.plugins.register({
        beforeDraw: function(chartInstance) {
          let ctx = chartInstance.chart.ctx;
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, chartInstance.chart.width, chartInstance.chart.height);
          var legends = chartInstance.legend.legendItems;
          legends.forEach(function(e) {
            if (e.text === cases.label) {
              e.fillStyle = cases.borderColor;
            }
          });        
        },
        afterDraw: function(chartInstance) {
          let context = chartInstance.chart.ctx;
          let canvas = context.canvas;

          let cHeight = canvas.clientHeight || canvas.height;
          let cWidth = canvas.clientWidth || canvas.width;

          context.save();

          // Draw watermark
          context.globalAlpha = 1.0;
          context.drawImage(watermark, canvas.width - watermark.width, canvas.height - watermark.height);

          // Draw link at bottom left 
          // Hack to use the current font value to set the new size
          // There is no dedicated setter method for font size
          let fontArgs = context.font.split(' ');
          let newSize = '15px';
          context.font = newSize + ' ' + fontArgs[fontArgs.length - 1];

          context.fillStyle = "#666";
          context.fillText("https://tetsujin1979.github.io/covid19dashboard/", 5, canvas.height - 20);

          context.restore();
          dailyCasesAxisMaximumValue = chartInstance.scales.dailyValuesAxis.max;
          dailyCasesAxisMinimumValue = chartInstance.scales.dailyValuesAxis.min;
          runningTotalAxisMaximumValue = chartInstance.scales.runningTotalAxis.max;
        }
      });
};

exports.processData = processData;
