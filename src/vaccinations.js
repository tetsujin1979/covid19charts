const moment = require('moment');
const Decimal = require('decimal.js');

const chartHelper = require("./chartHelper");
const constants = require("./constants");
const log4jsHelper = require('./log4jsHelper');
const twitterHelper = require("./twitterHelper");

const days = constants.days();
const directory = constants.directories().vaccinations;
const oneMonthAgo = constants.oneMonthAgo();

const graphData = new Array();
const records = new Array();

const logger = log4jsHelper.getLogger('vaccinations');

const population = 4977400;
const over16 = 3909392;
const over12 = 4189292;
const over5 = 4708907;

const eligiblePopulation = over5;

let dailyFirstDoseRecord = false;
let dailySecondDoseRecord = false;
let dailySingleDoseRecord = false;
let dailyBoosterRecord = false;
let dailyImmunocompromisedRecord = false;
let dailyTotalDosesRecord = false;

const firstDose = {
  label: "First Dose",
  data: [],
  backgroundColor: "rgba(237, 100, 127, 0.6)",
  borderColor: "rgba(233,0,45, 1)",
  borderWidth: 0,
  yAxisID: "DosesAxis",
  order: 2
};

const secondDose = {
  label: "Second Dose",
  data: [],
  backgroundColor: "rgba(63, 63, 191, 0.6)",
  borderColor: "rgba(14, 54, 201, 0.5)",
  borderWidth: 0,
  yAxisID: "DosesAxis",
  order: 2
};

const singleDose = {
  label: "Single Dose",
  data: [],
  backgroundColor: "rgba(150, 81, 159, 0.6)",
  borderColor: "rgba(14, 54, 201, 0.5)",
  borderWidth: 0,
  yAxisID: "DosesAxis",
  order: 2
};

const booster = {
  label: "Booster",
  data: [],
  backgroundColor: "rgba(0, 168, 168, 0.6)",
  borderColor: "rgba(0, 168, 168, 0.6)",
  borderWidth: 0,
  yAxisID: "DosesAxis",
  order: 2
};

const immunocompromised = {
  label: "Immunocompromised",
  property: 'immunocompromised',
  data: [],
  backgroundColor: "rgba(217, 211, 19, 0.6)",
  borderColor: "rgba(217, 211, 19, 0.6)",
  borderWidth: 0,
  yAxisID: "DosesAxis",
  order: 2
};

const eligiblePopulationTotalFirstDoses = {
  label: "Over 5s - 1st Dose",
  data: [],
  backgroundColor: "transparent",
  borderColor: "red",
  borderWidth: 4,
  yAxisID: "VaccinatedAxis",
  type: "line",
  order: 1
};

const eligiblePopulationTotalSecondDoses = {
  label: "Over 5s - 2nd Dose",
  data: [],
  backgroundColor: "transparent",
  borderColor: "green",
  borderWidth: 4,
  yAxisID: "VaccinatedAxis",
  type: "line",
  order: 1
};

const eligiblePopulationTotalSingleDoses = {
  label: "Over 5s - Single Dose",
  data: [],
  backgroundColor: "transparent",
  borderColor: "orange",
  borderWidth: 4,
  yAxisID: "VaccinatedAxis",
  type: "line",
  order: 1
};

const eligiblePopulationTotalBooster = {
  label: "Over 5s - Booster",
  data: [],
  backgroundColor: "transparent",
  borderColor: "cyan",
  borderWidth: 4,
  yAxisID: "VaccinatedAxis",
  type: "line",
  order: 1
};

const eligiblePopulationTotalImmunocompromised = {
  label: "Over 5s - Booster",
  data: [],
  backgroundColor: "transparent",
  borderColor: "yellow",
  borderWidth: 4,
  yAxisID: "VaccinatedAxis",
  type: "line",
  order: 1
};

