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
const over16 = 3749001;

let dailyFirstDoseRecord = false;
let dailySecondDoseRecord = false;
let dailySingleDoseRecord = false;
let dailyTotalDosesRecord = false;

const firstDose = {
  label: "First Dose",
  data: [],
  backgroundColor: "rgba(237, 100, 127, 0.6)",
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

const singleDose = {
  label: "Single Dose",
  data: [],
  backgroundColor: "rgba(150, 81, 159, 0.6)",
  borderColor: "rgba(14, 54, 201, 0.5)",
  borderWidth: 0,
  yAxisID: "DosesAxis"
};

const over16TotalFirstDoses = {
  label: "Over 16s - 1st Dose",
  data: [],
  backgroundColor: "transparent",
  borderColor: "red",
  borderWidth: 4,
  yAxisID: "VaccinatedAxis",
  type: "line"
};

const over16TotalSecondDoses = {
  label: "Over 16s - 2nd Dose",
  data: [],
  backgroundColor: "transparent",
  borderColor: "green",
  borderWidth: 4,
  yAxisID: "VaccinatedAxis",
  type: "line"
};

const over16TotalSingleDoses = {
  label: "Over 16s - Single Dose",
  data: [],
  backgroundColor: "transparent",
  borderColor: "orange",
  borderWidth: 4,
  yAxisID: "VaccinatedAxis",
  type: "line"
};

function processData(covidData) {
  logger.info('Processing vaccinations');
  let vaccinations = [];
  let totalFirstDose = null;
  let totalSecondDose = null;
  let totalSingleDose = null;
  covidData.filter(item => (item.hasOwnProperty("dateString") && item.hasOwnProperty("firstDose")))
           .forEach(function(item, index) {
    let date = new Date(item.dateString);
    totalFirstDose = (totalFirstDose == null) ? new Decimal(item.firstDose) : (totalFirstDose.plus(new Decimal(item.firstDose)));
    let over16FirstDosePercent = totalFirstDose.times(100).dividedBy(over16);
    let over16SecondDosePercent = null;
    let over16SingleDosePercent = null;
    if (item.hasOwnProperty("secondDose")) {
      totalSecondDose =  (totalSecondDose == null) ? new Decimal(item.secondDose) : (totalSecondDose.plus(new Decimal(item.secondDose)));
      over16SecondDosePercent = totalSecondDose.times(100).dividedBy(over16);
    }
    if (item.hasOwnProperty("singleDose")) {
      totalSingleDose = (totalSingleDose == null) ? new Decimal(item.singleDose) : (totalSingleDose.plus(new Decimal(item.singleDose)));
      over16SingleDosePercent = totalSingleDose.times(100).dividedBy(over16);
    }
    let totalDailyDoses = Decimal.sum(item.firstDose, (item.hasOwnProperty("secondDose") ? item.secondDose : 0), (item.hasOwnProperty("singleDose") ? item.singleDose : 0));
    let vaccinatedData = {
      date: date,
      firstDose: new Decimal(item.firstDose),
      secondDose: new Decimal(item.hasOwnProperty("secondDose") ? item.secondDose : 0),
      singleDose: new Decimal(item.hasOwnProperty("singleDose") ? item.singleDose : 0),
      totalDailyDoses: totalDailyDoses,
      totalFirstDose: totalFirstDose,
      totalSecondDose: totalSecondDose,
      totalSingleDose: totalSingleDose,
      over16TotalFirstDoses: over16FirstDosePercent,
      over16TotalSecondDoses: over16SecondDosePercent,
      over16TotalSingleDoses: over16SingleDosePercent
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
      vaccinatedData.sevenDayAverageFirstDose = sevenDayTotalFirstDoses.dividedBy(7);
      vaccinatedData.sevenDayAverageSecondDose = sevenDayTotalSecondDoses.dividedBy(7);
      vaccinatedData.sevenDayAverageSingleDose = sevenDayTotalSingleDoses.dividedBy(7);
      if (date.getDay() === 0) {
        vaccinatedData.weeklyFirstDoses = sevenDayTotalFirstDoses;
        vaccinatedData.weeklySecondDoses = sevenDayTotalSecondDoses;
        vaccinatedData.weeklySingleDoses = sevenDayTotalSingleDoses;
        vaccinatedData.weeklyTotalDoses = Decimal.sum(sevenDayTotalFirstDoses, sevenDayTotalSecondDoses, sevenDayTotalSingleDoses);
      }

    }
    graphData.push(vaccinatedData);
  });
  header = '📅 ' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM YYYY');
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
    over16TotalFirstDoses.data.push(value.totalFirstDose);
    over16TotalSecondDoses.data.push(value.totalSecondDose);
    over16TotalSingleDoses.data.push(value.totalSingleDose);
  });
  let finalEntry = graphData[graphData.length - 1];
  let dailyFirstDose = firstDose.data[firstDose.data.length - 1].toNumber().toLocaleString('en');
  let dailySecondDose = secondDose.data[secondDose.data.length - 1].toNumber().toLocaleString('en');
  let dailySingleDose = singleDose.data[singleDose.data.length - 1].toNumber().toLocaleString('en');
  let dailyTotalDoses = finalEntry.totalDailyDoses.toNumber().toLocaleString('en');

  let orderedByFirstDose = graphData.slice().sort(function(a, b) { return (b.firstDose.minus(a.firstDose).toNumber()); });
  // No need to tweet a new day record (e.g. first dose on Monday) if today was a new daily high for first doses
  if (orderedByFirstDose[0].firstDose.equals(finalEntry.firstDose)) {
    dailyFirstDoseRecord = true;
    let previousHighDate = moment(orderedByFirstDose[1].date).format('dddd, Do MMMM');
    let previousHighFirstDoses = orderedByFirstDose[1].firstDose.toNumber().toLocaleString('en');
    records.push(`🥇 Record First Dose - ${dailyFirstDose} - Previous high: ${previousHighDate}(${previousHighFirstDoses})`);
  }

  let orderedBySecondDose = graphData.slice().sort(function(a, b) { return (b.secondDose.minus(a.secondDose).toNumber()); });
  if (orderedBySecondDose[0].secondDose.equals(finalEntry.secondDose)) {
    dailySecondDoseRecord = true;
    let previousHighDate = moment(orderedBySecondDose[1].date).format('dddd, Do MMMM');
    let previousHighSecondDoses = orderedBySecondDose[1].secondDose.toNumber().toLocaleString('en');
    records.push(`🥇 Record Second Dose - ${dailySecondDose} - Previous high: ${previousHighDate}(${previousHighSecondDoses})`);
  }

  let orderedBySingleDose = graphData.slice().sort(function(a, b) { return (b.singleDose.minus(a.singleDose).toNumber()); });
  if (orderedBySingleDose[0].singleDose.equals(finalEntry.singleDose)) {
    dailySingleDoseRecord = true;
    let previousHighDate = moment(orderedBySingleDose[1].date).format('dddd, Do MMMM');
    let previousHighSingleDoses = orderedBySingleDose[1].singleDose.toNumber().toLocaleString('en');
    records.push(`🥇 Record Single Doses - ${dailySingleDose} - Previous high: ${previousHighDate}(${previousHighSingleDoses})`);
  }

  let orderedByTotalDose = graphData.slice().sort(function(a, b) { return (b.totalDailyDoses.minus(a.totalDailyDoses).toNumber()); });
  if (orderedByTotalDose[0].totalDailyDoses.equals(finalEntry.totalDailyDoses)) {
    dailyTotalDosesRecord = true;
    let previousHighDate = moment(orderedByTotalDose[1].date).format('dddd, Do MMMM');
    let previousHighTotalDoses = orderedByTotalDose[1].totalDailyDoses.toNumber().toLocaleString('en');
    records.push(`🥇 Record Total Doses - ${dailyTotalDoses} - Previous high: ${previousHighDate}(${previousHighTotalDoses})`);
  }

  let totalFirstDose = finalEntry.totalFirstDose.toNumber().toLocaleString('en');
  let totalSecondDose = finalEntry.totalSecondDose.toNumber().toLocaleString('en');
  let totalSingleDose = finalEntry.totalSingleDose.toNumber().toLocaleString('en');
  let totalDoses = Decimal.sum(finalEntry.totalFirstDose, finalEntry.totalSecondDose, finalEntry.totalSingleDose);
  let totalVaccinated = finalEntry.totalSecondDose.plus(finalEntry.totalSingleDose).toNumber().toLocaleString('en');
  let totalVaccinatedPercentage = finalEntry.over16TotalSecondDoses.plus(finalEntry.over16TotalSingleDoses);
  let status = '💉 Vaccinations' +
            '\n' + moment(finalEntry.date).format('dddd, Do MMMM') + 
            `\n1st dose: ${dailyFirstDose}` +
            `\n2nd dose: ${dailySecondDose}` +
            `\nSingle dose: ${dailySingleDose}` +
            `\nTotal: ${dailyTotalDoses}` +
            '\n' +
            '\nTotals' +
            `\n1st dose: ${totalFirstDose}(${finalEntry.over16TotalFirstDoses.toFixed(2)}% of 16+)` +
            `\nVaccinated(2nd + single doses): ${totalVaccinated}(${totalSecondDose} + ${totalSingleDose})(${totalVaccinatedPercentage.toFixed(2)}% of 16+)`;

  let url = 'https://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=false';
  let tweet = constants.createTweet(status, url);
  let b64Content = new Array();
  let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, over16TotalFirstDoses, over16TotalSecondDoses, over16TotalSingleDoses, "Daily Vaccinations");
  b64Content.push(chartHelper.writeChart(directory + '/dailyVaccinations.png', configuration));
  configuration = generateDoughnutConfiguration(labels, finalEntry.over16TotalFirstDoses, finalEntry.over16TotalSecondDoses, finalEntry.over16TotalSingleDoses);
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
    over16TotalFirstDoses.data.push(value.totalFirstDose);
    over16TotalSecondDoses.data.push(value.totalSecondDose);
    over16TotalSingleDoses.data.push(value.totalSingleDose);
  });
  let finalEntry = graphData[graphData.length - 1];
  let previousDay = moment(graphData[graphData.length - 8].date).format('ddd, Do MMMM');
  let dailyFirstDose = constants.valueAndString(firstDose.data[firstDose.data.length - 1].toNumber());
  let dailySecondDose = constants.valueAndString(secondDose.data[secondDose.data.length - 1].toNumber());
  let dailySingleDose = constants.valueAndString(singleDose.data[singleDose.data.length - 1].toNumber());

  let previousFirstDose = constants.valueAndString(firstDose.data[firstDose.data.length - 2].toNumber());
  let previousSecondDose = constants.valueAndString(secondDose.data[secondDose.data.length - 2].toNumber());
  let previousSingleDose = constants.valueAndString(singleDose.data[singleDose.data.length - 2].toNumber());
  let previousTotalDailyDoses = constants.valueAndString(Decimal.sum(previousFirstDose.value, previousSecondDose.value, previousSingleDose.value));

  let totalFirstDose = constants.valueAndString(graphData[graphData.length - 1].totalFirstDose);
  let totalSecondDose = constants.valueAndString(graphData[graphData.length - 1].totalSecondDose);
  let totalDailyDoses = constants.valueAndString(graphData[graphData.length - 1].totalDailyDoses);

  let firstDoseChange = constants.difference(dailyFirstDose.value, previousFirstDose.value);
  let secondDoseChange = constants.difference(dailySecondDose.value, previousSecondDose.value);
  let singleDoseChange = constants.difference(dailySingleDose.value, previousSingleDose.value);
  let totalDosesChange = constants.difference(totalDailyDoses.value, previousTotalDailyDoses.value);

  let orderedByFirstDose = graphData.filter(item => item.date.getDay() == day)
                                    .slice()
                                    .sort(function(a, b) { return (b.firstDose - a.firstDose); });

  if (!dailyFirstDoseRecord && orderedByFirstDose[0].firstDose === finalEntry.firstDose) {
    let previousHighDate = moment(orderedByFirstDose[1].date).format('dddd, Do MMMM');
    let previousHighFirstDoses = Number(orderedByFirstDose[1].firstDose).toLocaleString('en');
    records.push(`🥇 Record First Doses adminstered on a ${days[day]}(${dailyFirstDose.string}) - Previous high: ${previousHighDate}(${previousHighFirstDoses})`);
  }

  let orderedBySecondDose = graphData.filter(item => item.date.getDay() == day)
                                     .slice()
                                     .sort(function(a, b) { return (b.secondDose - a.secondDose); });

  if (!dailySecondDoseRecord && orderedBySecondDose[0].secondDose === finalEntry.secondDose) {
    let previousHighDate = moment(orderedByFirstDose[1].date).format('dddd, Do MMMM');
    let previousHighSecondDoses = Number(orderedBySecondDose[1].secondDose).toLocaleString('en');
    records.push(`🥇 Record Second Doses adminstered on a ${days[day]}(${dailySecondDose.string}) - Previous high: ${previousHighDate}(${previousHighSecondDoses})`);
  }

  let orderedByTotalDose = graphData.filter(item => item.date.getDay() == day)
                                    .slice()
                                    .sort(function(a, b) { return (b.totalDailyDoses - a.totalDailyDoses); });

  if (!dailyTotalDosesRecord && orderedByTotalDose[0].totalDailyDoses === finalEntry.totalDailyDoses) {
    let previousHighDate = moment(orderedByTotalDose[1].date).format('dddd, Do MMMM');
    let previousHighTotalDoses = Number(orderedByTotalDose[1].totalDailyDoses).toLocaleString('en');
    records.push(`🥇 Record Total Doses adminstered on a ${days[day]}(${totalDailyDoses.string}) - Previous high: ${previousHighDate}(${previousHighTotalDoses})`);
  }

  let status = '💉 Vaccinations: By day' +
              `\nDoses: ${moment(graphData[graphData.length - 1].date).format('ddd, Do MMMM')}` + 
              `\n1st: ${dailyFirstDose.string}` +
              `\n2nd: ${dailySecondDose.string}` + 
              `\nSingle: ${dailySingleDose.string}` +
              `\nTotal: ${totalDailyDoses.string}` + 
              '\n' + 
              '\nDoses ${previousDay}(Diff | % diff)' + 
              `\n1st: ${previousFirstDose.string}${firstDoseChange.toString}` +
              `\n2nd: ${previousSecondDose.string}${secondDoseChange.toString}` +
              `\nSingle: ${previousSingleDose.string}${singleDoseChange.toString}` +
              `\nTotal: ${previousTotalDailyDoses.string}${totalDosesChange.toString}`;
            
  let url = 'https://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=byWeekday&day=' + day + '&displayType=graph&trendLine=false';
  let tweet = constants.createTweet(status, url);
  let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, over16TotalFirstDoses, over16TotalSecondDoses, over16TotalSingleDoses, "Vaccinations By Day - " + days[day]);
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
      over16TotalFirstDoses.data.push(today.totalFirstDose);
      over16TotalSecondDoses.data.push(today.totalSecondDose);
      over16TotalSingleDoses.data.push(today.totalSingleDose);
    }
  }
  let sevenDayAverageFirstDose = firstDose.data[firstDose.data.length - 1];
  let sevenDayAverageSecondDose = secondDose.data[firstDose.data.length - 1];
  let sevenDayAverageSingleDose = singleDose.data[singleDose.data.length - 1];
  let sevenDayAverageTotalDose = Decimal.sum(sevenDayAverageFirstDose, sevenDayAverageSecondDose, sevenDayAverageSingleDose);
  let firstDosesOver16Remaining = new Decimal(over16).minus(finalEntry.totalFirstDose.plus(finalEntry.totalSingleDose));
  let estimatedDaysToTotalFirstDose = firstDosesOver16Remaining.dividedBy(Decimal.sum(sevenDayAverageFirstDose, sevenDayAverageSingleDose)).ceil();
  let secondDosesAdministered = sevenDayAverageSecondDose.times(estimatedDaysToTotalFirstDose);
  let singleDosesAdministered = sevenDayAverageSingleDose.times(estimatedDaysToTotalFirstDose);
  let vaccinated = finalEntry.totalSecondDose.plus(finalEntry.totalSingleDose)
                                             .plus(secondDosesAdministered)
                                             .plus(singleDosesAdministered);

  let secondDosesOver16Remaining = new Decimal(over16).minus(vaccinated);
  let estimatedDaysToTotalSecondDose = secondDosesOver16Remaining.dividedBy(Decimal.sum(sevenDayAverageFirstDose, sevenDayAverageSecondDose, sevenDayAverageSingleDose)).ceil();

  let finalFirstDose = new Date();
  finalFirstDose.setDate(finalFirstDose.getDate() + estimatedDaysToTotalFirstDose.toNumber());

  let finalSecondDose = new Date(finalFirstDose.getTime());
  finalSecondDose.setDate(finalSecondDose.getDate() + estimatedDaysToTotalSecondDose.toNumber());

  const status = `💉 Vaccinations: 7 day average` +
              `\n${moment(finalEntry.date).format('ddd, Do MMMM')}` + 
              `\n1st dose: ${sevenDayAverageFirstDose.toNumber().toLocaleString('en')}` + 
              `\n2nd dose: ${sevenDayAverageSecondDose.toNumber().toLocaleString('en')}` + 
              `\nSingle dose: ${sevenDayAverageSingleDose.toNumber().toLocaleString('en')}` +
              `\nTotal doses: ${sevenDayAverageTotalDose.toNumber().toLocaleString('en')}` +
              `\n` +
              `\nEstimated final vaccinations` +
              `\n1st dose: ${moment(finalFirstDose).format('ddd, Do MMM')}(${estimatedDaysToTotalFirstDose} days)` +
              `\nVaccinated: ${moment(finalSecondDose).format('ddd, Do MMM')}(${estimatedDaysToTotalFirstDose.plus(estimatedDaysToTotalSecondDose)} days)`;

  const url = `\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=rollingSevenDayAverage&displayType=graph&trendLine=false`;

  let tweet = constants.createTweet(status, url);
  let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, over16TotalFirstDoses, over16TotalSecondDoses, over16TotalSingleDoses, "Seven Day Average Vaccinations");
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
      over16TotalFirstDoses.data.push(value.totalFirstDose);
      over16TotalSecondDoses.data.push(value.totalSecondDose);
      over16TotalSingleDoses.data.push(value.totalSingleDose);
    });
    let weeklyFirstDose = constants.valueAndString(firstDose.data[firstDose.data.length - 1]);
    let weeklySecondDose = constants.valueAndString(secondDose.data[secondDose.data.length - 1]);
    let weeklySingleDose = constants.valueAndString(singleDose.data[singleDose.data.length - 1]);
    let weeklyTotal = constants.valueAndString(weeklyData[weeklyData.length - 1].weeklyTotalDoses);

    let orderedByFirstDoses = weeklyData.slice().filter(item => item.date.getDay() === 0).sort(function(a, b) { return (b.weeklyFirstDoses.minus(a.weeklyFirstDoses).toNumber());  });
    if (orderedByFirstDoses[0].weeklyFirstDoses.equals(weeklyFirstDose.value)) {
      let previousHighFirstDoses = Number(orderedByFirstDoses[1].weeklyTotalDoses).toLocaleString('en');
      records.push(`🥇 Record Weekly First Doses adminstered - ${weeklyFirstDose.string} - Previous high: ${moment(orderedByFirstDoses[1].date).format('dddd, Do MMMM')}(${previousHighFirstDoses})`);
    }

    let orderedBySecondDoses = weeklyData.slice().filter(item => item.date.getDay() === 0).sort(function(a, b) { return (b.weeklySecondDoses.minus(a.weeklySecondDoses).toNumber());  });
    if (orderedBySecondDoses[0].weeklySecondDoses.equals(weeklySecondDose.value)) {
      let previousHighSecondDoses = Number(orderedBySecondDoses[1].weeklySecondDoses).toLocaleString('en');
      records.push(`🥇 Record Weekly Second Doses adminstered - ${weeklySecondDose.string} - Previous high: ${moment(orderedBySecondDoses[1].date).format('dddd, Do MMMM')}(${previousHighSecondDoses})`);
    }

    let orderedBySingleDoses = weeklyData.slice().filter(item => item.date.getDay() === 0).sort(function(a, b) { return (b.weeklySingleDoses.minus(a.weeklySingleDoses).toNumber());  });
    if (orderedBySingleDoses[0].weeklySecondDoses.equals(weeklySingleDose.value)) {
      let previousHighSingleDoses = Number(orderedBySingleDoses[1].weeklySingleDoses).toLocaleString('en');
      records.push(`🥇 Record Weekly Single Doses adminstered - ${weeklySingleDose.string} - Previous high: ${moment(orderedBySingleDoses[1].date).format('dddd, Do MMMM')}(${previousHighSingleDoses})`);
    }

    let orderedByTotalDoses = weeklyData.slice().filter(item => item.date.getDay() === 0).sort(function(a, b) { return (b.weeklyTotalDoses.minus(a.weeklyTotalDoses).toNumber());  });
    if (orderedByTotalDoses[0].weeklyTotalDoses.equals(weeklyTotal.value)) {
      let previousHighFirstDoses = Number(orderedByTotalDoses[1].weeklyTotalDoses).toLocaleString('en');
      records.push(`🥇 Record Weekly Total Doses adminstered - ${weeklyTotal.string} - Previous high: ${moment(orderedByTotalDoses[1].date).format('dddd, Do MMMM')}(${previousHighFirstDoses})`);
    }

    let previousWeeksFirstDose = constants.valueAndString(firstDose.data[firstDose.data.length - 2]);
    let previousWeeksSecondDose = constants.valueAndString(secondDose.data[secondDose.data.length - 2]);
    let previousWeeksSingleDose = constants.valueAndString(singleDose.data[singleDose.data.length - 2]);
    let previousWeeksTotal = constants.valueAndString(weeklyData[weeklyData.length - 2].weeklyTotalDoses);

    let firstDoseDifference = constants.difference(weeklyFirstDose.value, previousWeeksFirstDose.value);
    let secondDoseDifference = constants.difference(weeklySecondDose.value, previousWeeksSecondDose.value);
    let singleDoseDifference = constants.difference(weeklySingleDose.value, previousWeeksSingleDose.value);
    let totalDifference = constants.difference(weeklyTotal.value, previousWeeksTotal.value);

    const status = '💉 Vaccinations: Weekly dosage totals' +
                  `\n${moment(weeklyData[weeklyData.length - 1].date).format('ddd, Do MMM')}` + 
                  `\n1st: ${weeklyFirstDose.string}` + 
                  `\n2nd: ${weeklySecondDose.string}` +
                  (weeklySingleDose.value > 0 ? `\nSingle: ${weeklySingleDose.string}` : '') +
                  `\nTotal: ${weeklyTotal.string}` +  
                  '\n' +
                  `\n${moment(weeklyData[weeklyData.length - 2].date).format('ddd, Do MMM')}(Diff | % Diff)` + 
                  `\n1st: ${previousWeeksFirstDose.string}${firstDoseDifference.toString}` +
                  `\n2nd: ${previousWeeksSecondDose.string}${secondDoseDifference.toString}` +
                  (previousWeeksSingleDose.value > 0 ? `\nSingle: ${previousWeeksSingleDose.string}${singleDoseDifference.toString}` : '') +
                  `\nTotal: ${previousWeeksTotal.string}${totalDifference.toString}`;

    const url = '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=weeklyTotal&displayType=graph&trendLine=false';

    let tweet = constants.createTweet(status, url);
    let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, over16TotalFirstDoses, over16TotalSecondDoses, over16TotalSingleDoses, "Weekly Vaccination Totals");
    over16TotalSingleDoses
    let b64Content = chartHelper.writeChart(directory + '/weeklyTotals.png', configuration);
    twitterHelper.tweetChart(b64Content, tweet, tweetRecords, inReplyToId);        

  } else {
    tweetRecords(inReplyToId);
  }
}

function generateConfiguration(labels, firstDose, secondDose, singleDose, over16TotalFirstDoses, over16TotalSecondDoses, over16TotalSingleDoses, title) {
  return {
    type: "bar",
    data: {
      labels: labels,
      datasets: [firstDose, secondDose, singleDose, over16TotalFirstDoses, over16TotalSecondDoses, over16TotalSingleDoses]
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

function generateDoughnutConfiguration(labels, firstDosePercentage, secondDosePercentage, singleDosePercentage) {
  return {
    type: "doughnut",
    data: {
      labels: ["Single Dose", "First Dose", "Second Dose"],
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
  over16TotalFirstDoses.data = new Array();
  over16TotalSecondDoses.data = new Array();
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
