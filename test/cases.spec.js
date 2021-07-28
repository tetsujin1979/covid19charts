const fs = require('fs')
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe("Unit tests for cases", () => {
  const constantsStub = {};
  const chartHelperStub = {};
  const twitterHelperStub = {};

  const MAX_TWEET_LENGTH = 280;
  beforeEach(function () {
    constantsStub.days = sinon.stub().returns(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    constantsStub.oneMonthAgo = sinon.stub().returns(new Date("2021-06-24T12:00:00.000Z"));

    chartHelperStub.writeChart = sinon.stub().returns('0');

    twitterHelperStub.tweetChart = sinon.stub().callsFake((b64Content, tweet, callback, inReplyToId) => {
      expect(tweet.status).to.have.lengthOf.below(MAX_TWEET_LENGTH, `tweet.status\n${tweet.status}\ntweet.status.length: ${tweet.status.length}`);
      callback(inReplyToId);
    });
  });

  it("should test the cases module", () => {
    const cases = proxyquire('../src/cases', {
      './constants': constantsStub,
      './chartHelper': chartHelperStub,
      './twitterHelper': twitterHelperStub
    });

    const data = fs.readFileSync('test/testdata/data.json', 'utf8');
    const covidData = JSON.parse(data);
    cases.processData(covidData);        
  });

  it("should test the cases module including the weekly totals", () => {
    const cases = proxyquire('../src/cases', {
      './constants': constantsStub,
      './chartHelper': chartHelperStub,
      './twitterHelper': twitterHelperStub
    });

    const data = fs.readFileSync('test/testdata/weekly-data.json', 'utf8');
    const covidData = JSON.parse(data);
    cases.processData(covidData);        
  });
});