'use strict';

const ds = require('../datastore');

const datastore = ds.datastore;

const USER = 'User';

/**
 * Create a user.
 * @param {string} first_name The user's first name.
 * @param {string} last_name The user's last name.
 * @param {string} user_id The sub value of the JWT used to authenticate the user.
 * @returns {object} A user entity object, which contains the user id.
 */
function post_user(first_name, last_name, user_id) {
    let key = datastore.key(USER);
    const new_user = { "first_name": first_name, "last_name": last_name, "user_id": user_id };
    return datastore.save({ "key": key, "data": new_user }).then(() => { return key });
}

/**
 * Get a single user with the specified id. Note that the id is different from
 * the user_id.
 * @param {string} id The id of the user in Datastore.
 * @returns {object} An array of length 1. If the user exists, then the element
 *  in the array is that user. Otherwise the element is undefined.
 */
function get_user(id) {
    const key = datastore.key([USER, parseInt(id, 10)]);
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
 * Get users with the specified user_id. Note that this property is different
 * from the id property.
 * @param {string} user_id The sub value of the JWT used to authenticate the user.
 * @returns {object} An array of user entities. If the user exists, then the
 *  array has a single element representing the user with the specified
 *  user_id. Otherwise the array is empty.
 */
function get_user_with_user_id(user_id) {
    const q = datastore.createQuery(USER).filter('user_id', '=', user_id);
    return datastore.runQuery(q).then((entities) => {
        // entities[0] is an array of user entities. Map this array to the
        // fromDatastore function, which adds an id attribute to every element
        // in the user entity array
        return entities[0].map(ds.fromDatastore);
    });
}

/**
 * Get all users.
 * @returns {object} An array of user entities.
 */
function get_users() {
    const q = datastore.createQuery(USER);
    return datastore.runQuery(q).then((entities) => {
        // entities[0] is an array of user entities. Map this array to the
        // fromDatastore function, which adds an id attribute to every element
        // in the user entity array
        return entities[0].map(ds.fromDatastore);
    });
}

module.exports = {
    post_user,
    get_user,
    get_user_with_user_id,
    get_users
};