function processData(covidData) {
  logger.info('Processing vaccinations');
  let vaccinations = [];
  let totalFirstDose = null;
  let totalSecondDose = null;
  let totalSingleDose = null;
  let totalBooster = null;
  let totalImmunocompromised = new Decimal(0);
  let eligiblePopulationFirstDosePercent = null;
  let eligiblePopulationSecondDosePercent = null;
  let eligiblePopulationSingleDosePercent = null;
  let eligiblePopulationBoosterPercent = new Decimal(0);
  let eligiblePopulationImmunocompromisedPercent = new Decimal(0);
  covidData.filter(item => (item.hasOwnProperty("firstDose") || item.hasOwnProperty("immunocompromised")))
           .forEach((item, index) => {
    let date = new Date(item.dateString);
    if (item.hasOwnProperty("firstDose")) {
      totalFirstDose = (totalFirstDose == null) ? new Decimal(item.firstDose) : (totalFirstDose.plus(new Decimal(item.firstDose)));
      eligiblePopulationFirstDosePercent = totalFirstDose.times(100).dividedBy(eligiblePopulation);
    }
    if (item.hasOwnProperty("secondDose")) {
      totalSecondDose =  (totalSecondDose == null) ? new Decimal(item.secondDose) : (totalSecondDose.plus(new Decimal(item.secondDose)));
      eligiblePopulationSecondDosePercent = totalSecondDose.times(100).dividedBy(eligiblePopulation);
    }
    if (item.hasOwnProperty("singleDose")) {
      totalSingleDose = (totalSingleDose == null) ? new Decimal(item.singleDose) : (totalSingleDose.plus(new Decimal(item.singleDose)));
      eligiblePopulationSingleDosePercent = totalSingleDose.times(100).dividedBy(eligiblePopulation);
    }
    if (item.hasOwnProperty("booster")) {
      totalBooster = (totalBooster == null) ? new Decimal(item.booster) : (totalBooster.plus(new Decimal(item.booster)));
      eligiblePopulationBoosterPercent = totalBooster.times(100).dividedBy(eligiblePopulation);
    }
    if (item.hasOwnProperty("immunocompromised")) {
      totalImmunocompromised = (totalImmunocompromised == null) ? new Decimal(item.totalImmunocompromised) : (totalImmunocompromised.plus(new Decimal(item.immunocompromised)));
      eligiblePopulationImmunocompromisedPercent = totalImmunocompromised.times(100).dividedBy(eligiblePopulation);
    }
    let totalDailyDoses = Decimal.sum((item.hasOwnProperty("firstDose") ? item.firstDose : 0), 
                                      (item.hasOwnProperty("secondDose") ? item.secondDose : 0), 
                                      (item.hasOwnProperty("singleDose") ? item.singleDose : 0), 
                                      (item.hasOwnProperty("booster") ? item.booster : 0), 
                                      (item.hasOwnProperty("immunocompromised") ? item.immunocompromised : 0));
    let vaccinatedData = {
      date: date,
      firstDose: new Decimal(item.hasOwnProperty("firstDose") ? item.firstDose : 0),
      secondDose: new Decimal(item.hasOwnProperty("secondDose") ? item.secondDose : 0),
      singleDose: new Decimal(item.hasOwnProperty("singleDose") ? item.singleDose : 0),
      booster: new Decimal(item.hasOwnProperty("booster") ? item.booster : 0),
      immunocompromised: new Decimal(item.hasOwnProperty("immunocompromised") ? item.immunocompromised : 0),
      totalDailyDoses: totalDailyDoses,
      totalFirstDose: totalFirstDose,
      totalSecondDose: totalSecondDose,
      totalSingleDose: totalSingleDose,
      totalBooster: totalBooster,
      totalImmunocompromised: totalImmunocompromised,
      eligiblePopulationTotalFirstDoses: eligiblePopulationFirstDosePercent,
      eligiblePopulationTotalSecondDoses: eligiblePopulationSecondDosePercent,
      eligiblePopulationTotalSingleDoses: eligiblePopulationSingleDosePercent,
      eligiblePopulationBooster: eligiblePopulationBoosterPercent,
      eligiblePopulationImmunocompromised: eligiblePopulationImmunocompromisedPercent
    };
    if (index > 7 && graphData.length > 7) {
      let today = graphData[graphData.length - 1];
      let yesterday = graphData[graphData.length - 2];
      let twoDaysAgo = graphData[graphData.length - 3];
      let threeDaysAgo = graphData[graphData.length - 4];
      let fourDaysAgo = graphData[graphData.length - 5];
      let fiveDaysAgo = graphData[graphData.length - 6];
      let sixDayAgo = graphData[graphData.length - 7];
      let sevenDayTotalFirstDoses = Decimal.sum(today.firstDose, yesterday.firstDose, twoDaysAgo.firstDose, threeDaysAgo.firstDose, fourDaysAgo.firstDose, fiveDaysAgo.firstDose, sixDayAgo.firstDose);
      let sevenDayTotalSecondDoses = Decimal.sum(today.secondDose, yesterday.secondDose, twoDaysAgo.secondDose, threeDaysAgo.secondDose, fourDaysAgo.secondDose, fiveDaysAgo.secondDose, sixDayAgo.secondDose);
      let sevenDayTotalSingleDoses = Decimal.sum(testUndefined(today.singleDose), testUndefined(yesterday.singleDose), testUndefined(twoDaysAgo.singleDose), testUndefined(threeDaysAgo.singleDose), testUndefined(fourDaysAgo.singleDose), testUndefined(fiveDaysAgo.singleDose), testUndefined(sixDayAgo.singleDose));
      let sevenDayTotalBooster = Decimal.sum(testUndefined(today.booster), testUndefined(yesterday.booster), testUndefined(twoDaysAgo.booster), testUndefined(threeDaysAgo.booster), testUndefined(fourDaysAgo.booster), testUndefined(fiveDaysAgo.booster), testUndefined(sixDayAgo.booster));
      let sevenDayTotalImmunocompromised = Decimal.sum(testUndefined(today.immunocompromised), testUndefined(yesterday.immunocompromised), testUndefined(twoDaysAgo.immunocompromised), testUndefined(threeDaysAgo.immunocompromised), testUndefined(fourDaysAgo.immunocompromised), testUndefined(fiveDaysAgo.immunocompromised), testUndefined(sixDayAgo.immunocompromised));
      vaccinatedData.sevenDayAverageFirstDose = sevenDayTotalFirstDoses.dividedBy(7);
      vaccinatedData.sevenDayAverageSecondDose = sevenDayTotalSecondDoses.dividedBy(7);
      vaccinatedData.sevenDayAverageSingleDose = sevenDayTotalSingleDoses.dividedBy(7);
      vaccinatedData.sevenDayAverageBooster = sevenDayTotalBooster.dividedBy(7);
      vaccinatedData.sevenDayAverageImmunocompromised = sevenDayTotalImmunocompromised.dividedBy(7);
      if (date.getDay() === 0) {
        vaccinatedData.weeklyFirstDoses = sevenDayTotalFirstDoses;
        vaccinatedData.weeklySecondDoses = sevenDayTotalSecondDoses;
        vaccinatedData.weeklySingleDoses = sevenDayTotalSingleDoses;
        vaccinatedData.weeklyBooster = sevenDayTotalBooster;
        vaccinatedData.weeklyImmunocompromised = sevenDayTotalImmunocompromised;
        vaccinatedData.weeklyTotalDoses = Decimal.sum(sevenDayTotalFirstDoses, sevenDayTotalSecondDoses, sevenDayTotalSingleDoses, sevenDayTotalBooster, sevenDayTotalImmunocompromised);
      }
    }
    graphData.push(vaccinatedData);
  });
  processNewVaccinations();
}

