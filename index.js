'use strict';

const router = module.exports = require('express').Router();

router.use('/', require('./controllers/home-controller'));
router.use('/users', require('./controllers/users-controller'));
router.use('/boats', require('./controllers/boats-controller'));
router.use('/loads', require('./controllers/loads-controller'));
