const fs = require('fs');
const moment = require('moment');
const log4js = require("log4js");

const chartHelper = require("./chartHelper");
const twitterHelper = require("./twitterHelper");
const constants = require("./constants");

const days = constants.days;

const newRecord = '(🥇 New Record!)';

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('vaccinations');

const hashtag = constants.hashtag;

const population = 4977400;
const over16 = 3749001;

const graphData = new Array();
const oneMonthAgo = constants.oneMonthAgo;

let labels = "";
let records = new Array();

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
  covidData.forEach(function(item, index) {
    if (item.hasOwnProperty("dateString") && item.hasOwnProperty("firstDose")) {
      let date = new Date(item.dateString);
      totalFirstDose = (totalFirstDose == null) ? item.firstDose : (totalFirstDose + item.firstDose);
      let over16FirstDosePercent = Number(((totalFirstDose * 100) / over16).toFixed(2));
      let over16SecondDosePercent = null;
      let over16SingleDosePercent = null;
      if (item.hasOwnProperty("secondDose")) {
        totalSecondDose =  (totalSecondDose == null) ? item.secondDose : (totalSecondDose + item.secondDose);
        over16SecondDosePercent = Number(((totalSecondDose * 100) / over16).toFixed(2));
      }
      if (item.hasOwnProperty("singleDose")) {
        totalSingleDose = (totalSingleDose == null) ? item.singleDose : (totalSingleDose + item.singleDose);
        over16SingleDosePercent = Number(((totalSingleDose * 100) / over16).toFixed(2));
      }
      let vaccinatedData = {
        date: date,
        firstDose: item.firstDose,
        secondDose: (item.hasOwnProperty("secondDose") ? item.secondDose : 0),
        singleDose: (item.hasOwnProperty("singleDose") ? item.singleDose : 0),
        totalDailyDoses: (item.firstDose + (item.hasOwnProperty("secondDose") ? item.secondDose : 0) + (item.hasOwnProperty("singleDose") ? item.singleDose : 0)),
        totalFirstDose: totalFirstDose,
        totalSecondDose: totalSecondDose,
        totalSingleDose: totalSingleDose,
        over16TotalFirstDoses: over16FirstDosePercent,
        over16TotalSecondDoses: over16SecondDosePercent,
        over16TotalSingleDoses: over16SingleDosePercent
      };
      if (index > 7) {
        let today = covidData[index];
        let yesterday = covidData[index - 1];
        let twoDaysAgo = covidData[index - 2];
        let threeDaysAgo = covidData[index - 3];
        let fourDaysAgo = covidData[index - 4];
        let fiveDaysAgo = covidData[index - 5];
        let sixDayAgo = covidData[index - 6];
        let sevenDayTotalFirstDoses = today.firstDose + yesterday.firstDose + twoDaysAgo.firstDose + threeDaysAgo.firstDose + fourDaysAgo.firstDose + fiveDaysAgo.firstDose + sixDayAgo.firstDose;
        let sevenDayTotalSecondDoses = today.secondDose + yesterday.secondDose + twoDaysAgo.secondDose + threeDaysAgo.secondDose + fourDaysAgo.secondDose + fiveDaysAgo.secondDose + sixDayAgo.secondDose;
        let sevenDayTotalSingleDoses = testUndefined(today.singleDose) + testUndefined(yesterday.singleDose) + testUndefined(twoDaysAgo.singleDose) + testUndefined(threeDaysAgo.singleDose) + testUndefined(fourDaysAgo.singleDose) + testUndefined(fiveDaysAgo.singleDose) + testUndefined(sixDayAgo.singleDose);
        vaccinatedData.sevenDayAverageFirstDose = (sevenDayTotalFirstDoses / 7).toFixed(2);
        vaccinatedData.sevenDayAverageSecondDose = (sevenDayTotalSecondDoses / 7).toFixed(2);
        vaccinatedData.sevenDayAverageSingleDose = (sevenDayTotalSingleDoses / 7).toFixed(2);
        if (date.getDay() === 0) {
          vaccinatedData.weeklyFirstDoses = sevenDayTotalFirstDoses;
          vaccinatedData.weeklySecondDoses = sevenDayTotalSecondDoses;
          vaccinatedData.weeklySingleDoses = sevenDayTotalSingleDoses;
          vaccinatedData.weeklyTotalDoses = sevenDayTotalFirstDoses + sevenDayTotalSecondDoses + sevenDayTotalSingleDoses;
        }

      }
      graphData.push(vaccinatedData);
    }
  });
  header = '📅 ' + moment(graphData[graphData.length - 1].date).format('dddd, Do MMMM YYYY');
  processNewVaccinations();
}