function processNewVaccinations() {
  logger.info('Processing daily vaccinations');
  initialise();
  const labels = new Array();
  graphData.filter(item => item.date > oneMonthAgo)
           .forEach(function(value, index) {
    labels.push(value.date.toDateString());
    firstDose.data.push(value.firstDose);
    secondDose.data.push(value.secondDose);
    singleDose.data.push(value.singleDose);
    booster.data.push(value.booster);
    immunocompromised.data.push(value.immunocompromised);
    eligiblePopulationTotalFirstDoses.data.push(value.totalFirstDose);
    eligiblePopulationTotalSecondDoses.data.push(value.totalSecondDose);
    eligiblePopulationTotalSingleDoses.data.push(value.totalSingleDose);
    eligiblePopulationTotalBooster.data.push(value.totalBooster);
    eligiblePopulationTotalImmunocompromised.data.push(value.totalImmunocompromised);
  });
  let finalEntry = graphData[graphData.length - 1];
  let dailyFirstDose = firstDose.data[firstDose.data.length - 1].toNumber().toLocaleString('en');
  let dailySecondDose = secondDose.data[secondDose.data.length - 1].toNumber().toLocaleString('en');
  let dailySingleDose = singleDose.data[singleDose.data.length - 1].toNumber().toLocaleString('en');
  let dailyBooster = booster.data[booster.data.length - 1].toNumber().toLocaleString('en');
  let dailyImmunocompromised = immunocompromised.data[immunocompromised.data.length - 1].toNumber().toLocaleString('en');
  let dailyTotalDoses = finalEntry.totalDailyDoses.toNumber().toLocaleString('en');

  let orderedByFirstDose = graphData.slice().sort(function(a, b) { return (b.firstDose.minus(a.firstDose).toNumber()); });
  // No need to tweet a new day record (e.g. first dose on Monday) if today was a new daily high for first doses
  if (orderedByFirstDose[0].firstDose.equals(finalEntry.firstDose)) {
    dailyFirstDoseRecord = true;
    let previousHighDate = moment(orderedByFirstDose[1].date).format('dddd, Do MMMM');
    let previousHighFirstDoses = orderedByFirstDose[1].firstDose.toNumber().toLocaleString('en');
    records.push(`???? Record First Dose - ${dailyFirstDose} - Previous high: ${previousHighDate}(${previousHighFirstDoses})`);
  }

  let orderedBySecondDose = graphData.slice().sort(function(a, b) { return (b.secondDose.minus(a.secondDose).toNumber()); });
  if (orderedBySecondDose[0].secondDose.equals(finalEntry.secondDose)) {
    dailySecondDoseRecord = true;
    let previousHighDate = moment(orderedBySecondDose[1].date).format('dddd, Do MMMM');
    let previousHighSecondDoses = orderedBySecondDose[1].secondDose.toNumber().toLocaleString('en');
    records.push(`???? Record Second Dose - ${dailySecondDose} - Previous high: ${previousHighDate}(${previousHighSecondDoses})`);
  }

  let orderedBySingleDose = graphData.slice().sort(function(a, b) { return (b.singleDose.minus(a.singleDose).toNumber()); });
  if (orderedBySingleDose[0].singleDose.equals(finalEntry.singleDose)) {
    dailySingleDoseRecord = true;
    let previousHighDate = moment(orderedBySingleDose[1].date).format('dddd, Do MMMM');
    let previousHighSingleDoses = orderedBySingleDose[1].singleDose.toNumber().toLocaleString('en');
    records.push(`???? Record Single Doses - ${dailySingleDose} - Previous high: ${previousHighDate}(${previousHighSingleDoses})`);
  }

  let orderedByBooster = graphData.slice().sort(function(a, b) { return (b.booster.minus(a.booster).toNumber()); });
  if (orderedByBooster[0].booster.equals(finalEntry.booster)) {
    dailyBooster = true;
    let previousHighDate = moment(orderedByBooster[1].date).format('dddd, Do MMMM');
    let previousHighBooster = orderedByBooster[1].booster.toNumber().toLocaleString('en');
    records.push(`???? Record Booster - ${dailyBooster} - Previous high: ${previousHighDate}(${previousHighBooster})`);
  }

  let orderedByImmunocompromised = graphData.slice().sort(function(a, b) { return (b.immunocompromised.minus(a.immunocompromised).toNumber()); });
  if (orderedByImmunocompromised[0].immunocompromised.equals(finalEntry.immunocompromised)) {
    dailyImmunocompromisedRecord = true;
    let previousHighDate = moment(orderedByImmunocompromised[1].date).format('dddd, Do MMMM');
    let previousHighImmunocompromised = orderedByImmunocompromised[1].immunocompromised.toNumber().toLocaleString('en');
    records.push(`???? Record Booster - ${dailyImmunocompromised} - Previous high: ${previousHighDate}(${previousHighImmunocompromised})`);
  }

  let orderedByTotalDose = graphData.slice().sort(function(a, b) { return (b.totalDailyDoses.minus(a.totalDailyDoses).toNumber()); });
  if (orderedByTotalDose[0].totalDailyDoses.equals(finalEntry.totalDailyDoses)) {
    dailyTotalDosesRecord = true;
    let previousHighDate = moment(orderedByTotalDose[1].date).format('dddd, Do MMMM');
    let previousHighTotalDoses = orderedByTotalDose[1].totalDailyDoses.toNumber().toLocaleString('en');
    records.push(`???? Record Total Doses - ${dailyTotalDoses} - Previous high: ${previousHighDate}(${previousHighTotalDoses})`);
  }

  let totalFirstDose = finalEntry.totalFirstDose.toNumber();
  let totalSecondDose = finalEntry.totalSecondDose.toNumber();
  let totalSingleDose = finalEntry.totalSingleDose.toNumber();
  let totalBooster = finalEntry.totalBooster.toNumber();
  let totalImmunocompromised = finalEntry.totalImmunocompromised.toNumber();
  let totalDoses = Decimal.sum(finalEntry.totalFirstDose, finalEntry.totalSecondDose, finalEntry.totalSingleDose, finalEntry.totalBooster, finalEntry.totalImmunocompromised).toNumber();

  let atLeastOneDose = Decimal.sum(finalEntry.totalFirstDose, finalEntry.totalSingleDose).toNumber();
  let atLeastOneDosePercentage = ((atLeastOneDose * 100) / eligiblePopulation);
  let totalVaccinated = finalEntry.totalSecondDose.plus(finalEntry.totalSingleDose).toNumber();
  let totalVaccinatedPercentage = finalEntry.eligiblePopulationTotalSecondDoses.plus(finalEntry.eligiblePopulationTotalSingleDoses);
  let totalBoosted = finalEntry.totalBooster.plus(finalEntry.totalImmunocompromised).toNumber();
  let totalBoostedPercentage = finalEntry.eligiblePopulationBooster.plus(finalEntry.eligiblePopulationImmunocompromised).toNumber();
  let status = '???? Vaccines' +
            `\n${moment(finalEntry.date).format('ddd, Do MMM')}` + 
            `\n1st: ${dailyFirstDose}` +
            `\n2nd: ${dailySecondDose}` +
            `\nSingle: ${dailySingleDose}` +
            `\nBooster: ${dailyBooster}` +
            `\nImmunocompromised: ${dailyImmunocompromised}` +
            `\nTotal: ${dailyTotalDoses}` +
            '\n' +
            `\nAt least one dose: ${(totalFirstDose + totalSingleDose).toLocaleString('en')}(${atLeastOneDosePercentage.toFixed(1)}% of 5+)` +
            `\nFully vaccinated: ${totalVaccinated.toLocaleString('en')}(${totalVaccinatedPercentage.toFixed(1)}% of 5+)` +
            `\nBoosted: ${totalBoosted.toLocaleString('en')}(${totalBoostedPercentage.toFixed(1)}% of 5+)`;

  let url = 'https://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=false';
  let tweet = constants.createTweet(status, url);
  let b64Content = new Array();
  let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, booster, immunocompromised, eligiblePopulationTotalFirstDoses, eligiblePopulationTotalSecondDoses, eligiblePopulationTotalSingleDoses, eligiblePopulationTotalBooster, eligiblePopulationTotalImmunocompromised, "Daily Vaccinations")
  b64Content.push(chartHelper.writeChart(directory + '/dailyVaccinations.png', configuration));
  configuration = generateDoughnutConfiguration(labels, finalEntry.eligiblePopulationTotalFirstDoses, finalEntry.eligiblePopulationTotalSecondDoses, finalEntry.eligiblePopulationTotalSingleDoses, finalEntry.eligiblePopulationBooster, finalEntry.eligiblePopulationImmunocompromised);
  b64Content.push(chartHelper.writeChart(directory + '/vaccinationProgress.png', configuration));
  twitterHelper.tweetChart(b64Content, tweet, processRollingSevenDayAverage);
}

