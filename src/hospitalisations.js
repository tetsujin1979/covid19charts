'use strict';
const moment = require('moment');
const fetch = require('node-fetch');

const constants = require("./constants");
const log4jsHelper = require('./log4jsHelper');
const logger = log4jsHelper.getLogger('hospitalisations');

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const Canvas = require("canvas");

const twitterHelper = require("./twitterHelper");

const width = 1200;
const height = 675;

const watermark = new Canvas.Image;
watermark.src = fs.readFileSync('./watermark.png');

const url = "https://opendata.arcgis.com/api/v3/datasets/fe9bb23592ec4142a4f4c2c9bd32f749_0/downloads/data?format=geojson&spatialRefId=4326";
const settings = { method: "Get" };

const directory = constants.directories().hospitalisations;

const hospitalAcquired = {
  label: "Other",
  data: [],
  borderColor: "transparent",
  backgroundColor: "rgba(210, 180, 140, 0.75)",
  borderWidth: 4,
  type: "bar",
  yAxisID: "dailyValuesAxis",
  order: 2
};

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
  label: "Confirmed Cases",
  data: [],
  borderColor: "rgba(220, 20, 60, 1.0)",
  backgroundColor: "transparent",
  borderWidth: 4,
  type: "line",
  yAxisID: "runningTotalAxis",
  order: 1
};

const graphData = new Array();

const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

let labels = '';
let dailyCasesAxisMaximumValue = 0;
let dailyCasesAxisMinimumValue = 0;
let runningTotalAxisMaximumValue = 0;

