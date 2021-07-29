const constants = require('./constants');
const log4jsHelper = require('./log4jsHelper');
const twitterClient = require('./twitterClient');

const logger = log4jsHelper.getLogger('twitterHelper');

const hashtag = '#COVID19Ireland';

const debug = constants.debug();

const MAX_TWEET_LENGTH = 280;
const URL_LENGTH = 24;

let records = '';

const tweetChart = (files, tweet, callback, inReplyToId) => {
  const status = generateStatus(tweet);
  logger.debug(`Tweeting images from ${files}`);
  if (debug) {
      logger.info('DEBUG enabled - not sending tweet');
      logger.debug(`Tweet: ${status.length} characters\n${status}\n`);
      callback(1);
  } else {    
    // If file is not an array, create an array with files as its only index
    files = (Array.isArray(files) ? files : [files]);
    let mediaIds = new Array();
    files.forEach(function(file, index) { 
      twitterClient.uploadMedia(file, function(mediaId) {
        logger.debug(`Adding mediaId: ${mediaId}`);
        mediaIds.push(mediaId);
        if (mediaIds.length === files.length) {
          logger.debug(`Media uploaded\tmediaIds: ${mediaIds}`);
          twitterClient.createMetadata(status, mediaIds, callback, inReplyToId);
        }
      });
    });
  }
};

const tweetRecords = (newRecords, inReplyToId) => {
  records = newRecords;
  processRecords(inReplyToId);
};

function processRecords(inReplyToId) {
  if (records.length > 0) {
    logger.debug(`Tweeting records: ${records}`);
    let status = '';
    while((records.length) && ((records[0].length + status.length) < (MAX_TWEET_LENGTH - hashtag.length))) {
      status = status + records.shift() + '\n';
    }
    logger.debug(`Status: ${status}`);      
    tweetStatus(`${status}${hashtag}`, processRecords, inReplyToId);
  } else {
    return;
  }  
}

function tweetStatus(tweet, callback, inReplyToId) {
  logger.debug(`Updating twitter status`);
  if (debug) {
    logger.info('DEBUG enabled - not updating twitter');
    logger.debug(`Tweet: ${tweet.length} characters\n${tweet}\n`);
    callback(1);
  } else {    
    let params = { status: tweet};
    if (inReplyToId) {
      params.in_reply_to_status_id = inReplyToId;
    }
    twitterClient.updateStatus(params, callback);
  }
}

function generateStatus(tweet) {
  let retVal = '';
  if (tweet.status.length < MAX_TWEET_LENGTH) {
    retVal = tweet.status;
    if (retVal.length + URL_LENGTH < MAX_TWEET_LENGTH) {
      const statusLength = retVal.length + URL_LENGTH;
      retVal = tweet.status + "\n" + tweet.url;
      if (statusLength + hashtag.length < MAX_TWEET_LENGTH) {
        retVal = retVal + "\n" + hashtag;
      }
    } else if (retVal.length + hashtag.length < MAX_TWEET_LENGTH) {
      retVal = retVal + "\n" + hashtag;    
    }
  }
  return retVal;
}

exports.tweetChart = tweetChart;
exports.tweetRecords = tweetRecords;
