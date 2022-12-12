'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const auth = require('../auth');
const boatsModel = require('../models/boats-model');
const loadsModel = require('../models/loads-model');

router.use(bodyParser.json());

/**
 * Check attributes in the request body.
 * @param {object} req The request object.
 * @param {bool} all true if all attributes are required, else false.
 *  POST and PUT requests require all attributes. PATCH requests do not.
 * @returns {bool} true if the request attributes are appropriate, else false.
 */
function checkAttributes(req, all = true) {
    // Check number of attributes
    if (all === true) {
        if (Object.keys(req.body).length !== 3) {
            return false;
        }
    } else {
        if (Object.keys(req.body).length === 0) {
            return false;
        }
    }
    // Check if attributes are allowed
    const allowed = ['name', 'type', 'length'];
    for (const attr in req.body) {
        if (!allowed.includes(attr)) {
            return false;
        }
    }
    return true;
}

/**
 * Add self links to a boat object.
 * This function adds self links to the boat itself in addition to all loads on
 * the boat.
 * @param {object} boat The boat object.
 */
function addSelfLinks(req, boat) {
    // Add self link to boat
    boat.self = req.protocol + '://' + req.get('host') + req.baseUrl + '/' + boat.id;
    // Add self links for all loads in the boat
    for (let i = 0; i < boat.loads.length; i++) {
        const loadId = boat.loads[i];
        const loadURL = req.protocol + '://' + req.get('host') + '/loads/' + loadId;
        const loadObject = {'id': loadId, 'self': loadURL};
        boat.loads[i] = loadObject;
    }
}

/**
 * Create a boat.
 * The request must contain a valid JWT for authentication.
 * The created boat’s owner attribute is automatically populated using the JWT's sub value.
 */
router.post('/', function (req, res) {
    if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ 'Error': 'The sent media type is unsupported' });
    } else if (!checkAttributes(req)) {
        res.status(400).json({ 'Error': 'The request attributes do not match the required attributes' });
    } 
    else {
        // Get the JWT's sub value
        auth.getSub(req.headers.authorization)
        .then(sub => {
            if (sub === null) {
                res.status(401).json({'Error': 'Authentication failed. The token is missing, expired, or invalid'});
            } else {
                boatsModel.post_boat(sub, req.body.name, req.body.type, req.body.length, [])
                .then(key => {
                    boatsModel.get_boat(key.id)
                    .then(boat => {
                        addSelfLinks(req, boat[0]);
                        res.status(201).json(boat[0]);
                    });
                });
            }
        });
    }
});

/**
 * Get a boat.
 * The request must contain a valid JWT for authentication.
 * The boat must be owned by the requesting user.
 */
router.get('/:id', function (req, res) {
    const accepts = req.accepts(['application/json']);
    if(!accepts){
        res.status(406).json({ 'Error': 'The requested media type is not acceptable' });
    } else {
        // Get the JWT's sub value
        auth.getSub(req.headers.authorization)
        .then(sub => {
            if (sub === null) {
                res.status(401).json({'Error': 'Authentication failed. The token is missing, expired, or invalid'});
            } else {
                boatsModel.get_boat(req.params.id)
                .then(boat => {
                    if (boat[0] === undefined || boat[0] === null) {
                        res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
                    } else if (boat[0].owner !== sub) {
                        res.status(403).json({ 'Error': 'The boat is owned by someone else' });
                    } else {
                        addSelfLinks(req, boat[0]);
                        res.status(200).json(boat[0]);
                    }
                });
            }
        });
    }
});

/**
 * Get all boats owned by the requesting user.
 * The request must contain a valid JWT for authentication.
 */
router.get('/', function (req, res) {
    const accepts = req.accepts(['application/json']);
    if(!accepts){
        res.status(406).json({ 'Error': 'The requested media type is not acceptable' });
    } else {
        // Get the JWT's sub value
        auth.getSub(req.headers.authorization)
        .then(sub => {
            if (sub === null) {
                res.status(401).json({'Error': 'Authentication failed. The token is missing, expired, or invalid'});
            } else {
                // Get all boats whose owner property matches sub
                boatsModel.get_user_boats(req, sub)
                .then((boats) => {
                    // Add self links
                    for (let boat of boats.boats) {
                        addSelfLinks(req, boat);
                    }
                    // Count all boats owned by the user
                    boatsModel.count_boats(sub)
                    .then(count => {
                        boats.total = count;
                        res.status(200).json(boats);
                    })
                });
            }
        });
    }
});

