const fs = require('fs')
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Unit tests for chart helper', () => {
	const fsStub = {};
    const chartnsNodeCanvasInstanceStub = {
    	renderToBufferSync: sinon.stub().returns('data')
    };

    const chartjsNodeCanvasStub = {
    	ChartJSNodeCanvas: sinon.stub().returns(chartnsNodeCanvasInstanceStub)
    };
    
    beforeEach(() => {
    	fsStub.existsSync = sinon.stub().returns(true);
		fsStub.writeFileSync = sinon.stub();
		fsStub.unlinkSync = sinon.spy();
		fsStub.readFileSync = sinon.stub().returns("b64Content");
    });

  	it('should test the write chart method with a file that exists', () => {
	    const chartHelper = proxyquire('../src/chartHelper', {
	     	'chartjs-node-canvas': chartjsNodeCanvasStub,
   	     	'fs': fsStub
	    });

	    const b64Content = chartHelper.writeChart('filename', 'configuration');
	    sinon.assert.calledWithExactly(fsStub.existsSync, 'filename');
	    sinon.assert.calledWithExactly(fsStub.unlinkSync, 'filename');
	    sinon.assert.calledWithExactly(chartnsNodeCanvasInstanceStub.renderToBufferSync, 'configuration');
	    expect(b64Content).to.equal('b64Content');
	});

  	it('should test the write chart method with a file that does not exist', () => {
    	fsStub.existsSync = sinon.stub().returns(false);
	    const chartHelper = proxyquire('../src/chartHelper', {
	     	'chartjs-node-canvas': chartjsNodeCanvasStub,
   	     	'fs': fsStub
	    });

	    const b64Content = chartHelper.writeChart('filename', 'configuration');
	    sinon.assert.calledWithExactly(fsStub.existsSync, 'filename');
	    sinon.assert.notCalled(fsStub.unlinkSync);
	    sinon.assert.calledWithExactly(chartnsNodeCanvasInstanceStub.renderToBufferSync, 'configuration');
	    expect(b64Content).to.equal('b64Content');
	});

  	it('should test the write chart method and fail to write the file', () => {
		fsStub.writeFileSync = sinon.stub().throws("An error occured");
	    const chartHelper = proxyquire('../src/chartHelper', {
	     	'chartjs-node-canvas': chartjsNodeCanvasStub,
   	     	'fs': fsStub
	    });
		sinon.stub(process, 'exit');

	    chartHelper.writeChart('filename', 'configuration');
 	    expect(process.exit.calledWith(-1)).to.be.true;
 	    process.exit.restore();
	});
});