function processVaccinationsByDay(lastTweetId) {
  logger.info('Processing vaccinations by day');
  initialise();
  const labels = new Array();
  let day = graphData[graphData.length - 1].date.getDay();
  graphData.filter(item => item.date > oneMonthAgo && item.date.getDay() == day)
           .forEach(function(value, index) {
    labels.push(value.date.toDateString());
    firstDose.data.push(value.firstDose);
    secondDose.data.push(value.secondDose);
    singleDose.data.push(value.singleDose);
    booster.data.push(value.booster);
    immunocompromised.data.push(value.immunocompromised);
    eligiblePopulationTotalFirstDoses.data.push(value.totalFirstDose);
    eligiblePopulationTotalSecondDoses.data.push(value.totalSecondDose);
    eligiblePopulationTotalSingleDoses.data.push(value.totalSingleDose);
    eligiblePopulationTotalBooster.data.push(value.totalBooster);
    eligiblePopulationTotalImmunocompromised.data.push(value.totalImmunocompromised);
  });

  let finalEntry = graphData[graphData.length - 1];
  let previousDay = moment(graphData[graphData.length - 8].date).format('ddd, Do MMM');
  let dailyFirstDose = constants.valueAndString(firstDose.data[firstDose.data.length - 1].toNumber());
  let dailySecondDose = constants.valueAndString(secondDose.data[secondDose.data.length - 1].toNumber());
  let dailySingleDose = constants.valueAndString(singleDose.data[singleDose.data.length - 1].toNumber());
  let dailyBooster = constants.valueAndString(booster.data[booster.data.length - 1].toNumber());
  let dailyImmunocompromised = constants.valueAndString(immunocompromised.data[immunocompromised.data.length - 1].toNumber());

  let previousFirstDose = constants.valueAndString(firstDose.data[firstDose.data.length - 2].toNumber());
  let previousSecondDose = constants.valueAndString(secondDose.data[secondDose.data.length - 2].toNumber());
  let previousSingleDose = constants.valueAndString(singleDose.data[singleDose.data.length - 2].toNumber());
  let previousBooster = constants.valueAndString(booster.data[booster.data.length - 2].toNumber());
  let previousImmunocompromised = constants.valueAndString(immunocompromised.data[immunocompromised.data.length - 2].toNumber());
  let previousTotalDailyDoses = constants.valueAndString(Decimal.sum(previousFirstDose.value, previousSecondDose.value, previousSingleDose.value, previousBooster.value, previousImmunocompromised.value));

  let totalFirstDose = constants.valueAndString(graphData[graphData.length - 1].totalFirstDose);
  let totalSecondDose = constants.valueAndString(graphData[graphData.length - 1].totalSecondDose);
  let totalDailyDoses = constants.valueAndString(graphData[graphData.length - 1].totalDailyDoses);

  let firstDoseChange = constants.difference(dailyFirstDose.value, previousFirstDose.value);
  let secondDoseChange = constants.difference(dailySecondDose.value, previousSecondDose.value);
  let singleDoseChange = constants.difference(dailySingleDose.value, previousSingleDose.value);
  let boosterChange = constants.difference(dailyBooster.value, previousBooster.value);
  let immunocompromisedChange = constants.difference(dailyImmunocompromised.value, previousImmunocompromised.value);
  let totalDosesChange = constants.difference(totalDailyDoses.value, previousTotalDailyDoses.value);

  let orderedByFirstDose = graphData.filter(item => item.date.getDay() == day)
                                    .slice()
                                    .sort(function(a, b) { return (b.firstDose - a.firstDose); });

  if (!dailyFirstDoseRecord && orderedByFirstDose[0].firstDose === finalEntry.firstDose) {
    let previousHighDate = moment(orderedByFirstDose[1].date).format('dddd, Do MMMM');
    let previousHighFirstDoses = Number(orderedByFirstDose[1].firstDose).toLocaleString('en');
    records.push(`???? Record First Doses adminstered on a ${days[day]}(${dailyFirstDose.string}) - Previous high: ${previousHighDate}(${previousHighFirstDoses})`);
  }

  let orderedBySecondDose = graphData.filter(item => item.date.getDay() == day)
                                     .slice()
                                     .sort(function(a, b) { return (b.secondDose - a.secondDose); });

  if (!dailySecondDoseRecord && orderedBySecondDose[0].secondDose === finalEntry.secondDose) {
    let previousHighDate = moment(orderedByFirstDose[1].date).format('dddd, Do MMMM');
    let previousHighSecondDoses = Number(orderedBySecondDose[1].secondDose).toLocaleString('en');
    records.push(`???? Record Second Doses adminstered on a ${days[day]}(${dailySecondDose.string}) - Previous high: ${previousHighDate}(${previousHighSecondDoses})`);
  }

  let orderedBySingleDose = graphData.filter(item => item.date.getDay() == day)
                                     .slice()
                                     .sort(function(a, b) { return (b.singleDose - a.singleDose); });

  if (!dailySingleDoseRecord && orderedBySingleDose[0].singleDose === finalEntry.singleDose) {
    let previousHighDate = moment(orderedBySingleDose[1].date).format('dddd, Do MMMM');
    let previousHighSingleDoses = Number(orderedBySingleDose[1].single).toLocaleString('en');
    records.push(`???? Record Single Doses adminstered on a ${days[day]}(${dailySingleDose.string}) - Previous high: ${previousHighDate}(${previousHighSingleDoses})`);
  }

  let orderedByBooster = graphData.filter(item => item.date.getDay() == day)
                                  .slice()
                                  .sort(function(a, b) { return (b.booster - a.booster); });

  if (!dailyBoosterRecord && orderedByBooster[0].booster === finalEntry.booster) {
    let previousHighDate = moment(orderedByBooster[1].date).format('dddd, Do MMMM');
    let previousHighBooster = Number(orderedByBooster[1].single).toLocaleString('en');
    records.push(`???? Record Booster Doses adminstered on a ${days[day]}(${dailyBooster.string}) - Previous high: ${previousHighDate}(${previousHighBooster})`);
  }

  let orderedByImmunocompromised = graphData.filter(item => item.date.getDay() == day)
                                            .slice()
                                            .sort(function(a, b) { return (b.immunocompromised - a.immunocompromised); });

  if (!dailyImmunocompromisedRecord && orderedByImmunocompromised[0].immunocompromised === finalEntry.immunocompromised) {
    let previousHighDate = moment(orderedByImmunocompromised[1].date).format('dddd, Do MMMM');
    let previousHighImmunocompromised = Number(orderedByImmunocompromised[1].single).toLocaleString('en');
    records.push(`???? Record Immunocompromised doses adminstered on a ${days[day]}(${dailyImmunocompromised.string}) - Previous high: ${previousHighDate}(${previousHighImmunocompromised})`);
  }

  let orderedByTotalDose = graphData.filter(item => item.date.getDay() == day)
                                    .slice()
                                    .sort(function(a, b) { return (b.totalDailyDoses - a.totalDailyDoses); });

  if (!dailyTotalDosesRecord && orderedByTotalDose[0].totalDailyDoses === finalEntry.totalDailyDoses) {
    let previousHighDate = moment(orderedByTotalDose[1].date).format('dddd, Do MMMM');
    let previousHighTotalDoses = Number(orderedByTotalDose[1].totalDailyDoses).toLocaleString('en');
    records.push(`???? Record Total Doses adminstered on a ${days[day]}(${totalDailyDoses.string}) - Previous high: ${previousHighDate}(${previousHighTotalDoses})`);
  }

  let status = '???? Vaccinations: By day' +
              `\n${previousDay}(Diff | % diff)` + 
              `\n1st: ${previousFirstDose.string}${firstDoseChange.toString}` +
              `\n2nd: ${previousSecondDose.string}${secondDoseChange.toString}` +
              `\nSingle: ${previousSingleDose.string}${singleDoseChange.toString}` +
              `\nBooster: ${previousBooster.string}${boosterChange.toString}` +
              `\nImmunocompromised: ${previousImmunocompromised.string}${immunocompromisedChange.toString}`;
            
  let url = 'https://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=byWeekday&day=' + day + '&displayType=graph&trendLine=false';
  let tweet = constants.createTweet(status, url);
  let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, booster, immunocompromised, eligiblePopulationTotalFirstDoses, eligiblePopulationTotalSecondDoses, eligiblePopulationTotalSingleDoses, eligiblePopulationTotalBooster, eligiblePopulationTotalImmunocompromised, "Vaccinations By Day - " + days[day]);
  let b64Content = chartHelper.writeChart(directory + '/byDay.png', configuration);
  twitterHelper.tweetChart(b64Content, tweet, processWeeklyVaccinations, lastTweetId);
}