/**
 * Update a boat with PUT.
 * The request must contain a valid JWT for authentication.
 * The boat must be owned by the requesting user.
 */
router.put('/:id', function (req, res) {
    if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ 'Error': 'The sent media type is unsupported' });
    } else if (!checkAttributes(req)) {
        res.status(400).json({ 'Error': 'The request attributes do not match the required attributes' });
    } 
    else {
        // Get the JWT's sub value
        auth.getSub(req.headers.authorization)
        .then(sub => {
            if (sub === null) {
                res.status(401).json({'Error': 'Authentication failed. The token is missing, expired, or invalid'});
            } else {
                boatsModel.get_boat(req.params.id)
                .then(boat => {
                    if (boat[0] === undefined || boat[0] === null) {
                        res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
                    } else if (boat[0].owner !== sub) {
                        res.status(403).json({ 'Error': 'The boat is owned by someone else' });
                    } else {
                        boatsModel.update_boat(req.params.id, sub, req.body.name, req.body.type, req.body.length, boat[0].loads)
                        .then(() => {
                            boatsModel.get_boat(req.params.id)
                            .then(updated_boat => {
                                addSelfLinks(req, updated_boat[0]);
                                res.status(200).json(updated_boat[0]);
                            });
                        });
                    }
                });
            }
        });
    }
});

/**
 * Update a boat with PATCH.
 * The request must contain a valid JWT for authentication.
 * The boat must be owned by the requesting user.
 */
router.patch('/:id', function (req, res) {
    if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ 'Error': 'The sent media type is unsupported' });
    } else if (!checkAttributes(req, false)) {
        res.status(400).json({ 'Error': 'The request attributes do not match the required attributes' });
    } 
    else {
        // Get the JWT's sub value
        auth.getSub(req.headers.authorization)
        .then(sub => {
            if (sub === null) {
                res.status(401).json({'Error': 'Authentication failed. The token is missing, expired, or invalid'});
            } else {
                boatsModel.get_boat(req.params.id)
                .then(boat => {
                    if (boat[0] === undefined || boat[0] === null) {
                        res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
                    } else if (boat[0].owner !== sub) {
                        res.status(403).json({ 'Error': 'The boat is owned by someone else' });
                    } else {
                        let name = req.body.name;
                        let type = req.body.type;
                        let length = req.body.length;

                        if (name === undefined) {
                            name = boat[0].name;
                        }
                        if (type === undefined) {
                            type = boat[0].type;
                        }
                        if (length === undefined) {
                            length = boat[0].length;
                        }
                        boatsModel.update_boat(req.params.id, sub, name, type, length, boat[0].loads)
                        .then(() => {
                            boatsModel.get_boat(req.params.id)
                            .then(updated_boat => {
                                addSelfLinks(req, updated_boat[0]);
                                res.status(200).json(updated_boat[0]);
                            });
                        });
                    }
                });
            }
        });
    }
});

/**
 * Delete a boat.
 * The request must contain a valid JWT for authentication.
 * The boat must be owned by the requesting user.
 * This unloads any loads that were loaded onto the boat.
 */
router.delete('/:id', function (req, res) {
    auth.getSub(req.headers.authorization)
    .then(sub => {
        if (sub === null) {
            res.status(401).json({'Error': 'Authentication failed. The token is missing, expired, or invalid'});
        } else {
            boatsModel.get_boat(req.params.id)
            .then(boat => {
                if (boat[0] === undefined || boat[0] === null) {
                    res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
                } else if (boat[0].owner !== sub) {
                    res.status(403).json({ 'Error': 'The boat is owned by someone else' });
                } else {
                    // Delete the boat
                    boatsModel.delete_boat(req.params.id)
                    .then(() => {
                        // Update the carrier property for all loads carried by this boat
                        loadsModel.get_boat_loads(req.params.id)
                        .then(loads => {
                            // Handle multiple promises
                            const promises = [];
                            for (let load of loads) {
                                promises.push(loadsModel.update_load(load.id, 
                                    load.volume, load.item, load.creation_date, null));
                            }
                            // Send status only after all promises have resolved
                            Promise.all(promises).then(res.status(204).end());
                        });
                    });
                }
            });
        }
    });
});

