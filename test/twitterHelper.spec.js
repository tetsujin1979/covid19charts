const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Unit tests for twitter helper', () => {
	const HASHTAG = '#COVID19Ireland';
	const MEDIA_IDS = [1, 2];

    const tweet = {
    	status: 'Status',
    	url: 'https://covidiecharts.com'
    };

	const twitterClientStub = {
    };

    const constantsDebugTrueStub = {
      	debug: sinon.stub().returns(true),
      	hashtag: sinon.stub().returns(HASHTAG)
	};

    const constantsDebugFalseStub = {
      	debug: sinon.stub().returns(false),
      	hashtag: sinon.stub().returns(HASHTAG)
    };

	let mediaIdCounter = 0;

    beforeEach(() => {
    	mediaIdCounter = 0;
		twitterClientStub.uploadMedia = sinon.stub().callsFake((file, callback) => callback(MEDIA_IDS[mediaIdCounter++]));
		twitterClientStub.createMetadata = sinon.stub();
		twitterClientStub.updateStatus = sinon.stub();
    });

  	it('should test the tweet chart method with debug enabled', () => {
  		let callbackId = '';
	    const twitterHelper = proxyquire('../src/twitterHelper', {
	      './constants': constantsDebugTrueStub,
	      './twitterClient': twitterClientStub
	    });

	    twitterHelper.tweetChart('files', tweet, (id) => callbackId = id, 1234);
	   	expect(callbackId).to.equal(1);
	});

  	it('should test the tweet chart method with debug disabled and a single file', () => {
  		let callbackId = '';
  		const inReplyToId = 1234;
  		const expectedStatus = 'Status\nhttps://covidiecharts.com\n' + HASHTAG;
  		const expectedMediaIds = [MEDIA_IDS[0]];
	    const twitterHelper = proxyquire('../src/twitterHelper', {
	      './constants': constantsDebugFalseStub,
	      './twitterClient': twitterClientStub
	    });

	    twitterHelper.tweetChart('file', tweet, (id) => callbackId = id, inReplyToId);
	   	sinon.assert.calledWithExactly(twitterClientStub.uploadMedia, 'file', sinon.match.func);
	   	sinon.assert.calledWithExactly(twitterClientStub.createMetadata, expectedStatus, expectedMediaIds, sinon.match.func, inReplyToId);
	});

  	it('should test the tweet chart method with debug disabled and multiple files', () => {
  		let callbackId = '';
  		const inReplyToId = 1234;
  		const expectedStatus = 'Status\nhttps://covidiecharts.com\n' + HASHTAG;
  		const expectedMediaIds = [MEDIA_IDS[0], MEDIA_IDS[1]];
	    const twitterHelper = proxyquire('../src/twitterHelper', {
	      './constants': constantsDebugFalseStub,
	      './twitterClient': twitterClientStub
	    });

	    twitterHelper.tweetChart(['file1', 'file2'], tweet, (id) => callbackId = id, inReplyToId);
	   	sinon.assert.calledWithExactly(twitterClientStub.uploadMedia, 'file1', sinon.match.func);
	   	sinon.assert.calledWithExactly(twitterClientStub.uploadMedia, 'file2', sinon.match.func);
	   	sinon.assert.calledWithExactly(twitterClientStub.createMetadata, expectedStatus, sinon.match.array.deepEquals(expectedMediaIds), sinon.match.func, inReplyToId);
	});

  	it('should test the tweet records method with debug enabled', () => {
  		const inReplyToId = 1;
	    const twitterHelper = proxyquire('../src/twitterHelper', {
	      './constants': constantsDebugTrueStub,
	      './twitterClient': twitterClientStub
	    });
	    const records = ['record1', 'record2'];
	    twitterHelper.tweetRecords(records, inReplyToId);
	    sinon.assert.notCalled(twitterClientStub.updateStatus);
    });

  	it('should test the tweet records method with debug disabled', () => {
  		const inReplyToId = 1;
	    const twitterHelper = proxyquire('../src/twitterHelper', {
	      './constants': constantsDebugFalseStub,
	      './twitterClient': twitterClientStub
	    });
	    const records = ['record1', 'record2'];
	    twitterHelper.tweetRecords(records, inReplyToId);
	    sinon.assert.calledWithExactly(twitterClientStub.updateStatus, {status: 'record1\nrecord2\n' + HASHTAG, in_reply_to_status_id: inReplyToId}, sinon.match.func);
    });
});
