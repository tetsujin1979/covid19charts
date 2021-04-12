const Twit = require('twit')
const log4js = require("log4js");

const constants = require("./constants");
const twitterConfiguration = require("./twitterConfiguration").twitterConfiguration;

const client = new Twit(twitterConfiguration);

log4js.configure(constants.loggerConfiguration);
const logger = log4js.getLogger('twitterChart');

const tweetChart = (b64content, tweet, callback, inReplyToId) => {
  client.post('media/upload', { media_data: b64content }, function (err, data, response) {
    let mediaIdStr = data.media_id_string;
    let meta_params = { media_id: mediaIdStr };

    client.post('media/metadata/create', meta_params, function (err, data, response) {
      if (!err) {
        // Post a tweet with the newly uploaded media
        let params = { status: tweet, media_ids: [mediaIdStr] };
        logger.info('Sending tweet');
        logger.debug(`Tweet\t${tweet.length} characters\n${tweet}\n`);
        if (inReplyToId) {
          params.in_reply_to_status_id = inReplyToId;
        }
      	client.post('statuses/update', params, function (err, data, response) {
          if (err) {
            logger.error(`Returned error from status update: ${err}`);
          }
          else {
		        logger.debug(`Returned data from status update: ${data}`);
	          if (callback) {
        	      callback(data.id_str);
          	}
        	}
        });
      }
    });
  });
};

exports.tweetChart = tweetChart;
