const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const Canvas = require("canvas");

const log4jsHelper = require('./log4jsHelper');
const logger = log4jsHelper.getLogger('chartHelper');

const width = 1600;
const height = 900;

const watermark = new Canvas.Image;
watermark.src = fs.readFileSync('./watermark.png');

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
          
          // To fix a minor visual glitch with the doughnut chart where the legend colour
          // for the "Second Dose" is grey
          var legends = chartInstance.legend.legendItems;
          legends.forEach(function(e) {
            if (e.text === 'Second Dose') {
              e.fillStyle = 'rgba(63, 63, 191, 0.6)';
            }
            if (e.text === 'Single Dose') {
              e.fillStyle = 'rgba(150, 81, 159, 0.6)';
            }
            if (e.text === 'Booster') {
              e.fillStyle = 'rgba(0, 168, 168, 0.6)';
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
