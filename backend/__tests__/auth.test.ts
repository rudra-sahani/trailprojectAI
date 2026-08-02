import express from 'express';
import authRoutes from '../routes/auth.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { db } from '../repositories/db.js';

// Minimal test runner assertion helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runAuthTests() {
  console.log('🧪 Running VeriReview AI Production Authentication Test Suite...\n');

  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);

  // Test protected route
  app.get('/api/v1/test/protected', authMiddleware, (req: AuthenticatedRequest, res) => {
    res.json({ success: true, user: req.user });
  });

  // Test RBAC route (HR Admin only)
  app.get('/api/v1/test/hr-only', authMiddleware, rbacMiddleware(['HR_ADMIN']), (req: AuthenticatedRequest, res) => {
    res.json({ success: true, message: 'Welcome HR Admin' });
  });

  const server = app.listen(0);
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}/api/v1/auth`;
  const testUrl = `http://localhost:${address.port}/api/v1/test`;

  try {
    // ------------------------------------------------------------------------
    // 1. Signup Flow
    // ------------------------------------------------------------------------
    console.log('Test 1: User Signup & Verification Code Generation...');
    const testEmail = `test.user.${Date.now()}@verireview.ai`;
    const signupRes = await fetch(`${baseUrl}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword2026!',
        full_name: 'Test Candidate',
        role: 'EMPLOYEE'
      })
    });
    const signupData = await signupRes.json();
    assert(signupRes.status === 201, `Signup failed with status ${signupRes.status}`);
    assert(signupData.success === true, 'Signup response success should be true');
    assert(!!signupData.data.verificationCode, 'Verification code should be returned in signup response');
    const verificationCode = signupData.data.verificationCode;
    console.log('   ✅ Signup successful. Verification Code:', verificationCode);

    // ------------------------------------------------------------------------
    // 2. Unverified Login Attempt Block
    // ------------------------------------------------------------------------
    console.log('Test 2: Login Before Email Verification (Should Fail 403)...');
    const unverifiedLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword2026!'
      })
    });
    assert(unverifiedLoginRes.status === 403, `Expected status 403 for unverified user, got ${unverifiedLoginRes.status}`);
    console.log('   ✅ Login blocked before verification as expected.');

    // ------------------------------------------------------------------------
    // 3. Email Verification
    // ------------------------------------------------------------------------
    console.log('Test 3: Verify Email with Verification Code...');
    const verifyRes = await fetch(`${baseUrl}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: verificationCode
      })
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200, `Verification failed with status ${verifyRes.status}`);
    assert(!!verifyData.data.accessToken, 'Access token should be returned upon successful verification');
    console.log('   ✅ Email successfully verified.');

    // ------------------------------------------------------------------------
    // 4. Verification Code Single-Use Enforcement
    // ------------------------------------------------------------------------
    console.log('Test 4: Re-using Verification Code (Should Fail 400)...');
    const reuseVerifyRes = await fetch(`${baseUrl}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: verificationCode
      })
    });
    assert(reuseVerifyRes.status === 400, 'Re-using verification code should fail with status 400');
    console.log('   ✅ Single-use verification code enforced.');

    // ------------------------------------------------------------------------
    // 5. Valid Login & JWT Generation
    // ------------------------------------------------------------------------
    console.log('Test 5: Login with Verified Email & Valid Password...');
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword2026!'
      })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, `Login failed with status ${loginRes.status}`);
    assert(!!loginData.data.accessToken, 'Access token missing in login response');
    const accessToken = loginData.data.accessToken;
    const refreshToken = loginData.data.refreshToken;
    console.log('   ✅ Login successful. JWT Generated:', accessToken.substring(0, 20) + '...');

    // ------------------------------------------------------------------------
    // 6. Access Protected Route with JWT
    // ------------------------------------------------------------------------
    console.log('Test 6: Authenticated Request to Protected Route...');
    const protectedRes = await fetch(`${testUrl}/protected`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const protectedData = await protectedRes.json();
    assert(protectedRes.status === 200, `Protected route failed with status ${protectedRes.status}`);
    assert(protectedData.user.email.toLowerCase() === testEmail.toLowerCase(), 'Protected user email mismatch');
    console.log('   ✅ Authenticated request authorized successfully.');

    // ------------------------------------------------------------------------
    // 7. Invalid Credentials Test
    // ------------------------------------------------------------------------
    console.log('Test 7: Login with Invalid Password (Should Fail 401)...');
    const invalidLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123!'
      })
    });
    assert(invalidLoginRes.status === 401, 'Invalid password should return status 401');
    console.log('   ✅ Invalid password rejected.');

    // ------------------------------------------------------------------------
    // 8. Refresh Token Rotation
    // ------------------------------------------------------------------------
    console.log('Test 8: Refresh Access Token with Refresh Token...');
    const refreshRes = await fetch(`${baseUrl}/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const refreshData = await refreshRes.json();
    assert(refreshRes.status === 200, `Refresh token failed with status ${refreshRes.status}`);
    assert(!!refreshData.data.accessToken, 'New access token missing');
    const newAccessToken = refreshData.data.accessToken;
    console.log('   ✅ Token refresh successful.');

    // ------------------------------------------------------------------------
    // 9. Logout & Token Invalidation
    // ------------------------------------------------------------------------
    console.log('Test 9: Logout & Access Token Invalidation...');
    const logoutRes = await fetch(`${baseUrl}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newAccessToken}` }
    });
    assert(logoutRes.status === 200, `Logout failed with status ${logoutRes.status}`);

    const postLogoutRes = await fetch(`${testUrl}/protected`, {
      headers: { Authorization: `Bearer ${newAccessToken}` }
    });
    assert(postLogoutRes.status === 401, 'Request with revoked token should return status 401');
    console.log('   ✅ Logout revoked access token successfully.');

    // ------------------------------------------------------------------------
    // 10. Forgot & Reset Password Flow
    // ------------------------------------------------------------------------
    console.log('Test 10: Forgot & Reset Password Flow...');
    const forgotRes = await fetch(`${baseUrl}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const forgotData = await forgotRes.json();
    assert(forgotRes.status === 200, 'Forgot password request failed');
    const resetCode = forgotData.data.resetCode;

    const resetRes = await fetch(`${baseUrl}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: resetCode,
        newPassword: 'BrandNewPassword2026!'
      })
    });
    assert(resetRes.status === 200, 'Reset password failed');

    // Login with new password
    const newLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'BrandNewPassword2026!'
      })
    });
    assert(newLoginRes.status === 200, 'Login with new password failed');
    console.log('   ✅ Password reset & login with new password successful.');

    // ------------------------------------------------------------------------
    // 11. Role-Based Access Control (RBAC) Test
    // ------------------------------------------------------------------------
    console.log('Test 11: RBAC Middleware Protection (Employee accessing HR route)...');
    const empLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alex.employee@verireview.ai',
        password: 'VeriReview2026!'
      })
    });
    const empLoginData = await empLoginRes.json();
    const empToken = empLoginData.data.accessToken;

    const rbacForbiddenRes = await fetch(`${testUrl}/hr-only`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(rbacForbiddenRes.status === 403, `Employee should be forbidden (403), got ${rbacForbiddenRes.status}`);

    // HR Admin login
    const hrLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hr.admin@verireview.ai',
        password: 'VeriReview2026!'
      })
    });
    const hrLoginData = await hrLoginRes.json();
    const hrToken = hrLoginData.data.accessToken;

    const rbacAllowedRes = await fetch(`${testUrl}/hr-only`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(rbacAllowedRes.status === 200, `HR Admin should be allowed (200), got ${rbacAllowedRes.status}`);
    console.log('   ✅ RBAC role restrictions enforced correctly.');

    console.log('\n🎉 ALL 11 PRODUCTION AUTHENTICATION TESTS PASSED PERFECTLY!\n');
  } finally {
    server.close();
  }
}
