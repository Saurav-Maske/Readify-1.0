const crypto = require('crypto');

const userModel = require('../models/userModel');
const tempUserModel = require('../models/tempUserModel');
const { hashPassword, comparePassword } = require('../utils/hashUtil');
const { generateOtp, getOtpExpiry } = require('../utils/otpUtil');
const { sendOtpEmail } = require('../utils/mailer');
const { signToken } = require('../utils/jwtUtil');
const { verifyGoogleToken } = require('../config/googleAuth');
const { isValidUsernameFormat } = require('../utils/usernameUtil');

// Postgres unique_violation error code - used to catch a rare race where two
// requests for the same username both pass the initial check at the same time.
const PG_UNIQUE_VIOLATION = '23505';

function issueTokenForUser(user) {
  return signToken({ userId: user.user_id, username: user.username, gmail: user.gmail });
}

function publicUser(user) {
  return {
    userId: user.user_id,
    name: user.name,
    username: user.username,
    gmail: user.gmail,
  };
}

// ---------------------------------------------------------------------------
// GET /api/auth/check-username?username=janedoe
//
// Meant to be called live as the user types on the signup form (debounce
// ~300-500ms on the frontend). Checks format, the permanent users table,
// AND the temp_users table - so a username that's just been reserved by
// someone else's in-progress signup (not yet OTP-verified) also shows as
// taken, not just ones that are already fully registered.
// ---------------------------------------------------------------------------
async function checkUsername(req, res, next) {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'username query param is required' });
    }

    if (!isValidUsernameFormat(username)) {
      return res.json({
        available: false,
        reason: 'Username must be 3-20 characters: letters, numbers, or underscores only.',
      });
    }

    const [existingUser, reservedInTemp] = await Promise.all([
      userModel.findByUsername(username),
      tempUserModel.isUsernameReserved(username),
    ]);

    if (existingUser || reservedInTemp) {
      return res.json({ available: false, reason: 'Username is already taken.' });
    }

    return res.json({ available: true });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// Body: { name, username, gmail, password }
