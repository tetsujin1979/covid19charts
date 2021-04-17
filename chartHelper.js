const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const fsPromises = require('fs').promises;
const log4js = require("log4js");
const Canvas = require("canvas");

const constants = require("./constants");

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('writeChartToFile');

const width = 1600;
const height = 900;

const chartCallback = (ChartJS) => {
    // Global config example: https://www.chartjs.org/docs/latest/configuration/
    ChartJS.defaults.global.elements.rectangle.borderWidth = 2;
    ChartJS.defaults.global.layout.padding.bottom = 50;
    // Global plugin example: https://www.chartjs.org/docs/latest/developers/plugins.html
    ChartJS.plugins.register({
        beforeDraw: function(chartInstance) {
          let ctx = chartInstance.chart.ctx;
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, chartInstance.chart.width, chartInstance.chart.height);
          
          // To fix a minor visual glitch with the doughnut chart where the legend colour
          // for the "Second Dose" is grey
          var legends = chartInstance.legend.legendItems;
          legends.forEach(function(e) {
            if (e.text === 'Second Dose') {
              e.fillStyle = 'rgba(63, 63, 191, 0.6)';
            }
          });        
        },
        afterDraw: function(chartInstance) {
          let context = chartInstance.chart.ctx;
          let canvas = context.canvas;

          let cHeight = canvas.clientHeight || canvas.height;
          let cWidth = canvas.clientWidth || canvas.width;

          let watermark = new Canvas.Image;
          watermark.src = fs.readFileSync('watermark.png');
          context.save();

          context.globalAlpha = 0.75;
          context.drawImage(watermark, canvas.width - watermark.width, canvas.height - watermark.height);
          context.restore();
        }
      });
    // New chart type example: https://www.chartjs.org/docs/latest/developers/charts.html
    ChartJS.controllers.MyType = ChartJS.DatasetController.extend({
        // chart implementation
    });
};
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback});

const writeChart = function(filename, configuration) {
  logger.info(`Creating chart at ${filename}`);
  if (fs.existsSync(filename)) {
    logger.debug(`${filename} exists, deleting`);
    fs.unlinkSync(filename);
  }
  try {
    let data = chartJSNodeCanvas.renderToBufferSync(configuration);
    fs.writeFileSync(filename, data);
  } catch (err) {
    logger.error(`Error occured writing ${filename}\t${err}`);
    process.exit(-1);
  }
  let b64Content = fs.readFileSync(filename, { encoding: 'base64' });
  logger.debug(`Returning ${b64Content}`);
  return b64Content;
};    

exports.writeChart = writeChart;
