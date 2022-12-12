'use strict';

const ds = require('../datastore');

const datastore = ds.datastore;

const LOAD = 'Load';

/**
 * Create a load.
 * @param {number} volume The volume of the load in cubic meters.
 * @param {string} item The item(s) in the load.
 * @param {string} creation_date The date the load was created.
 * @param {string} carrier The id of the boat carrying the load.
 * @returns {object} A load entity object, which contains the load id.
 */
function post_load(volume, item, creation_date, carrier) {
    let key = datastore.key(LOAD);
    const new_load = { "volume": volume, "item": item, "creation_date": creation_date, "carrier": carrier };
    return datastore.save({ "key": key, "data": new_load }).then(() => { return key });
}

/**
 * Get a single load with the specified id.
 * @param {string} id The id of the load in Datastore.
 * @returns {object} An array of length 1. If the load exists, then the element
 *  in the array is that load. Otherwise the element is undefined.
 */
function get_load(id) {
    const key = datastore.key([LOAD, parseInt(id, 10)]);
    return datastore.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity found
            return entity;
        } else {
            // Entity found. Map this array to the fromDatastore function, which
            // adds an id attribute to every element in the user entity array
            return entity.map(ds.fromDatastore);
        }
    });
}

/**
 * Get all loads.
 * @param {object} req The request object.
 * @returns {object} An object that contains up to two properties.
 *  loads: An array of load entities. If no loads exist, then the array is empty.
 *  next: A link to the next set of paginated results. Only appears if there are
 *      more results to be shown.
 */
function get_loads(req) {
    let q = datastore.createQuery(LOAD).limit(5);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
        // entities[0] is an array of load entities. Map this array to the
        // fromDatastore function, which adds an id attribute to every element
        // in the load entity array
        results.loads = entities[0].map(ds.fromDatastore);
        if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
            results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + encodeURIComponent(entities[1].endCursor);
        }
        return results;
    });
}

/**
 * Get all loads carried by a boat.
 * @param {string} boat_id The id of the boat in Datastore.
 * @returns {object} An array of load entities.
 */
function get_boat_loads(boat_id) {
    const q = datastore.createQuery(LOAD).filter('carrier', '=', boat_id);
    return datastore.runQuery(q).then((entities) => {
        // entities[0] is an array of load entities. Map this array to the
        // fromDatastore function, which adds an id attribute to every element
        // in the load entity array
        return entities[0].map(ds.fromDatastore);
    });
}

/**
 * Update a load.
 * @param {string} id The id of the load in Datastore.
 * @param {number} volume The volume of the load in cubic meters.
 * @param {string} item The item(s) in the load.
 * @param {string} creation_date The date the load was created.
 * @param {string} carrier The id of the boat carrying the load.
 * @returns {object} An object describing the update. This is not used by the app.
 */
function update_load(id, volume, item, creation_date, carrier) {
    const key = datastore.key([LOAD, parseInt(id, 10)]);
    const load = { "volume": volume, "item": item, "creation_date": creation_date, "carrier": carrier };
    return datastore.update({ "key": key, "data": load });
}

/**
 * Delete a load.
 * @param {string} id The id of the load in Datastore.
 * @returns {object} An object describing the delete. This is not used by the app.
 */
function delete_load(id) {
    const key = datastore.key([LOAD, parseInt(id, 10)]);
    return datastore.delete(key);
}

/**
 * Count all loads.
 * @returns {number} The total number of loads.
 */
function count_loads() {
    let q = datastore.createQuery(LOAD).select("__key__");
    return datastore.runQuery(q).then((entities) => {
        return entities[0].length;
    })
}

module.exports = {
    post_load,
    get_load,
    get_loads,
    get_boat_loads,
    update_load,
    delete_load,
    count_loads
};