// Stores the (hashed) details in temp_users with an OTP and emails the code.
// ---------------------------------------------------------------------------
async function signup(req, res, next) {
  try {
    const { name, username, gmail, password } = req.body;

    if (!name || !username || !gmail || !password) {
      return res.status(400).json({ error: 'name, username, gmail and password are required' });
    }

    if (!isValidUsernameFormat(username)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters: letters, numbers, or underscores only.',
      });
    }

    const existingByGmail = await userModel.findByGmail(gmail);
    if (existingByGmail) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const [existingByUsername, reservedInTemp] = await Promise.all([
      userModel.findByUsername(username),
      tempUserModel.isUsernameReserved(username),
    ]);
    if (existingByUsername || reservedInTemp) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const hashedPassword = await hashPassword(password);
    const otp = generateOtp();
    const otpExpiresAt = getOtpExpiry(10);

    try {
      await tempUserModel.createLocalSignup({
        name,
        username,
        gmail,
        password: hashedPassword,
        otp,
        otpExpiresAt,
      });
    } catch (err) {
      // Safety net: two people submitted the same username in the same
      // instant and both passed the check above. The DB's unique index
      // catches it here instead of letting both through.
      if (err.code === PG_UNIQUE_VIOLATION) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      throw err;
    }

    await sendOtpEmail(gmail, otp);

    return res.status(201).json({ message: 'OTP sent to email. Verify to complete signup.' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/verify-otp
// Body: { gmail, otp }
// Moves the pending signup from temp_users into the real users table.
// ---------------------------------------------------------------------------
async function verifyOtp(req, res, next) {
  try {
    const { gmail, otp } = req.body;
    if (!gmail || !otp) {
      return res.status(400).json({ error: 'gmail and otp are required' });
    }

    const pending = await tempUserModel.findLocalPendingByGmail(gmail);
    if (!pending) {
      return res.status(404).json({ error: 'No pending signup found for this email' });
    }

    if (new Date() > new Date(pending.otp_expires_at)) {
      return res.status(410).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (pending.otp !== otp) {
      return res.status(400).json({ error: 'Incorrect OTP' });
    }

    const user = await userModel.createUser({
      name: pending.name,
      username: pending.username,
      gmail: pending.gmail,
      password: pending.password,
    });

    await tempUserModel.deleteById(pending.id);

    const token = issueTokenForUser(user);
    return res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/resend-otp
// Body: { gmail }
// ---------------------------------------------------------------------------
async function resendOtp(req, res, next) {
  try {
    const { gmail } = req.body;
    if (!gmail) return res.status(400).json({ error: 'gmail is required' });

    const pending = await tempUserModel.findLocalPendingByGmail(gmail);
    if (!pending) {
      return res.status(404).json({ error: 'No pending signup found for this email' });
    }

    const otp = generateOtp();
    const otpExpiresAt = getOtpExpiry(10);
    await tempUserModel.updateOtp(pending.id, otp, otpExpiresAt);
    await sendOtpEmail(gmail, otp);

    return res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Body: { gmail, password }
// ---------------------------------------------------------------------------
async function login(req, res, next) {
  try {
    const { gmail, password } = req.body;
    if (!gmail || !password) {
      return res.status(400).json({ error: 'gmail and password are required' });
    }

    const user = await userModel.findByGmail(gmail);
    if(!user) {
      return res.status(401).json({ error: 'No account associated with this gmail.' });
    }
    if (!user.password) {
      // either no account, or account was created via Google-only signup
      return res.status(401).json({ error: 'Google account found, but no local password set.' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = issueTokenForUser(user);
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/google
// Body: { idToken }  <- the Google ID token obtained on the frontend
//
// - If a user already exists for this Google account/email -> log them in.
// - If not -> stash the Google profile in temp_users and ask the frontend
//   to collect a username via /api/auth/google/complete-signup.
// ---------------------------------------------------------------------------
async function googleAuth(req, res, next) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required' });

    const payload = await verifyGoogleToken(idToken);
    const { sub: googleId, email, name } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Google account has no email available' });
    }

    let user = await userModel.findByGoogleId(googleId);

    if (!user) {
      // Maybe they already have a local account with this email - link it.
      const existingByEmail = await userModel.findByGmail(email);
      if (existingByEmail) {
        user = await userModel.linkGoogleId(existingByEmail.user_id, googleId);
      }
    }

    if (user) {
      const token = issueTokenForUser(user);
      return res.json({ token, user: publicUser(user) });
    }

    // Brand new account - need a username before we can create the user row.
    const pendingToken = crypto.randomBytes(24).toString('hex');
    await tempUserModel.createGoogleSignup({ name, gmail: email, googleId, pendingToken });

    return res.status(200).json({
      needsUsername: true,
      pendingToken,
      name,
      gmail: email,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/google/complete-signup
// Body: { pendingToken, username }
// Finalizes a Google signup once the user has chosen a username.
// ---------------------------------------------------------------------------
async function googleCompleteSignup(req, res, next) {
  try {
    const { pendingToken, username } = req.body;
    if (!pendingToken || !username) {
      return res.status(400).json({ error: 'pendingToken and username are required' });
    }

    const pending = await tempUserModel.findByPendingToken(pendingToken);
    if (!pending) {
      return res.status(404).json({ error: 'Signup session not found or expired. Please sign in with Google again.' });
    }

    if (!isValidUsernameFormat(username)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters: letters, numbers, or underscores only.',
      });
    }

    const existingByUsername = await userModel.findByUsername(username);
    if (existingByUsername) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    let user;
    try {
      user = await userModel.createUser({
        name: pending.name,
        username,
        gmail: pending.gmail,
        googleId: pending.google_id,
      });
    } catch (err) {
      if (err.code === PG_UNIQUE_VIOLATION) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      throw err;
    }

    await tempUserModel.deleteById(pending.id);

    const token = issueTokenForUser(user);
    return res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/auth/me  (protected)
// ---------------------------------------------------------------------------
async function me(req, res, next) {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/auth/check-gmail?gmail=jane@example.com
// Used by the frontend forgot-password form to confirm the email belongs
// to a real account before letting the user type a new password.
// ---------------------------------------------------------------------------
async function checkGmail(req, res, next) {
  try {
    const { gmail } = req.query;
    if (!gmail) return res.status(400).json({ error: 'gmail query param is required' });

    const user = await userModel.findByGmail(gmail);
    return res.json({ exists: !!user });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// Body: { gmail, newPassword }
// Frontend already confirmed the gmail exists (via check-gmail) and collected
// the new password. This hashes it, stashes it with a fresh OTP in
// temp_users, and emails the OTP. Nothing touches the real users table yet.
// ---------------------------------------------------------------------------
async function forgotPassword(req, res, next) {
  try {
    const { gmail, newPassword } = req.body;
    if (!gmail || !newPassword) {
      return res.status(400).json({ error: 'gmail and newPassword are required' });
    }

    const user = await userModel.findByGmail(gmail);
    if (!user) {
      return res.status(404).json({ error: 'No account found for this email' });
    }

    const hashedPassword = await hashPassword(newPassword);
    const otp = generateOtp();
    const otpExpiresAt = getOtpExpiry(10);

    await tempUserModel.createResetRequest({
      gmail,
      password: hashedPassword,
      otp,
      otpExpiresAt,
    });
    await sendOtpEmail(gmail, otp);

    return res.json({ message: 'OTP sent to email. Verify to complete password reset.' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/verify-reset-otp
// Body: { gmail, otp }
// Applies the already-hashed password sitting in temp_users to the real
// user row once the OTP checks out.
// ---------------------------------------------------------------------------
async function verifyResetOtp(req, res, next) {
  try {
    const { gmail, otp } = req.body;
    if (!gmail || !otp) {
      return res.status(400).json({ error: 'gmail and otp are required' });
    }

    const pending = await tempUserModel.findResetPendingByGmail(gmail);
    if (!pending) {
      return res.status(404).json({ error: 'No password reset request found for this email' });
    }
    if (new Date() > new Date(pending.otp_expires_at)) {
      return res.status(410).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (pending.otp !== otp) {
      return res.status(400).json({ error: 'Incorrect OTP' });
    }

    await userModel.updatePasswordByGmail(gmail, pending.password);
    await tempUserModel.deleteById(pending.id);

    return res.json({ message: 'Password updated successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkUsername,
  signup,
  verifyOtp,
  resendOtp,
  login,
  googleAuth,
  googleCompleteSignup,
  me,
  checkGmail,
  forgotPassword,
  verifyResetOtp,
};