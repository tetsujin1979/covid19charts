const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Unit tests for twitter client module', () => {
	const thisObject = this;

	const twitterConfiguration = {
		consumer_key: 'consumer_key',
		consumer_secret: 'consumer_secret',
		access_token: 'access_token',
		access_token_secret: 'access_token_secret',
    };

    const twitterConfigurationInstanceStub = { 
    	twitterConfiguration: sinon.stub().returns(twitterConfiguration)
    };

  	it('should test the updateStatus method successfully', () => {
  		let callbackId = '';
  		const mockCallBackId = 1234;
	    const twitInstanceStub = { 
	    	post: sinon.stub().callsFake(function(endpoint, params, callback) {
      			callback(null, {id_str: mockCallBackId});
    		})
	    };
	    const TwitStub = sinon.stub().returns(twitInstanceStub);
	    const twitterConfigurationStub = sinon.stub().returns(twitterConfigurationInstanceStub);
	    const twitterClient = proxyquire('../src/twitterClient', {
	      'twit': TwitStub,
	      './twitterConfiguration': twitterConfigurationInstanceStub
	    });
	    twitterClient.updateStatus({ status: 'New status' }, (id) => callbackId = id);

	    sinon.assert.calledWithExactly(TwitStub, twitterConfiguration);
	    sinon.assert.calledWithExactly(twitInstanceStub.post, 'statuses/update', { status: 'New status' }, sinon.match.func);
	    expect(mockCallBackId).to.equal(callbackId);
  	});

  	it('should test the updateStatus method successfully without a callback', () => {
  		let callbackId = 4321;
  		const mockCallBackId = 1234;
	    const twitInstanceStub = { 
	    	post: sinon.stub().callsFake(function(endpoint, params, callback) {
      			callback(null, {id_str: mockCallBackId});
    		})
	    };
	    const TwitStub = sinon.stub().returns(twitInstanceStub);
	    const twitterConfigurationStub = sinon.stub().returns(twitterConfigurationInstanceStub);
	    const twitterClient = proxyquire('../src/twitterClient', {
	      'twit': TwitStub,
	      './twitterConfiguration': twitterConfigurationInstanceStub
	    });

	    twitterClient.updateStatus({ status: 'New status' });

	    sinon.assert.calledWithExactly(TwitStub, twitterConfiguration);
	    sinon.assert.calledWithExactly(twitInstanceStub.post, 'statuses/update', { status: 'New status' }, sinon.match.func);
	    expect(callbackId).to.equal(4321);
  	});

  	it('should test the updateStatus method with a failure', () => {
  		let callbackId = 1234;
	    const twitInstanceStub = { 
	    	post: sinon.stub().callsFake(function(endpoint, params, callback) {
      			callback("An error occured", {id_str: 1234});
    		})
	    };
	    const TwitStub = sinon.stub().returns(twitInstanceStub);
	    const twitterConfigurationStub = sinon.stub().returns(twitterConfigurationInstanceStub);
	    const twitterClient = proxyquire('../src/twitterClient', {
	      'twit': TwitStub,
	      './twitterConfiguration': twitterConfigurationInstanceStub
	    });

	    const params = { 
	    	status: 'New status', 
	    	in_reply_to_status_id: 4321 
	    };
	    twitterClient.updateStatus(params, (id) => callbackId = id);

	    sinon.assert.calledWithExactly(TwitStub, twitterConfiguration);
	    sinon.assert.calledWithExactly(twitInstanceStub.post, 'statuses/update', params, sinon.match.func);
	    expect(callbackId).to.equal(4321);
  	});

  	it('should test the uploadMedia method successfully', () => {
  		let callbackId = 1234;
  		const twitInstanceStub = { 
	    	post: sinon.stub().callsFake(function(endpoint, params, callback) {
      			callback(null, {media_id_string: 4321});
    		})
	    };
	    const TwitStub = sinon.stub().returns(twitInstanceStub);
	    const twitterConfigurationStub = sinon.stub().returns(twitterConfigurationInstanceStub);
	    const twitterClient = proxyquire('../src/twitterClient', {
	      'twit': TwitStub,
	      './twitterConfiguration': twitterConfigurationInstanceStub
	    });

	    twitterClient.uploadMedia('b64content', (id) => callbackId = id);
	    const params = {media: 'b64content'};
	    sinon.assert.calledWithExactly(TwitStub, twitterConfiguration);
	    sinon.assert.calledWithExactly(twitInstanceStub.post, 'media/upload', params, sinon.match.func);
	    expect(callbackId).to.equal(4321);
	});

  	it('should fail to upload media successfully', () => {
  		let callbackId = 1234;
  		const twitInstanceStub = { 
	    	post: sinon.stub().callsFake(function(endpoint, params, callback) {
      			callback("An error occurred", {media_id_string: 4321});
    		})
	    };
	    const TwitStub = sinon.stub().returns(twitInstanceStub);
	    const twitterConfigurationStub = sinon.stub().returns(twitterConfigurationInstanceStub);
	    const twitterClient = proxyquire('../src/twitterClient', {
	      'twit': TwitStub,
	      './twitterConfiguration': twitterConfigurationInstanceStub
	    });
		sinon.stub(process, 'exit');

	    twitterClient.uploadMedia('b64content', (id) => callbackId = id);
 	    expect(process.exit.calledWith(-1)).to.be.true;
 	    process.exit.restore();
	});

  	it('should create metadata for an image successfully', () => {
  		let callbackId = 1234;
  		const mediaIds = [12345, 67890];
  		const twitInstanceStub = { 
	    	post: sinon.stub().callsFake(function(endpoint, params, callback) {
      			callback(null, 'data', 'response');
    		})
	    };
	    const TwitStub = sinon.stub().returns(twitInstanceStub);
	    const twitterConfigurationStub = sinon.stub().returns(twitterConfigurationInstanceStub);
	    const twitterClient = proxyquire('../src/twitterClient', {
	      'twit': TwitStub,
	      './twitterConfiguration': twitterConfigurationInstanceStub
	    });

	    twitterClient.createMetadata('Tweet', [1234, 2345], (id) => callbackId = id);
	    sinon.assert.calledWithExactly(TwitStub, twitterConfiguration);
	    const params = {media_id: 1234};
	    sinon.assert.calledWithExactly(twitInstanceStub.post, 'media/metadata/create', params, sinon.match.func);
  	});

  	it('should create metadata for an image successfully with a reply to id', () => {
  		let callbackId = 1234;
  		let inReplyToId = 123456;
  		const mediaIds = [12345, 67890];
  		const twitInstanceStub = { 
	    	post: sinon.stub().callsFake(function(endpoint, params, callback) {
      			callback(null, 'data', 'response');
    		})
	    };
	    const TwitStub = sinon.stub().returns(twitInstanceStub);
	    const twitterConfigurationStub = sinon.stub().returns(twitterConfigurationInstanceStub);
	    const twitterClient = proxyquire('../src/twitterClient', {
	      'twit': TwitStub,
	      './twitterConfiguration': twitterConfigurationInstanceStub
	    });

	    twitterClient.createMetadata('Tweet', [1234, 2345], (id) => callbackId = id, inReplyToId);
	    sinon.assert.calledWithExactly(TwitStub, twitterConfiguration);
	    const params = {media_id: 1234};
	    sinon.assert.calledWithExactly(twitInstanceStub.post, 'media/metadata/create', params, sinon.match.func);
  	});

  	it('should fail to create metadata for an image successfully', () => {
  		let callbackId = 1234;
  		let inReplyToId = 123456;
  		const mediaIds = [12345, 67890];
  		const twitInstanceStub = { 
	    	post: sinon.stub().callsFake(function(endpoint, params, callback) {
      			callback("An error occurred", 'data', 'response');
    		})
	    };
	    const TwitStub = sinon.stub().returns(twitInstanceStub);
	    const twitterConfigurationStub = sinon.stub().returns(twitterConfigurationInstanceStub);
	    const twitterClient = proxyquire('../src/twitterClient', {
	      'twit': TwitStub,
	      './twitterConfiguration': twitterConfigurationInstanceStub
	    });

		sinon.stub(process, 'exit');
	    twitterClient.createMetadata('Tweet', [1234, 2345], (id) => callbackId = id, inReplyToId);
	    sinon.assert.calledWithExactly(TwitStub, twitterConfiguration);
 	    expect(process.exit.calledWith(-1)).to.be.true;
 	    process.exit.restore();
  	});
});