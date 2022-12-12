'use strict';

const ds = require('../datastore');

const datastore = ds.datastore;

const BOAT = 'Boat';

/**
 * Create a boat.
 * @param {string} owner The user_id of the user that owns the boat. Note that this
 *  property is different from the id property.
 * @param {string} name The name of the boat.
 * @param {string} type The type of the boat. E.g. Sailboat, Catamaran, etc.
 * @param {number} length The length of the boat in meters.
 * @param {object} loads An array representing the loads carried by the boat.
 * @returns {object} A boat entity object, which contains the boat id.
 */
function post_boat(owner, name, type, length, loads) {
    let key = datastore.key(BOAT);
    const new_boat = { "owner": owner, "name": name, "type": type, "length": length, "loads": loads };
    return datastore.save({ "key": key, "data": new_boat }).then(() => { return key });
}

/**
 * Get a single boat with the specified id.
 * @param {string} id The id of the boat in Datastore.
 * @returns {object} An array of length 1. If the boat exists, then the element
 *  in the array is that boat. Otherwise the element is undefined.
 */
function get_boat(id) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
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
 * Get all boats owned by the user with the specified user_id. Note that this
 * property is different from the id property.
 * @param {object} req The request object.
 * @param {string} user_id The sub value of the JWT used to authenticate the user.
 * @returns {object} An object that contains up to two properties.
 *  boats: An array of boat entities owned by the user. If the user does not own
 *      any boats, then the array is empty.
 *  next: A link to the next set of paginated results. Only appears if there are
 *      more results to be shown.
 */
function get_user_boats(req, user_id) {
    let q = datastore.createQuery(BOAT).filter('owner', '=', user_id).limit(5);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
        // entities[0] is an array of boat entities. Map this array to the
        // fromDatastore function, which adds an id attribute to every element
        // in the boat entity array
        results.boats = entities[0].map(ds.fromDatastore);
        if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
            results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + encodeURIComponent(entities[1].endCursor);
        }
        return results;
    });
}

/**
 * Update a boat.
 * @param {string} id The id of the boat in Datastore.
 * @param {string} owner The user_id of the user that owns the boat. Note that this
 *  property is different from the id property.
 * @param {string} name The name of the boat.
 * @param {string} type The type of the boat. E.g. Sailboat, Catamaran, etc.
 * @param {number} length The length of the boat in meters.
 * @param {object} loads An array representing the loads carried by the boat.
 * @returns {object} An object describing the update. This is not used by the app.
 */
function update_boat(id, owner, name, type, length, loads) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    const boat = { "owner": owner, "name": name, "type": type, "length": length, "loads": loads };
    return datastore.update({ "key": key, "data": boat });
}

/**
 * Delete a boat.
 * @param {string} id The id of the boat in Datastore.
 * @returns {object} An object describing the delete. This is not used by the app.
 */
function delete_boat(id) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    return datastore.delete(key);
}

/**
 * Count all boats owned by the user.
 * @param {string} user_id The sub value of the JWT used to authenticate the user.
 * @returns {number} The total number of boats owned by the user.
 */
function count_boats(user_id) {
    let q = datastore.createQuery(BOAT).filter('owner', '=', user_id).select("__key__");
    return datastore.runQuery(q).then((entities) => {
        return entities[0].length;
    })
}

module.exports = {
    post_boat,
    get_boat,
    get_user_boats,
    update_boat,
    delete_boat,
    count_boats
};
