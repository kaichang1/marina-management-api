'use strict';

const {google} = require('googleapis');

const secret = require('./client-secret');

// const URL = 'http://localhost:8080'
const URL = 'https://marina-management-api.wl.r.appspot.com'
const CLIENT_ID = secret.web.client_id
const CLIENT_SECRET = secret.web.client_secret

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    `${URL}/oauth`
);

// The scopes requested by our app
const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile'
];

// The authorization URL that the user must be redirected to in order to begin the
// authorization process
const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'online',
    scope: scopes,
    include_granted_scopes: true
});

/**
 * Get the value of sub from the Bearer Token.
 * @param {string} authorization The authorization header containing the Bearer Token,
 *  which should be of the form: "Bearer <JWT>"
 * @returns {string} The value of sub from the Bearer Token's JWT.
 */
async function getSub(authorization) {
    if (authorization === undefined) {
        return null;
    }
    const token = authorization.split(' ');
    if (token[0] !== 'Bearer' || token[1] === undefined) {
        return null;
    }
    try {
        const sub = await verify(token[1])  // token[1] should contain the JWT
        return sub;
    } catch (error) {
        // Errors here can occur due to invalid Bearer Tokens (e.g. "Bearer 1")
        return null;
    }
}

/**
 * Verify the JWT and return the JWT's sub value.
 * @param {string} token The JWT.
 * @returns {string} The JWT's sub value.
 */
async function verify(token) {
    const ticket = await oauth2Client.verifyIdToken({
        idToken: token,
        audience: secret.web.client_id,
    });
    const payload = ticket.getPayload();
    return payload.sub;
}

module.exports.oauth2Client = oauth2Client;
module.exports.authorizationUrl = authorizationUrl;
module.exports.getSub = getSub;
module.exports.verify = verify;
