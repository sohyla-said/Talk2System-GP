// ============================================================
//  POJO Models — Auth Module
//  Maps to: /api/auth/signup, /api/auth/login, /api/auth/me
// ============================================================

/**
 * Request body for POST /api/auth/login
 * The backend uses OAuth2PasswordRequestForm, which requires
 * application/x-www-form-urlencoded with field 'username' (not 'email').
 */
class LoginRequest {
  constructor(email, password) {
    this.username = email;    // OAuth2PasswordRequestForm uses 'username'
    this.password = password;
  }

  toFormData() {
    const p = new URLSearchParams();
    if (this.username !== undefined) p.append('username', this.username);
    if (this.password !== undefined) p.append('password', this.password);
    return p.toString();
  }
}

/**
 * Request body for POST /api/auth/signup
 */
class SignupRequest {
  constructor(email, password, fullName) {
    this.email     = email;
    this.password  = password;
    this.full_name = fullName;
  }
}

/**
 * Response shape for POST /api/auth/login and /api/auth/signup
 */
class AuthResponse {
  constructor(data) {
    this.access_token = data.access_token;
    this.token_type   = data.token_type;
    this.user_id      = data.user_id;
    this.email        = data.email;
    this.role         = data.role;
    this.status       = data.status;
    this.full_name    = data.full_name;
  }
}

/**
 * Response shape for GET /api/auth/me
 */
class MeResponse {
  constructor(data) {
    this.user_id   = data.user_id;
    this.email     = data.email;
    this.full_name = data.full_name;
    this.role      = data.role;
    this.status    = data.status;
  }
}

module.exports = { LoginRequest, SignupRequest, AuthResponse, MeResponse };