function processData(covidData) {
    logger.info('Processing daily hospitalisations');
    covidData.filter(item => (item.hasOwnProperty("dateString") && item.hasOwnProperty("hospitalisations")))
        .forEach(function(item, index) {
            let date = new Date(item.dateString);
            let hospitalisationData = {
                date: date,
                cases: item.hospitalisations.cases,
                admissions: item.hospitalisations.admissions,
                discharges: item.hospitalisations.discharges * -1,
                hospitalAcquired: item.hospitalisations.hospitalAcquired
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

    processDailyHospitalisationData();
}

function processDailyHospitalisationData() {
    logger.info("Processing daily hospitalisation data");
    initialise();
    graphData.filter(item => item.date > oneMonthAgo)
        .forEach(function(value, index) {
            labels.push(value.date.toDateString());
            hospitalAcquired.data.push(value.hospitalAcquired);
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

    let higherHospitalisations = graphData.filter(item => item.cases > finalEntry.cases);
    let lowerHospitalisations = graphData.filter(item => item.cases < finalEntry.cases);

    // Discharges are negative values, so "higher" values are lower negatives
    let higherDischarges = graphData.filter(item => item.discharges < finalEntry.discharges);
    let lowerDischarges = graphData.filter(item => item.discharges >= finalEntry.discharges);

    let higherDailyCases = graphData.filter(item => (item.admissions + item.hospitalAcquired) > (finalEntry.admissions + finalEntry.hospitalAcquired));
    let lowerDailyCases = graphData.filter(item => (item.admissions + item.hospitalAcquired) < (finalEntry.admissions + finalEntry.hospitalAcquired));

    if (higherHospitalisations.length > 0) {
        let higherHospitalisation = higherHospitalisations[higherHospitalisations.length - 1];
        let dateDifference = moment(finalEntry.date).diff(moment(higherHospitalisation.date), 'days');
        if (dateDifference > 14) {
            hospitalisationsRecord = `\nHighest hospitalisations since ${formatDate(higherHospitalisation.date, finalEntry.date)}(${higherHospitalisation.cases})`;
        }
    } else {
        hospitalisationsRecord = '\nNew record high hospitalisations';
    }

    if (lowerHospitalisations.length > 0) {
        let lowerHospitalisation = lowerHospitalisations[lowerHospitalisations.length - 1];
        let dateDifference = moment(finalEntry.date).diff(moment(lowerHospitalisation.date), 'days');
        if (dateDifference > 14) {
            hospitalisationsRecord = `\nLowest hospitalisations since ${formatDate(lowerHospitalisation.date, finalEntry.date)}(${lowerHospitalisation.cases})`;
        }
    } else {
        hospitalisationsRecord = '\nNew record low hospitalisations';
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

    if (higherDailyCases.length > 0) {
        let higherDailyCase = higherDailyCases[higherDailyCases.length - 1];
        let dateDifference = moment(finalEntry.date).diff(moment(higherDailyCase.date), 'days');
        if (dateDifference > 14) {
            dailyCasesRecord = `\nHighest daily cases since ${formatDate(higherDailyCase.date, finalEntry.date)}(${higherDailyCase.hospitalAcquired + higherDailyCase.admissions})`;
        }
    } else {
        dailyCasesRecord = '\nNew record high daily cases';
    }

    if (lowerDailyCases.length > 0) {
        let lowerDailyCase = lowerDailyCases[lowerDailyCases.length - 1];
        let dateDifference = moment(finalEntry.date).diff(moment(lowerDailyCase.date), 'days');
        if (dateDifference > 14) {
            dailyCasesRecord = `\nLowest daily cases since ${formatDate(lowerDailyCase.date, finalEntry.date)}(${lowerDailyCase.admissions + lowerDailyCase.hospitalAcquired})`;
        }
    } else {
        dailyCasesRecord = '\nNew record low daily cases';
    }

    const status = `🏥 Hospitalisations - ${moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM')}` +
        `\nHospitalised Cases: ${cases.data[cases.data.length - 1]}${finalEntry.difference.toString}` +
        hospitalisationsRecord +
        `\nNew Cases: ${admissions.data[admissions.data.length - 1] + hospitalAcquired.data[hospitalAcquired.data.length - 1]}` +
        dailyCasesRecord +
        `\nDischarges: ${discharges.data[discharges.data.length - 1] * -1}` +
        dischargesRecord;

    let configuration = generateConfiguration(0, "Hospitalisations");
    const chartJSNodeCanvas1 = new ChartJSNodeCanvas({
        width,
        height,
        chartCallback
    });
    chartJSNodeCanvas1.renderToBufferSync(configuration, "Hospitalisations");

    let ratio = runningTotalAxisMaximumValue / dailyCasesAxisMaximumValue;
    let newMinimumValue = dailyCasesAxisMinimumValue * ratio;
    configuration = generateConfiguration(newMinimumValue);

    const chartJSNodeCanvas2 = new ChartJSNodeCanvas({
        width,
        height,
        chartCallback
    });
    let chartBuffer = chartJSNodeCanvas2.renderToBufferSync(configuration);
    let tweet = constants.createTweet(status, '');
    let b64Content = writeChart(directory + '/hospitalisations-daily.png', chartBuffer);
    twitterHelper.tweetChart(b64Content, tweet, processHospitalisationsByDay);
}

function processHospitalisationsByDay(inReplyToId) {
    logger.info("Processing hospitalisations by day");
    initialise();
    let day = graphData[graphData.length - 1].date.getDay();
    let twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    graphData.filter(item => ((item.date > twoMonthsAgo) && (item.date.getDay() === day)))
        .forEach(function(value, index) {
          labels.push(value.date.toDateString());
          hospitalAcquired.data.push(value.hospitalAcquired);
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

    const status = '🏥 Hospitalisations: By day\nDate: Hospitalised(Diff with today | % diff)' +
        `\n${moment(graphData[graphData.length - 1].date).format('ddd, Do MMM')}: ${currentHospitalisations}` +
        `\n${moment(graphData[graphData.length - 8].date).format('ddd, Do MMM')}: ${lastWeeksHospitalisations}${lastWeeksHospitalisationChange.toString}` +
        `\n${moment(graphData[graphData.length - 15].date).format('ddd, Do MMM')}: ${previousWeeksHospitalisations}${previousWeeksHospitalisationChange.toString}` +
        `\n${moment(graphData[graphData.length - 22].date).format('ddd, Do MMM')}: ${threeWeeksHospitalisations}${threeWeeksHospitalisationChange.toString}`;

    logger.debug(`status: ${status.length} characters\n${status}`);
    // + '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=cases&dateSelection=lastTwoMonths&graphType=byWeekday&day=' + day + '&displayType=graph&trendLine=false';
    let configuration = generateConfiguration(0, "Hospitalisations - Day Comparison");
    const chartJSNodeCanvas1 = new ChartJSNodeCanvas({
        width,
        height,
        chartCallback
    });
    chartJSNodeCanvas1.renderToBufferSync(configuration, "Hospitalisations");

    let ratio = runningTotalAxisMaximumValue / dailyCasesAxisMaximumValue;
    let newMinimumValue = dailyCasesAxisMinimumValue * ratio;
    configuration = generateConfiguration(newMinimumValue);

    const chartJSNodeCanvas2 = new ChartJSNodeCanvas({
        width,
        height,
        chartCallback
    });
    let chartBuffer = chartJSNodeCanvas2.renderToBufferSync(configuration);
    let tweet = constants.createTweet(status, '');
    let b64Content = writeChart(directory + '/hospitalisations-byDay.png', chartBuffer);
    twitterHelper.tweetChart(b64Content, tweet, () => {}, inReplyToId);
}

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

const initialise = () => {
    labels = new Array();
    hospitalAcquired.data = new Array();
    admissions.data = new Array();
    discharges.data = new Array();
    cases.data = new Array();
}

const formatDate = (year1, year2) => {
  let format = (year1.getFullYear() === year2.getFullYear()) ? 'dddd, Do MMM' : 'ddd, Do MMM yyyy';
  return moment(year1).format(format);
};

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

const generateConfiguration = (runningTotalAxisMinimum) => {
	return {
	    type: "bar",
	    data: {
	      labels: labels,
	      datasets: [admissions, hospitalAcquired, discharges, cases]
	    },
	    options: {
	      title: {
	        text: "Daily Hospitalisations"
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

exports.processData = processData;