function processRollingSevenDayAverage(inReplyToId) {
  logger.info('Processing rolling seven day average vaccinations');
  initialise();
  const labels = new Array();
  let finalEntry = graphData[graphData.length - 1];
  let initialTestsIndex = 0;
  let todayDay = finalEntry.date.getDay();
  for (let counter = 6; counter < 13; counter++) {
    if (graphData[counter].date.getDay() === todayDay) {
      initialTestsIndex = counter;
      break;
    }
  }
  for (let counter = initialTestsIndex; counter < graphData.length; counter ++) {
    let today = graphData[counter];
    if (today.date > oneMonthAgo) {
      labels.push('Seven days to ' + today.date.toDateString());
      firstDose.data.push(today.sevenDayAverageFirstDose);
      secondDose.data.push(today.sevenDayAverageSecondDose);
      singleDose.data.push(today.sevenDayAverageSingleDose);
      booster.data.push(today.sevenDayAverageBooster);
      immunocompromised.data.push(today.immunocompromised);
      eligiblePopulationTotalFirstDoses.data.push(today.totalFirstDose);
      eligiblePopulationTotalSecondDoses.data.push(today.totalSecondDose);
      eligiblePopulationTotalSingleDoses.data.push(today.totalSingleDose);
      eligiblePopulationTotalBooster.data.push(today.totalBooster);
      eligiblePopulationTotalImmunocompromised.data.push(today.totalImmunocompromised);
    }
  }
  let sevenDayAverageFirstDose = firstDose.data[firstDose.data.length - 1];
  let sevenDayAverageSecondDose = secondDose.data[firstDose.data.length - 1];
  let sevenDayAverageSingleDose = singleDose.data[singleDose.data.length - 1];
  let sevenDayAverageBooster = booster.data[singleDose.data.length - 1];
  let sevenDayAverageImmunocompromised = immunocompromised.data[singleDose.data.length - 1];
  let sevenDayAverageTotalDose = Decimal.sum(sevenDayAverageFirstDose, sevenDayAverageSecondDose, sevenDayAverageSingleDose, sevenDayAverageBooster, sevenDayAverageImmunocompromised);
  let firstDosesOver16Remaining = new Decimal(eligiblePopulation).minus(finalEntry.totalFirstDose.plus(finalEntry.totalSingleDose));
  let estimatedDaysToTotalFirstDose = firstDosesOver16Remaining.dividedBy(Decimal.sum(sevenDayAverageFirstDose, sevenDayAverageSingleDose)).ceil();
  let secondDosesAdministered = sevenDayAverageSecondDose.times(estimatedDaysToTotalFirstDose);
  let singleDosesAdministered = sevenDayAverageSingleDose.times(estimatedDaysToTotalFirstDose);
  let vaccinated = finalEntry.totalSecondDose.plus(finalEntry.totalSingleDose)
                                             .plus(secondDosesAdministered)
                                             .plus(singleDosesAdministered);

  let secondDosesOver16Remaining = new Decimal(eligiblePopulation).minus(vaccinated);
  let estimatedDaysToTotalSecondDose = secondDosesOver16Remaining.dividedBy(Decimal.sum(sevenDayAverageFirstDose, sevenDayAverageSecondDose, sevenDayAverageSingleDose)).ceil();

  let finalFirstDose = new Date();
  finalFirstDose.setDate(finalFirstDose.getDate() + estimatedDaysToTotalFirstDose.toNumber());

  let finalSecondDose = new Date(finalFirstDose.getTime());
  finalSecondDose.setDate(finalSecondDose.getDate() + estimatedDaysToTotalSecondDose.toNumber());

  const status = `???? Vaccinations: 7 day average` +
              `\n${moment(finalEntry.date).format('ddd, Do MMMM')}` + 
              `\n1st dose: ${sevenDayAverageFirstDose.toNumber().toLocaleString('en')}` + 
              `\n2nd dose: ${sevenDayAverageSecondDose.toNumber().toLocaleString('en')}` + 
              `\nSingle dose: ${sevenDayAverageSingleDose.toNumber().toLocaleString('en')}` +
              `\nBooster: ${sevenDayAverageBooster.toNumber().toLocaleString('en')}` +
              `\nImmunocompromised: ${sevenDayAverageImmunocompromised.toNumber().toLocaleString('en')}` +
              `\nTotal doses: ${sevenDayAverageTotalDose.toNumber().toLocaleString('en')}`;

  const url = `\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=rollingSevenDayAverage&displayType=graph&trendLine=false`;

  let tweet = constants.createTweet(status, url);
  let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, booster, immunocompromised, eligiblePopulationTotalFirstDoses, eligiblePopulationTotalSecondDoses, eligiblePopulationTotalSingleDoses, eligiblePopulationTotalBooster, eligiblePopulationTotalImmunocompromised, "Seven Day Average Vaccinations");
  let b64Content = chartHelper.writeChart(directory + '/processRollingSevenDayAverage.png', configuration);
  twitterHelper.tweetChart(b64Content, tweet, processVaccinationsByDay, inReplyToId);
}

