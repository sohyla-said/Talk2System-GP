require('dotenv').config();
const axios = require('axios');
const http  = require('http');
const https = require('https');

/**
 * Shared Axios instance for all Talk2System API tests.
 * - baseURL is read from .env so switching between local/deployed is one line change
 * - validateStatus always returns true so every HTTP status reaches the test assertion
 *   (axios would otherwise throw on 4xx/5xx and hide the real status code)
 * - keepAlive: false prevents Jest from hanging after the test run completes,
 *   which happens when Axios holds an open connection in the default keep-alive pool
 */
const apiClient = axios.create({
  baseURL:    process.env.BASE_URL,
  headers:    { 'Content-Type': 'application/json' },
  validateStatus: () => true,
  httpAgent:  new http.Agent({ keepAlive: false }),
  httpsAgent: new https.Agent({ keepAlive: false }),
});

module.exports = apiClient;