function processNewVaccinations() {
  logger.info('Processing daily vaccinations');
  initialise();
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
  let dailyFirstDose = Number(firstDose.data[firstDose.data.length - 1]).toLocaleString('en');
  let dailySecondDose = Number(secondDose.data[secondDose.data.length - 1]).toLocaleString('en');
  let dailySingleDose = Number(singleDose.data[singleDose.data.length - 1]).toLocaleString('en');
  let dailyTotalDoses = Number(finalEntry.totalDailyDoses).toLocaleString('en');

  let orderedByFirstDose = graphData.slice().sort(function(a, b) { return (b.firstDose - a.firstDose); });
  // No need to tweet a new day record (e.g. first dose on Monday) if today was a new daily high for first doses
  if (orderedByFirstDose[0].firstDose === finalEntry.firstDose) {
    dailyFirstDoseRecord = true;
    let previousHighDate = moment(orderedByFirstDose[1].date).format('dddd, Do MMMM');
    let previousHighFirstDoses = Number(orderedByFirstDose[1].firstDose).toLocaleString('en');
    records.push(`🥇 Record First Dose - ${dailyFirstDose} - Previous high: ${previousHighDate}(${previousHighFirstDoses})`);
  }

  let orderedBySecondDose = graphData.slice().sort(function(a, b) { return (b.secondDose - a.secondDose); });
  if (orderedBySecondDose[0].secondDose === finalEntry.secondDose) {
    dailySecondDoseRecord = true;
    let previousHighDate = moment(orderedBySecondDose[1].date).format('dddd, Do MMMM');
    let previousHighSecondDoses = Number(orderedBySecondDose[1].secondDose).toLocaleString('en');
    records.push(`🥇 Record Second Dose - ${dailySecondDose} - Previous high: ${previousHighDate}(${previousHighSecondDoses})`);
  }

  let orderedBySingleDose = graphData.slice().sort(function(a, b) { return (b.singleDose - a.singleDose); });
  if (orderedBySingleDose[0].singleDose === finalEntry.singleDose) {
    dailySingleDoseRecord = true;
    let previousHighDate = moment(orderedBySingleDose[1].date).format('dddd, Do MMMM');
    let previousHighSingleDoses = Number(orderedBySingleDose[1].singleDose).toLocaleString('en');
    records.push(`🥇 Record Single Doses - ${dailySingleDose} - Previous high: ${previousHighDate}(${previousHighSingleDoses})`);
  }

  let orderedByTotalDose = graphData.slice().sort(function(a, b) { return (b.totalDailyDoses - a.totalDailyDoses); });
  if (orderedByTotalDose[0].totalDailyDoses === finalEntry.totalDailyDoses) {
    dailyTotalDosesRecord = true;
    let previousHighDate = moment(orderedByTotalDose[1].date).format('dddd, Do MMMM');
    let previousHighTotalDoses = Number(orderedByTotalDose[1].totalDailyDoses).toLocaleString('en');
    records.push(`🥇 Record Total Doses - ${dailyTotalDoses} - Previous high: ${previousHighDate}(${previousHighTotalDoses})`);
  }

  let totalFirstDose = Number(finalEntry.totalFirstDose).toLocaleString('en');
  let totalSecondDose = Number(finalEntry.totalSecondDose).toLocaleString('en');
  let totalSingleDose = Number(finalEntry.totalSingleDose).toLocaleString('en');
  let totalDoses = totalFirstDose + totalSecondDose + totalSingleDose;
  let totalVaccinated = Number(finalEntry.totalSecondDose + finalEntry.totalSingleDose).toLocaleString('en');
  let totalVaccinatedPercentage = (finalEntry.over16TotalSecondDoses + finalEntry.over16TotalSingleDoses).toFixed(2);

  let tweet = '💉 Vaccinations' +
              '\n' + moment(finalEntry.date).format('dddd, Do MMMM') + 
              `\n1st dose: ${dailyFirstDose}` +
              `\n2nd dose: ${dailySecondDose}` +
              `\nSingle dose: ${dailySingleDose}` +
              `\nTotal: ${dailyTotalDoses}` +
              '\n' +
              '\nTotals' +
              `\n1st dose: ${totalFirstDose}(${finalEntry.over16TotalFirstDoses}% of 16+)` +
              `\nVaccinated(2nd + single doses): ${totalVaccinated}(${totalSecondDose} + ${totalSingleDose})(${totalVaccinatedPercentage}% of 16+)` +
              '\n' + hashtag +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=normal&displayType=graph&trendLine=false';

  let b64Content = new Array();
  let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, over16TotalFirstDoses, over16TotalSecondDoses, over16TotalSingleDoses, "Daily Vaccinations");
  b64Content.push(chartHelper.writeChart('vaccinations/dailyVaccinations.png', configuration));
  configuration = generateDoughnutConfiguration(labels, finalEntry.over16TotalFirstDoses, finalEntry.over16TotalSecondDoses, finalEntry.over16TotalSingleDoses);
  b64Content.push(chartHelper.writeChart('vaccinations/vaccinationProgress.png', configuration));
  twitterHelper.tweetChart(b64Content, tweet, processRollingSevenDayAverage);
}

