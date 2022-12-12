'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const usersModel = require('../models/users-model');

router.use(bodyParser.json());

/**
 * Get all users.
 */
router.get('/', function (req, res) {
    const accepts = req.accepts(['application/json']);
    if(!accepts){
        res.status(406).json({ 'Error': 'The requested media type is not acceptable' });
    } else {
        usersModel.get_users()
        .then((users) => {
            res.status(200).json(users);
        });
    }
});

router.post('/', function (req, res){
    res.set('Accept', 'GET');
    res.status(405).end();
});

router.put('/', function (req, res){
    res.set('Accept', 'GET');
    res.status(405).end();
});

router.patch('/', function (req, res){
    res.set('Accept', 'GET');
    res.status(405).end();
});

router.delete('/', function (req, res){
    res.set('Accept', 'GET');
    res.status(405).end();
});

module.exports = router;
