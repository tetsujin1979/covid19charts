const Twit = require('twit')
const log4js = require("log4js");

const constants = require("./constants");
const twitterConfiguration = require("./twitterConfiguration").twitterConfiguration;

const client = new Twit(twitterConfiguration);

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('twitterHelper');

const hashtag = constants.hashtag;

let records = '';

const tweetChart = (files, tweet, callback, inReplyToId) => {
  logger.debug(`Tweeting images from ${files}`);
  if (constants.debug) {
      logger.info('DEBUG enabled - not sending tweet');
      logger.debug(`Tweet: ${tweet.length} characters\n${tweet}\n`);
      callback(1);
  } else {    
    if (!Array.isArray(files)) {
      let newFiles = new Array();
      newFiles.push(files);
      files = newFiles;
    }
    let mediaIds = new Array();
    files.forEach(function(file, index) { 
      uploadMedia(file, function(mediaId) {
        logger.debug(`Adding mediaId: ${mediaId}`);
        mediaIds.push(mediaId);
        if (mediaIds.length === files.length) {
          logger.debug(`Media uploaded\tmediaIds: ${mediaIds}`);
          createMetadata(tweet, mediaIds, callback, inReplyToId);
        }
      });
    });
  }
};

function tweetStatus(tweet, callback, inReplyToId) {
  logger.debug(`Updating twitter status`);
  if (constants.debug) {
    logger.info('DEBUG enabled - not updating twitter');
    logger.debug(`Tweet: ${tweet.length} characters\n${tweet}\n`);
    callback(1);
  } else {    
    let params = { status: tweet};
    if (inReplyToId) {
      params.in_reply_to_status_id = inReplyToId;
    }
    updateStatus(params, callback);
  }
}

function uploadMedia(b64content, callback) {
  logger.debug(`Uploading content`);
  client.post('media/upload', { media: b64content }, function (err, data, response) {
    if (!err) {
      let mediaId = data.media_id_string;
      callback(mediaId);
    } else {
      logger.error(`Error occured uploading content\t${err}`);
      process.exit(-1);
    }
  });
}

function createMetadata(tweet, mediaIds, callback, inReplyToId) {
  let meta_params = {media_id: mediaIds[0]};
  client.post('media/metadata/create', meta_params, function (err, data, response) {
    if (!err) {
      // Post a tweet with the newly uploaded media
      let params = { status: tweet, media_ids: mediaIds};
      if (inReplyToId) {
        params.in_reply_to_status_id = inReplyToId;
      }
      updateStatus(params, callback);
    } else {
      logger.error(`Error creating metadata\t${err}`);
      process.exit(-1);
    }
  });
}

function updateStatus(params, callback) {
  logger.info('Sending tweet');
  logger.debug(`Tweet: ${params.status.length} characters\n${params.status}\n`);
  client.post('statuses/update', params, function (err, data, response) {
    if (err) {
      logger.error(`Error occured updating status\t${err}`);
    }
    else {
      logger.debug(`Returned data from status update\t${data}`);
      if (callback) {
        callback(data.id_str);
      }
    }
  });
}

const tweetRecords = (newRecords, inReplyToId) => {
  records = newRecords;
  processRecords(inReplyToId);
};

function processRecords(inReplyToId) {
  if (records.length > 0) {
    logger.debug(`Tweeting records: ${records}`);
    let status = '';
    while((records.length) && ((records[0].length + status.length) < (280 - hashtag.length))) {
      status = status + records.shift() + '\n';
      logger.debug(`Status: ${status}`);      
    }
    tweetStatus(status + `${hashtag}`, processRecords, inReplyToId);
  }    
}

exports.tweetChart = tweetChart;
exports.tweetRecords = tweetRecords;