function processVaccinationsByDay(lastTweetId) {
  logger.info('Processing vaccinations by day');
  initialise();
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
  let dailyFirstDose = constants.valueAndString(firstDose.data[firstDose.data.length - 1]);
  let dailySecondDose = constants.valueAndString(secondDose.data[secondDose.data.length - 1]);
  let dailySingleDose = constants.valueAndString(singleDose.data[singleDose.data.length - 1]);

  let previousFirstDose = constants.valueAndString(firstDose.data[firstDose.data.length - 2]);
  let previousSecondDose = constants.valueAndString(secondDose.data[secondDose.data.length - 2]);
  let previousSingleDose = constants.valueAndString(singleDose.data[singleDose.data.length - 2]);
  let previousTotalDailyDoses = constants.valueAndString(previousFirstDose.value + previousSecondDose.value + previousSingleDose.value);

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

  let tweet = '💉 Vaccinations: By day' +
              '\n' + moment(graphData[graphData.length - 1].date).format('ddd, Do MMMM') + 
              `\n1st dose: ${dailyFirstDose.string}` +
              `\n2nd dose: ${dailySecondDose.string}` + 
              `\nSingle dose: ${dailySingleDose.string}` +
              `\nTotal: ${totalDailyDoses.string}` + 
              '\n' + 
              '\n' + previousDay +
              '\nDoses(Diff | % diff)' + 
              `\n1st: ${previousFirstDose.string}(${firstDoseChange.difference} | ${firstDoseChange.percentage})` +
              `\n2nd: ${previousSecondDose.string}(${secondDoseChange.difference} | ${secondDoseChange.percentage})` +
              ((previousSingleDose > 0) ? `\nSingle: ${previousSingleDose}(${singleDoseChange} | ${((singleDoseChange * 100) / previousSingleDose).toFixed(2)}%)` : '') +
              `\nTotal: ${previousTotalDailyDoses.string}(${totalDosesChange.difference} | ${totalDosesChange.percentage})` +
              `\n${hashtag}` +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=byWeekday&day=' + day + '&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, over16TotalFirstDoses, over16TotalSecondDoses, over16TotalSingleDoses, "Vaccinations By Day - " + days[day]);
  let b64Content = chartHelper.writeChart('vaccinations/byDay.png', configuration);
  twitterHelper.tweetChart(b64Content, tweet, processWeeklyCases, lastTweetId);
}

