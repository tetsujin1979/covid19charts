const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const fsPromises = require('fs').promises;
const log4js = require("log4js");

const constants = require("./constants");

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('writeChartToFile');

const width = 1600;
const height = 900;

const chartCallback = (ChartJS) => {
    // Global config example: https://www.chartjs.org/docs/latest/configuration/
    ChartJS.defaults.global.elements.rectangle.borderWidth = 2;
    // Global plugin example: https://www.chartjs.org/docs/latest/developers/plugins.html
    ChartJS.plugins.register({
        beforeDraw: function(chartInstance) {
          let ctx = chartInstance.chart.ctx;
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, chartInstance.chart.width, chartInstance.chart.height);
        }
      });
    // New chart type example: https://www.chartjs.org/docs/latest/developers/charts.html
    ChartJS.controllers.MyType = ChartJS.DatasetController.extend({
        // chart implementation
    });
};
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

const writeChart = function(filename, configuration) {
  logger.info(`Creating chart at ${filename}`);
  try {
    chartJSNodeCanvas.renderToBuffer(configuration).then(function (data) {
      fs.writeFileSync(filename, data);
    });
  } catch (err) {
    logger.error(`Error occured writing ${filename}\t${err}`);
    process.exit(-1);
  }
  let b64Content = fs.readFileSync(filename, { encoding: 'base64' });
  logger.debug(`Returning ${b64Content}`);
  return b64Content;
};    

exports.writeChart = writeChart;
