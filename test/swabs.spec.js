const fs = require('fs')
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe("Unit tests for swabs", () => {
  const constantsStub = {};
  const chartHelperStub = {};
  const twitterHelperStub = {};

  const MAX_TWEET_LENGTH = 280;
  beforeEach(function () {
    constantsStub.days = sinon.stub().returns(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    constantsStub.oneMonthAgo = sinon.stub().returns(new Date("2021-04-24T12:00:00.000Z"));

    chartHelperStub.writeChart = sinon.stub();
    chartHelperStub.writeChart.onCall(0).returns('0');
    chartHelperStub.writeChart.onCall(1).returns('1');

    twitterHelperStub.tweetChart = sinon.stub().callsFake((b64Content, tweet, callback, inReplyToId) => {
      expect(tweet.status).to.have.lengthOf.below(MAX_TWEET_LENGTH, `tweet.status\n${tweet.status}\ntweet.status.length: ${tweet.status.length}`);
      callback(inReplyToId);
    });
  });

  it("should test the swabs module", () => {
    const swabs = proxyquire('../src/swabs', {
      './constants': constantsStub,
      './chartHelper': chartHelperStub,
      './twitterHelper': twitterHelperStub
    });

    const data = fs.readFileSync('test/testdata/data.json', 'utf8');
    const covidData = JSON.parse(data);
    swabs.processData(covidData);        
  });

  it("should test the swabs module including the weekly totals", () => {
    const swabs = proxyquire('../src/swabs', {
      './constants': constantsStub,
      './chartHelper': chartHelperStub,
      './twitterHelper': twitterHelperStub
    });

    const data = fs.readFileSync('test/testdata/weekly-data.json', 'utf8');
    const covidData = JSON.parse(data);
    swabs.processData(covidData);        
  });
});
