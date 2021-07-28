const Twit = require('twit')
const log4jsHelper = require('./log4jsHelper');
const twitterConfiguration = require('./twitterConfiguration').twitterConfiguration();

const logger = log4jsHelper.getLogger('twitterClient');

const twitterClient = new Twit(twitterConfiguration);

function createMetadata(tweet, mediaIds, callback, inReplyToId) {
	let meta_params = {media_id: mediaIds[0]};
	twitterClient.post('media/metadata/create', meta_params, function (err, data, response) {
    if (err) {
      logger.error(`Error creating metadata\t${err}`);
      process.exit(-1);
		} else {
       // Post a tweet with the newly uploaded media
      let params = { status: tweet, media_ids: mediaIds};
      if (inReplyToId) {
        params.in_reply_to_status_id = inReplyToId;
      }
      updateStatus(params, callback);
		}
	});
}

function uploadMedia(b64content, callback) {
  logger.debug(`Uploading content`);
  twitterClient.post('media/upload', { media: b64content }, function (err, data, response) {
    if (err) {
      logger.error(`Error occured uploading content\t${err}`);
      process.exit(-1);
    } else {
      callback(data.media_id_string);
    }
  });
}

function updateStatus(params, callback) {
  logger.info('Sending tweet');
  logger.debug(`Tweet: ${params.status.length} characters\n${params.status}\n`);
  twitterClient.post('statuses/update', params, function (err, data, response) {
    if (err) {
      logger.error(`Error occured updating status\t${err}`);
      // Not ideal, but this will mean the next tweet is posted to twitter
      callback(params.in_reply_to_status_id);
    }
    else {
      logger.debug(`Returned data from status update\t${data}`);
      if (callback) {
        callback(data.id_str);
      }
    }
  });
}

exports.createMetadata = createMetadata;
exports.updateStatus = updateStatus;
exports.uploadMedia = uploadMedia;
