'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const path = require(`path`);
const axios = require('axios');

const auth = require('../auth');
const usersModel = require('../models/users-model');

const oauth2Client = auth.oauth2Client;

router.use(bodyParser.json());

/**
 * Get homepage.
 */
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/welcome.html'));
});

/**
 * Post homepage. This redirects the user to Google to request app permissions
 * and begin the authorization process.
 */
router.post('/', (req, res) => {
    res.redirect(auth.authorizationUrl);
});

/**
 * Application redirect page. After the user accepts app permissions, they are
 * redirected here.
 */
router.get('/oauth', (req, res) => {
    // Exchange authorization code for access token
    oauth2Client.getToken(req.query.code)
    .then(tokens => {
        const token = tokens.tokens;
        // Use the Google People API to get the user information
        axios.get('https://people.googleapis.com/v1/people/me?personFields=names', {
            headers: {
                Authorization: 'Bearer ' + token.access_token
            }
        })
        .then(function (response) {
            // Get the JWT's sub value, which will represent the user ID
            auth.verify(token.id_token)
            .then(sub => {
                const first_name = response.data.names[0].givenName;
                const last_name = response.data.names[0].familyName;
                const html = 
                    "<html>" +
                        "<head>" +
                            "<title>OAuth 2.0 Implementation</title>" +
                        "</head>" +
                        "<body>" +
                            "<h1>User Info</h1>" +
                            "<ul>" +
                                "<li>First Name: " + first_name + "</li>" +
                                "<li>Last Name: " + last_name + "</li>" +
                                "<li>User ID: " + sub + "</li>" +
                                "<li>JWT: " + token.id_token + "</li>" +
                            "</ul>" +
                        "</body>" +
                    "</html>";
                // Check if the user entity is already registered in the database
                usersModel.get_user_with_user_id(sub)
                .then(userWithUserId => {
                    if (userWithUserId[0] !== undefined) {
                        // User is already registered
                        res.status(200).send(html);
                    }
                    else {
                        // User is not registered. Create the user entity
                        usersModel.post_user(first_name, last_name, sub)
                        .then(key => { 
                            usersModel.get_user(key.id)
                            .then(() => {
                                res.status(201).send(html);
                            });
                        });
                    }
                });
            });
        })
        .catch(function (error) {
            console.log(error);
        });
    });
});

module.exports = router;