function processRollingSevenDayAverage(inReplyToId) {
  logger.info('Processing seven day average vaccinations');
  initialise();
  let finalEntry = graphData[graphData.length - 1];
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
  let sevenDayAverageFirstDose = Number(firstDose.data[firstDose.data.length - 1]);
  let sevenDayAverageSecondDose = Number(secondDose.data[firstDose.data.length - 1]);
  let sevenDayAverageSingleDose = Number(singleDose.data[singleDose.data.length - 1]);
  let sevenDayAverageTotalDose = sevenDayAverageFirstDose + sevenDayAverageSecondDose + sevenDayAverageSingleDose;

  let firstDosesOver16Remaining = over16 - (finalEntry.totalFirstDose + finalEntry.totalSingleDose);
  let estimatedDaysToTotalFirstDose = (firstDosesOver16Remaining / sevenDayAverageFirstDose);

  let secondDosesAdministered = sevenDayAverageSecondDose * estimatedDaysToTotalFirstDose;
  let singleDosesAdministered = sevenDayAverageSingleDose * estimatedDaysToTotalFirstDose;
  let secondDosesOver16Remaining = over16 - (finalEntry.totalSecondDose + secondDosesAdministered + singleDosesAdministered);
  let estimatedDaysToTotalSecondDose = Math.ceil(secondDosesOver16Remaining / sevenDayAverageTotalDose);

  let finalFirstDose = new Date();
  finalFirstDose.setDate(finalFirstDose.getDate() + Math.ceil(estimatedDaysToTotalFirstDose));

  let finalSecondDose = new Date(finalFirstDose.getTime());
  finalSecondDose.setDate(finalSecondDose.getDate() + Math.ceil(estimatedDaysToTotalSecondDose));

  let tweet = '💉 Vaccinations: 7 day average' +
              '\n' + moment(finalEntry.date).format('ddd, Do MMMM') + 
              '\n1st dose: ' + Number(sevenDayAverageFirstDose).toLocaleString('en') + 
              '\n2nd dose: ' + Number(sevenDayAverageSecondDose).toLocaleString('en') + 
              '\nSingle dose: ' + Number(sevenDayAverageSingleDose).toLocaleString('en') +
              '\nTotal doses: ' + Number(sevenDayAverageTotalDose).toLocaleString('en') +
              '\n' +
              '\nEstimated final vaccinations' +
              '\n1st dose: ' + moment(finalFirstDose).format('ddd, Do MMM') + '(' + Math.ceil(estimatedDaysToTotalFirstDose)  + ' days)' +
              '\nVaccinated: ' + moment(finalSecondDose).format('ddd, Do MMM') + '(' + Math.ceil(estimatedDaysToTotalFirstDose + estimatedDaysToTotalSecondDose) + ' days)' +
              '\n' + hashtag +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=rollingSevenDayAverage&displayType=graph&trendLine=false';

  let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, over16TotalFirstDoses, over16TotalSecondDoses, over16TotalSingleDoses, "Seven Day Average Vaccinations");
  let b64Content = chartHelper.writeChart('vaccinations/processRollingSevenDayAverage.png', configuration);
  twitterHelper.tweetChart(b64Content, tweet, processVaccinationsByDay, inReplyToId);
}