function processWeeklyVaccinations(inReplyToId) {
  if (graphData[graphData.length - 1].date.getDay() === 0) {
    logger.info("Processing weekly totals");
    initialise();
    const labels = new Array();
    let weeklyData = graphData.filter(item => item.date > oneMonthAgo && item.date.getDay() === 0);
    weeklyData.forEach(function(value, index) { 
      labels.push('Week ending ' + value.date.toDateString());
      firstDose.data.push(value.weeklyFirstDoses);
      secondDose.data.push(value.weeklySecondDoses);
      singleDose.data.push(value.weeklySingleDoses);
      booster.data.push(value.weeklyBooster);
      immunocompromised.data.push(value.weeklyImmunocompromised);
      eligiblePopulationTotalFirstDoses.data.push(value.totalFirstDose);
      eligiblePopulationTotalSecondDoses.data.push(value.totalSecondDose);
      eligiblePopulationTotalSingleDoses.data.push(value.totalSingleDose);
      eligiblePopulationTotalBooster.data.push(value.totalBooster);
      eligiblePopulationTotalImmunocompromised.data.push(value.totalImmunocompromised);
    });
    let weeklyFirstDose = constants.valueAndString(firstDose.data[firstDose.data.length - 1]);
    let weeklySecondDose = constants.valueAndString(secondDose.data[secondDose.data.length - 1]);
    let weeklySingleDose = constants.valueAndString(singleDose.data[singleDose.data.length - 1]);
    let weeklyBooster = constants.valueAndString(booster.data[booster.data.length - 1]);
    let weeklyImmunocompromised = constants.valueAndString(immunocompromised.data[immunocompromised.data.length - 1]);
    let weeklyTotal = constants.valueAndString(weeklyData[weeklyData.length - 1].weeklyTotalDoses);

    let orderedByFirstDoses = graphData.slice().filter(item => item.date.getDay() === 0 && item.hasOwnProperty("weeklyFirstDoses")).sort(function(a, b) { return (b.weeklyFirstDoses.minus(a.weeklyFirstDoses).toNumber());  });
    if (orderedByFirstDoses[0].weeklyFirstDoses.equals(weeklyFirstDose.value)) {
      let previousHighFirstDoses = Number(orderedByFirstDoses[1].weeklyTotalDoses).toLocaleString('en');
      records.push(`???? Record Weekly First Doses adminstered - ${weeklyFirstDose.string} - Previous high: ${moment(orderedByFirstDoses[1].date).format('dddd, Do MMMM')}(${previousHighFirstDoses})`);
    }

    let orderedBySecondDoses = graphData.slice().filter(item => item.date.getDay() === 0 && item.hasOwnProperty("weeklySecondDoses")).sort(function(a, b) { return (b.weeklySecondDoses.minus(a.weeklySecondDoses).toNumber());  });
    if (orderedBySecondDoses[0].weeklySecondDoses.equals(weeklySecondDose.value)) {
      let previousHighSecondDoses = Number(orderedBySecondDoses[1].weeklySecondDoses).toLocaleString('en');
      records.push(`???? Record Weekly Second Doses adminstered - ${weeklySecondDose.string} - Previous high: ${moment(orderedBySecondDoses[1].date).format('dddd, Do MMMM')}(${previousHighSecondDoses})`);
    }

    let orderedBySingleDoses = graphData.slice().filter(item => item.date.getDay() === 0 && item.hasOwnProperty("weeklySingleDoses")).sort(function(a, b) { return (b.weeklySingleDoses.minus(a.weeklySingleDoses).toNumber());  });
    if (orderedBySingleDoses[0].weeklySecondDoses.equals(weeklySingleDose.value)) {
      let previousHighSingleDoses = Number(orderedBySingleDoses[1].weeklySingleDoses).toLocaleString('en');
      records.push(`???? Record Weekly Single Doses adminstered - ${weeklySingleDose.string} - Previous high: ${moment(orderedBySingleDoses[1].date).format('dddd, Do MMMM')}(${previousHighSingleDoses})`);
    }

    let orderedByBooster = graphData.slice().filter(item => item.date.getDay() === 0 && item.hasOwnProperty("weeklyBooster")).sort(function(a, b) { return (b.weeklyBooster.minus(a.weeklyBooster).toNumber());  });
    if (orderedByBooster[0].weeklyBooster.equals(weeklyBooster.value)) {
      let previousHighBooster = Number(orderedByBooster[1].weeklyBooster).toLocaleString('en');
      records.push(`???? Record Weekly Booster Doses adminstered - ${weeklyBooster.string} - Previous high: ${moment(orderedByBooster[1].date).format('dddd, Do MMMM')}(${previousHighBooster})`);
    }

    let orderedByImmunocompromised = graphData.slice().filter(item => item.date.getDay() === 0 && item.hasOwnProperty("weeklyImmunocompromised")).sort(function(a, b) { return (b.weeklyImmunocompromised.minus(a.weeklyImmunocompromised).toNumber());  });
    if (orderedByImmunocompromised[0].weeklyImmunocompromised.equals(weeklyImmunocompromised.value)) {
      let previousHighImmunocompromised = Number(orderedByImmunocompromised[1].weeklyBooster).toLocaleString('en');
      records.push(`???? Record Weekly Immunocompromised Doses adminstered - ${weeklyImmunocompromised.string} - Previous high: ${moment(orderedByImmunocompromised[1].date).format('dddd, Do MMMM')}(${previousHighImmunocompromised})`);
    }

    let orderedByTotalDoses = graphData.slice().filter(item => item.date.getDay() === 0 && item.hasOwnProperty("weeklyTotalDoses")).sort(function(a, b) { return (b.weeklyTotalDoses.minus(a.weeklyTotalDoses).toNumber());  });
    if (orderedByTotalDoses[0].weeklyTotalDoses.equals(weeklyTotal.value)) {
      let previousHighFirstDoses = Number(orderedByTotalDoses[1].weeklyTotalDoses).toLocaleString('en');
      records.push(`???? Record Weekly Total Doses adminstered - ${weeklyTotal.string} - Previous high: ${moment(orderedByTotalDoses[1].date).format('dddd, Do MMMM')}(${previousHighFirstDoses})`);
    }

    let previousWeeksFirstDose = constants.valueAndString(firstDose.data[firstDose.data.length - 2]);
    let previousWeeksSecondDose = constants.valueAndString(secondDose.data[secondDose.data.length - 2]);
    let previousWeeksSingleDose = constants.valueAndString(singleDose.data[singleDose.data.length - 2]);
    let previousWeeksBooster = constants.valueAndString(booster.data[singleDose.data.length - 2]);
    let previousWeeksTotal = constants.valueAndString(weeklyData[weeklyData.length - 2].weeklyTotalDoses);

    let firstDoseDifference = constants.difference(weeklyFirstDose.value.toNumber(), previousWeeksFirstDose.value.toNumber());
    let secondDoseDifference = constants.difference(weeklySecondDose.value.toNumber(), previousWeeksSecondDose.value.toNumber());
    let singleDoseDifference = constants.difference(weeklySingleDose.value.toNumber(), previousWeeksSingleDose.value.toNumber());
    let boosterDifference = constants.difference(weeklyBooster.value.toNumber(), previousWeeksBooster.value.toNumber());
    let totalDifference = constants.difference(weeklyTotal.value.toNumber(), previousWeeksTotal.value.toNumber());

    const status = '???? Vaccinations: Weekly totals' +
                  `\n${moment(weeklyData[weeklyData.length - 1].date).format('ddd, Do MMM')}` + 
                  `\n1st: ${weeklyFirstDose.string}` + 
                  `\n2nd: ${weeklySecondDose.string}` +
                  `\nSingle: ${weeklySingleDose.string}` +
                  `\nBooster: ${weeklyBooster.string}` +
                  `\nImmunocompromised: ${weeklyImmunocompromised.string}` +
                  `\nTotal: ${weeklyTotal.string}`;

    const url = '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=weeklyTotal&displayType=graph&trendLine=false';

    let tweet = constants.createTweet(status, url);
    let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, booster, immunocompromised, eligiblePopulationTotalFirstDoses, eligiblePopulationTotalSecondDoses, eligiblePopulationTotalSingleDoses, eligiblePopulationTotalBooster, eligiblePopulationTotalImmunocompromised, "Weekly Vaccination Totals");
    let b64Content = chartHelper.writeChart(directory + '/weeklyTotals.png', configuration);
    twitterHelper.tweetChart(b64Content, tweet, tweetRecords, inReplyToId);        

  } else {
    tweetRecords(inReplyToId);
  }
}

