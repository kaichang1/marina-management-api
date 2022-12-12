'use strict';

const {Datastore} = require('@google-cloud/datastore');

/**
 * Function description taken from Google.
 * Source: https://github.com/GoogleCloudPlatform/nodejs-getting-started/blob/8bb3d70596cb0c1851cd587d393faa76bfad8f80/2-structured-data/books/model-datastore.js
 * 
 * Translates from Datastore's entity format to the format expected by the application.
 * 
 * Datastore format:
 *   {
 *     key: [kind, id],
 *     data: {
 *       property: value
 *     }
 *   }
 * 
 * Application format:
 *   {
 *     id: id,
 *     property: value
 *   }
 */
function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

module.exports.Datastore = Datastore;
module.exports.datastore = new Datastore();
module.exports.fromDatastore = fromDatastore;
