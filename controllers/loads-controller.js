'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

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
    const allowed = ['volume', 'item', 'creation_date'];
    for (const attr in req.body) {
        if (!allowed.includes(attr)) {
            return false;
        }
    }
    return true;
}

/**
 * Add self links to a load object.
 * This function adds self links to the load itself in addition its carrier property.
 * @param {object} load The load object.
 */
 function addSelfLinks(req, load) {
    // Add self link to load
    load.self = req.protocol + '://' + req.get('host') + req.baseUrl + '/' + load.id;
    // Add self link to carrier
    if (load.carrier !== undefined && load.carrier !== null) {
        const boatId = load.carrier;
        const boatURL = req.protocol + '://' + req.get('host') + '/boats/' + boatId;
        const boatObject = {'id': boatId, 'self': boatURL};
        load.carrier = boatObject;
    }
}

/**
 * Create a load.
 */
router.post('/', function (req, res) {
    if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ 'Error': 'The sent media type is unsupported' });
    } else if (!checkAttributes(req)) {
        res.status(400).json({ 'Error': 'The request attributes do not match the required attributes' });
    } 
    else {
        loadsModel.post_load(req.body.volume, req.body.item, req.body.creation_date, null)
        .then(key => {
            loadsModel.get_load(key.id)
            .then(load => {
                addSelfLinks(req, load[0]);
                res.status(201).json(load[0]);
            });
        });
    }
});

/**
 * Get a load.
 */
router.get('/:id', function (req, res) {
    const accepts = req.accepts(['application/json']);
    if(!accepts){
        res.status(406).json({ 'Error': 'The requested media type is not acceptable' });
    } else {
        loadsModel.get_load(req.params.id)
        .then(load => {
            if (load[0] === undefined || load[0] === null) {
                res.status(404).json({ 'Error': 'No load with this load_id exists' });
            } else {
                addSelfLinks(req, load[0]);
                res.status(200).json(load[0]);
            }
        });
    }
});

/**
 * Get all loads.
 */
router.get('/', function (req, res) {
    const accepts = req.accepts(['application/json']);
    if(!accepts){
        res.status(406).json({ 'Error': 'The requested media type is not acceptable' });
    } else {
        // Get all loads
        loadsModel.get_loads(req)
        .then((loads) => {
            // Add self links
            for (let load of loads.loads) {
                addSelfLinks(req, load);
            }
            // Count all loads
            loadsModel.count_loads()
            .then(count => {
                loads.total = count;
                res.status(200).json(loads);
            })
        });
    }
});

/**
 * Update a load with PUT.
 */
router.put('/:id', function (req, res) {
    if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ 'Error': 'The sent media type is unsupported' });
    } else if (!checkAttributes(req)) {
        res.status(400).json({ 'Error': 'The request attributes do not match the required attributes' });
    } 
    else {
        loadsModel.get_load(req.params.id)
        .then(load => {
            if (load[0] === undefined || load[0] === null) {
                res.status(404).json({ 'Error': 'No load with this load_id exists' });
            } else {
                loadsModel.update_load(req.params.id, req.body.volume, req.body.item, req.body.creation_date, load[0].carrier)
                .then(() => {
                    loadsModel.get_load(req.params.id)
                    .then(updated_load => {
                        addSelfLinks(req, updated_load[0]);
                        res.status(200).json(updated_load[0]);
                    });
                });
            }
        });
    }
});

/**
 * Update a load with PATCH.
 */
router.patch('/:id', function (req, res) {
    if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ 'Error': 'The sent media type is unsupported' });
    } else if (!checkAttributes(req, false)) {
        res.status(400).json({ 'Error': 'The request attributes do not match the required attributes' });
    } 
    else {
        loadsModel.get_load(req.params.id)
        .then(load => {
            if (load[0] === undefined || load[0] === null) {
                res.status(404).json({ 'Error': 'No load with this load_id exists' });
            } else {
                let volume = req.body.volume;
                let item = req.body.item;
                let creation_date = req.body.creation_date;

                if (volume === undefined) {
                    volume = load[0].volume;
                }
                if (item === undefined) {
                    item = load[0].item;
                }
                if (creation_date === undefined) {
                    creation_date = load[0].creation_date;
                }
                loadsModel.update_load(req.params.id, volume, item, creation_date, load[0].carrier)
                .then(() => {
                    loadsModel.get_load(req.params.id)
                    .then(updated_load => {
                        addSelfLinks(req, updated_load[0]);
                        res.status(200).json(updated_load[0]);
                    });
                });
            }
        });
    }
});

/**
 * Delete a load.
 * This updates the carrier boat accordingly.
 */
router.delete('/:id', function (req, res) {
    loadsModel.get_load(req.params.id)
    .then(load => {
        if (load[0] === undefined || load[0] === null) {
            res.status(404).json({ 'Error': 'No load with this load_id exists' });
        } else {
            // Delete the load
            loadsModel.delete_load(req.params.id)
            .then(() => {
                if (load[0].carrier !== null) {
                    // Get the carrier boat
                    boatsModel.get_boat(load[0].carrier)
                    .then(boat => {
                        // Update the carrier boat's loads property
                        const index = boat[0].loads.indexOf(req.params.id);
                        if (index > -1) {
                            boat[0].loads.splice(index, 1);
                        }
                        boatsModel.update_boat(boat[0].id, boat[0].owner, boat[0].name, boat[0].type, boat[0].length, boat[0].loads)
                        .then(res.status(204).end());
                    })
                } else {
                    res.status(204).end();
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