function generateConfiguration(labels, firstDose, secondDose, singleDose, booster, immunocompromised, over12TotalFirstDoses, over12TotalSecondDoses, over12TotalSingleDoses, over12TotalBooster, over12TotalImmunocompromised, title) {
  return {
    type: "bar",
    data: {
      labels: labels,
      datasets: [firstDose, secondDose, singleDose, booster, immunocompromised, over12TotalFirstDoses, over12TotalSecondDoses, over12TotalSingleDoses, over12TotalBooster, over12TotalImmunocompromised]
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
          id: "DosesAxis",
          stacked: true,
          position: "left",
          ticks: {
            beginAtZero: true,
            min: 0
          },
          scaleLabel: {
            display: true,
            labelString: "Total Vaccinated"
          }
        }, {
          id: "VaccinatedAxis",
          position: "right",
          ticks: {
            beginAtZero: true,
            min: 0
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

function generateDoughnutConfiguration(labels, firstDosePercentage, secondDosePercentage, singleDosePercentage, boosterPercentage, immunocompromisedPercentage) {
  return {
    type: "doughnut",
    data: {
      labels: ["Single Dose", "First Dose", "Second Dose", "Booster", "Immunocompromised"],
      datasets: [{
        label: 'First Dose label',
        data: [singleDosePercentage, firstDosePercentage, (100 - (firstDosePercentage.plus(singleDosePercentage).toNumber()))],
        backgroundColor: ['rgba(150, 81, 159, 0.6)', 'rgba(237, 100, 127, .6)', 'rgba(228, 233, 237, 1)'],
        color: 'black',
        borderWidth: 1
      }, {
        label: 'Second Dose label',
        data: [singleDosePercentage, secondDosePercentage, (100 - (secondDosePercentage.plus(singleDosePercentage).toNumber()))],
        backgroundColor: ['rgba(150, 81, 159, 0.6)', 'rgba(63, 63, 191, 0.6)', 'rgba(228, 233, 237, 1)'],
        color: 'yellow',
        borderWidth: 1
      }, {
        label: 'Booster label',
        data: [immunocompromisedPercentage, boosterPercentage, (100 - boosterPercentage.plus(immunocompromisedPercentage).toNumber())],
        backgroundColor: ['rgba(217, 211, 19, 0.6)', 'rgba(0, 168, 168, 0.6)', 'rgba(228, 233, 237, 1)'],
        color: 'blue',
        borderWidth: 1
      }]
    },
    options: {
      aspectRatio: 1,
      title: {
        text: "Vaccination Progress"
      }      
    }
  };
}

function initialise() {
  firstDose.data = new Array();
  secondDose.data = new Array();
  singleDose.data = new Array();
  booster.data = new Array();
  immunocompromised.data = new Array();
  eligiblePopulationTotalFirstDoses.data = new Array();
  eligiblePopulationTotalSecondDoses.data = new Array();
  eligiblePopulationTotalFirstDoses.data = new Array();
  eligiblePopulationTotalBooster.data = new Array();
  eligiblePopulationTotalImmunocompromised.data = new Array();
}

function testUndefined(value) {
  let retVal = value;
  if (!value) {
    retVal = 0;
  }
  return retVal;
}

function tweetRecords(inReplyToId) {
  logger.debug(`tweetRecords\trecords: ${records}\tinReplyToId: ${inReplyToId}`);
  twitterHelper.tweetRecords(records, inReplyToId);
}

exports.processData = processData;