/**
 * Assign load to boat.
 */
 router.put('/:boat_id/loads/:load_id', function (req, res) {
    auth.getSub(req.headers.authorization)
    .then(sub => {
        if (sub === null) {
            res.status(401).json({'Error': 'Authentication failed. The token is missing, expired, or invalid'});
        } else {
            boatsModel.get_boat(req.params.boat_id)
            .then(boat => {
                if (boat[0] === undefined || boat[0] === null) {
                    res.status(404).json({ 'Error': 'The specified boat and/or load does not exist' });
                } else if (boat[0].owner !== sub) {
                    res.status(403).json({ 'Error': 'The boat is owned by someone else or the load is already loaded on another boat' });
                } else {
                    loadsModel.get_load(req.params.load_id)
                    .then(load => {
                        if (load[0] === undefined || load[0] === null) {
                            res.status(404).json({ 'Error': 'The specified boat and/or load does not exist' });
                        } else if (load[0].carrier !== null) {
                            if (load[0].carrier === req.params.boat_id) {
                                // Load is already assigned to the boat
                                res.status(204).end();
                            } else {
                                // Load is already assigned to another boat
                                res.status(403).json({ 'Error': 'The boat is owned by someone else or the load is already loaded on another boat' });
                            }
                        } else {
                            // Assign load to boat. Update the load so that the carrier is the boat
                            loadsModel.update_load(req.params.load_id, load[0].volume, load[0].item, load[0].creation_date, req.params.boat_id)
                            .then(() => {
                                // Update the boat's loads property to include the newly assigned load
                                boat[0].loads.push(req.params.load_id);
                                boatsModel.update_boat(req.params.boat_id, boat[0].owner,
                                    boat[0].name, boat[0].type, boat[0].length, boat[0].loads)
                                .then(res.status(204).end());
                            });
                        }
                    });
                }
            });
        }
    });
});

/**
 * Remove load from boat.
 */
 router.delete('/:boat_id/loads/:load_id', function (req, res) {
    auth.getSub(req.headers.authorization)
    .then(sub => {
        if (sub === null) {
            res.status(401).json({'Error': 'Authentication failed. The token is missing, expired, or invalid'});
        } else {
            boatsModel.get_boat(req.params.boat_id)
            .then(boat => {
                if (boat[0] === undefined || boat[0] === null) {
                    res.status(404).json({ 'Error': 'No load with this load_id is at the boat with this boat_id' });
                } else if (boat[0].owner !== sub) {
                    res.status(403).json({ 'Error': 'The boat is owned by someone else' });
                } else {
                    loadsModel.get_load(req.params.load_id)
                    .then(load => {
                        if (load[0] === undefined || load[0] === null) {
                            res.status(404).json({ 'Error': 'No load with this load_id is at the boat with this boat_id' });
                        } else if (load[0].carrier !== req.params.boat_id) {
                            res.status(404).json({ 'Error': 'No load with this load_id is at the boat with this boat_id' });
                        } else {
                            // Remove load from boat. Update the load so that the carrier is null
                            loadsModel.update_load(req.params.load_id, load[0].volume, load[0].item, load[0].creation_date, null)
                            .then(() => {
                                // Remove the load from the loads array
                                const index = boat[0].loads.indexOf(req.params.load_id);
                                if (index > -1) {
                                    boat[0].loads.splice(index, 1);
                                }
                                // Update the boat's loads property to remove the specified load
                               boatsModel.update_boat(req.params.boat_id, boat[0].owner,
                                    boat[0].name, boat[0].type, boat[0].length, boat[0].loads)
                                .then(res.status(204).end());
                            });
                        }
                    });
                }
            });
        }
    });
});

router.put('/', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

router.patch('/', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

router.delete('/', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

module.exports = router;
