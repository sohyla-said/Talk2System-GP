require('dotenv').config();
const apiClient                          = require('../config/apiClient');
const { LoginRequest, AuthResponse }     = require('../models/AuthModels');

/**
 * Logs in with the given credentials and returns a Bearer token string.
 * Throws a clear error if login fails so tests fail with a useful message.
 */
async function loginAs(email, password) {
  const body = new LoginRequest(email, password);
  const res  = await apiClient.post('/api/auth/login', body.toFormData(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (res.status !== 200) {
    throw new Error(
      `authHelper.loginAs failed for ${email} — HTTP ${res.status}: ${JSON.stringify(res.data)}`
    );
  }

  const auth = new AuthResponse(res.data);
  return auth.access_token;
}

/** Returns a Bearer token for the project_manager test account */
async function getManagerToken() {
  return loginAs(process.env.TEST_MANAGER_EMAIL, process.env.TEST_MANAGER_PASSWORD);
}

/** Returns a Bearer token for the participant test account */
async function getUserToken() {
  return loginAs(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
}

/** Returns a Bearer token for the admin test account */
async function getAdminToken() {
  return loginAs(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
}

/** Returns an Authorization header object ready to pass to apiClient */
function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { loginAs, getManagerToken, getUserToken, getAdminToken, authHeader };
