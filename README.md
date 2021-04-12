# covid19charts
A nodeJS application to post charts based on daily vaccinations, swabs, cases, and deaths to twitter

There are some issues with newer versions of node with the canvas dependency, this application has been tested successfully with node 14.16.1 and npm 7.9.0

To use:
Clone the repo
In the clone directory, clone the COVID 19 Dashboard repo from https://github.com/tetsujin1979/covid19dashboard.git for the data.json file

Run npm install to download the dependencies

Register a new application at https://developer.twitter.com/en/apps

Authenticate your account with the new applicaton, and populate the values in twitterConfiguration.js
