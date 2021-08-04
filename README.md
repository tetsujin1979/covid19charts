# covid19charts
## A nodeJS application to tweet charts based on daily vaccinations, swabs, cases, deaths, and hospitalisations

### Before running
Register a new application at [Twitter's developer portal](https://developer.twitter.com/en/apps)

Authenticate your account with the new application 

### To run locally
Clone the repository

Populate the src/twitterConfiguration.js file with the application consumer key, consumer secret, access token, and access token secret values from first step

In the clone directory, clone the COVID 19 Dashboard repo from [COVID19 Dashboard](https://github.com/tetsujin1979/covid19dashboard)

Run npm install to install the dependencies

From the parent directory run `node src/index [deaths|cases|swabs|vaccinations|hospitalisations]`

### To run as an AWS Lambda
Create a new AMI instance on AWS EC2

SSH into the new instance 

Install git and nodejs - you may need to specify node14, or use nvm to install node14

Clone the repository

Populate the src/twitterConfiguration.js file with the application consumer key, consumer secret, access token, and access token secret values from first step

Run `npm install` to create the npm_modules directory

#### Create a layer from node_modules
Create a nodejs directory, and a node14 subdirectory in that

Move the node_modules directory to the node14 directory

Zip the nodejs directory with `zip node.zip node`

Add the libblkid.so.1, libfontconfig.so.1, libmount.so.1, libpixman-1.so.0, and libuuid.so.1 files from the /usr/lib directory to the /nodejs/node14/node_modules/canvas/build/Release/

Log in to AWS and create a new Lambda layer from the new zip file

#### Create a new Lambda
AWS AMI images, where Lambda programs execute, do not supply the Arial fonts used in the graphs, locate these online and add to the fonts directory

Zip all files in the src/ directory, watermark.png, application.properties, and the fonts directory into a zip file

Create a new Lambda using this zip, selecting the NodeJS 14.x runtime

Once created, set the following values under Configuration → Environment variables
|Key|Value|
|---|-----|
|FONTCONFIG_PATH|/var/task/fonts|
|LD_PRELOAD|/opt/nodejs/node14/node_modules/canvas/build/Release/libz.so.1|
|debug|false|
|environment|lambda|

#### Invoke the lambda
Create a new test, using the following JSON
```
{
  "metric": "cases"
}
```

Confirm the lambda completes successfully

Replace `cases` with any of the other metrics and re-run the test to create the relevant charts

### Known issues
[chart.js](https://www.chartjs.org/) 3.0.0, and later, does not work with the [chartjs-node-canvas](https://github.com/SeanSobey/ChartjsNodeCanvas) dependency

There are some issues with newer versions of node.js with the canvas dependency, this repository has been tested successfully with node 14.16.1 and npm 7.9.0
