# covid19charts
## A nodeJS application to tweet charts based on daily vaccinations, swabs, cases, deaths, and hospitalisations

### Before running
Register a new application at [Twitter's developer portal](https://developer.twitter.com/en/apps)

Authenticate your account with the new application 

### To run locally
Clone the repository

Populate the src/twitterConfiguration.js file with the application consumer key, consumer secret, access token, and access token secret values from first step

The application expected the data.json file from the COVID 19 Dashboard repo to be available in a subdirectory named covid19dashboard, so either clone the repo from [COVID19 Dashboard](https://github.com/tetsujin1979/covid19dashboard) or create a directory called covid19dashboard and save the file from https://tetsujin1979.github.io/covid19dashboard/data.json to it

Run npm install to install the dependencies

From the parent directory run `node src/index [deaths|cases|swabs|vaccinations|hospitalisations]`

### To run as an AWS Lambda
Create a new AMI instance on AWS EC2

SSH into the new instance 

Install git and nodejs
* Confirm that version 14.x of nodejs is installed, if not use [nvm](https://github.com/nvm-sh/nvm) to install node14

Clone the repository

Populate the src/twitterConfiguration.js file with the application consumer key, consumer secret, access token, and access token secret values from first step

Run `npm install` to create the npm_modules directory

#### Create a layer from node_modules
AWS nodejs lambda layers expect to find files in the nodejs/node14 directory of a zip file, so create a nodejs directory, and a node14 subdirectory in that, then move the node_modules directory to the node14 directory

The canvas module needs the following static library files, which are not available on the lambda AMI image
* libblkid.so.1
* libfontconfig.so.1
* libmount.so.1
* libpixman-1.so.0
* libuuid.so.1

Copy the files from the /usr/lib directory to the /nodejs/node14/node_modules/canvas/build/Release/

Zip the nodejs directory with `zip node.zip nodejs`

Log in to AWS and create a new Lambda layer from the new zip file

#### Create a new Lambda
AWS AMI images, where Lambda programs execute, do not contain the Arial fonts used in the graphs, locate these online and add to the fonts directory in the repository

Zip all files in the src/ directory, watermark.png, application.properties, and the fonts directory into a single file

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
