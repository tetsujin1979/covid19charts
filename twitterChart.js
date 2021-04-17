const Twit = require('twit')
const log4js = require("log4js");

const constants = require("./constants");
const twitterConfiguration = require("./twitterConfiguration").twitterConfiguration;

const client = new Twit(twitterConfiguration);

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('twitterChart');

const tweetChart = (files, tweet, callback, inReplyToId) => {
  logger.debug(`Tweeting images from ${files}`);
  if (constants.debug) {
      logger.info('Sending tweet');
      logger.debug(`Tweet\t${tweet.length} characters\n${tweet}\n`);
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
          updateStatus(tweet, mediaIds, callback, inReplyToId);
        }
      });
    });
  }
};

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

function updateStatus(tweet, mediaIds, callback, inReplyToId) {
  logger.debug('Updating twitter status');
  let meta_params = {media_id: mediaIds[0]};
  client.post('media/metadata/create', meta_params, function (err, data, response) {
    if (!err) {
      // Post a tweet with the newly uploaded media
      let params = { status: tweet, media_ids: mediaIds};
      logger.info('Sending tweet');
      logger.debug(`Tweet\t${tweet.length} characters\n${tweet}\n`);
      if (inReplyToId) {
        params.in_reply_to_status_id = inReplyToId;
      }
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
    } else {
      logger.error(`Error creating metadata\t${err}`);
      process.exit(-1);
    }
  });
}
exports.tweetChart = tweetChart;