function processWeeklyCases(inReplyToId) {
  if (graphData[graphData.length - 1].date.getDay() === 0) {
    logger.info("Processing weekly totals");
    initialise();
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

    let orderedByFirstDoses = weeklyData.slice().filter(item => item.date.getDay() === 0).sort(function(a, b) { return (b.weeklyFirstDoses - a.weeklyFirstDoses);  });
    if (orderedByFirstDoses[0].weeklyFirstDoses === weeklyFirstDose.value) {
      let previousHighFirstDoses = Number(orderedByFirstDoses[1].weeklyTotalDoses).toLocaleString('en');
      records.push(`🥇 Record Weekly First Doses adminstered - ${weeklyFirstDose.string} - Previous high: ${moment(orderedByFirstDoses[1].date).format('dddd, Do MMMM')}(${previousHighFirstDoses})`);
    }

    let orderedBySecondDoses = weeklyData.slice().filter(item => item.date.getDay() === 0).sort(function(a, b) { return (b.weeklySecondDoses - a.weeklySecondDoses);  });
    if (orderedBySecondDoses[0].weeklySecondDoses === weeklySecondDose.value) {
      let previousHighSecondDoses = Number(orderedBySecondDoses[1].weeklySecondDoses).toLocaleString('en');
      records.push(`🥇 Record Weekly Second Doses adminstered - ${weeklySecondDose.string} - Previous high: ${moment(orderedBySecondDoses[1].date).format('dddd, Do MMMM')}(${previousHighSecondDoses})`);
    }

    let orderedBySingleDoses = weeklyData.slice().filter(item => item.date.getDay() === 0).sort(function(a, b) { return (b.weeklySingleDoses - a.weeklySingleDoses);  });
    if (orderedBySingleDoses[0].weeklySecondDoses === weeklySingleDose.value) {
      let previousHighSingleDoses = Number(orderedBySingleDoses[1].weeklySingleDoses).toLocaleString('en');
      records.push(`🥇 Record Weekly Single Doses adminstered - ${weeklySingleDose.string} - Previous high: ${moment(orderedBySingleDoses[1].date).format('dddd, Do MMMM')}(${previousHighSingleDoses})`);
    }

    let orderedByTotalDoses = weeklyData.slice().filter(item => item.date.getDay() === 0).sort(function(a, b) { return (b.weeklyTotalDoses - a.weeklyTotalDoses);  });
    if (orderedByTotalDoses[0].weeklyTotalDoses === weeklyTotal.value) {
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

    let tweet = '💉 Vaccinations: Weekly totals' +
              `\n${moment(weeklyData[weeklyData.length - 1].date).format('dddd, Do MMMM')}` + 
              `\n1st dose: ${weeklyFirstDose.string}` + 
              `\n2nd dose: ${weeklySecondDose.string}` +
              (weeklySingleDose.value > 0 ? `\nSingle dose: ${weeklySingleDose.string}` : '') +
              `\nTotal: ${weeklyTotal.string}` +  
              '\n' +
              `\n${moment(weeklyData[weeklyData.length - 2].date).format('dddd, Do MMMM')}` + 
              `\n1st dose: ${previousWeeksFirstDose.string}(${firstDoseDifference.difference} | ${firstDoseDifference.percentage})` +
              `\n2nd dose: ${previousWeeksSecondDose.string}(${secondDoseDifference.difference} | ${secondDoseDifference.percentage})` +
              // (previousWeeksSingleDose > 0 ? `Single dose: ${previousWeeksSingleDoseString}(` + (singleDoseDifference > 0 ? '+' : '') + Number(singleDoseDifference).toLocaleString('en') + ')': '') +
              `\nTotal: ${previousWeeksTotal.string}(${totalDifference.difference} | ${totalDifference.percentage})` + 
              '\n' + hashtag +
              '\nhttps://tetsujin1979.github.io/covid19dashboard?dataSelection=vaccinations&dateSelection=lastTwoMonths&graphType=weeklyTotal&displayType=graph&trendLine=false';

    let configuration = generateConfiguration(labels, firstDose, secondDose, singleDose, over16TotalFirstDoses, over16TotalSecondDoses, over16TotalSingleDoses, "Weekly Vaccination Totals");
    over16TotalSingleDoses
    let b64Content = chartHelper.writeChart('vaccinations/weeklyTotals.png', configuration);
    twitterHelper.tweetChart(b64Content, tweet, tweetRecords, inReplyToId);        

  } else {
    tweetRecords(inReplyToId);
  }
}
/*
function processSevenDayAverage(inReplyToId) {
  let labels = new Array();
  firstDose.data = new Array();
  secondDose.data = new Array();
  over16TotalFirstDoses.data = new Array();
  over16TotalSecondDoses.data = new Array();
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
    over16TotalFirstDoses.data.push(today.totalFirstDose);
    over16TotalSecondDoses.data.push(today.totalSecondDose);
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

  let configuration = generateConfiguration(labels, firstDose, secondDose, over16TotalFirstDoses, over16TotalSecondDoses);
  writeChartToFile.processChart('vaccinations/sevenDayAverage.png', configuration, tweet, function() {}, inReplyToId);
}
*/

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

function generateDoughnutConfiguration(labels, firstDosePercentage, secondDosePercentage, singleDosePercentage) {
  return {
    type: "doughnut",
    data: {
      labels: ["Single Dose", "First Dose", "Second Dose"],
      datasets: [{
        label: 'First Dose label',
        data: [singleDosePercentage, firstDosePercentage, (100 - (firstDosePercentage + singleDosePercentage))],
        backgroundColor: ['rgba(150, 81, 159, 0.6)', 'rgba(237, 100, 127, .6)', 'rgba(228, 233, 237, 1)'],
        color: 'black',
        borderWidth: 1
      }, {
        label: 'Second Dose label',
        data: [singleDosePercentage, secondDosePercentage, (100 - (secondDosePercentage + singleDosePercentage))],
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
  labels = new Array();
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
  twitterHelper.tweetRecords(records, inReplyToId);
}

module.processData = processData;
