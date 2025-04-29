const Account = require('../models/Account');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { fullName, email, username, password } = req.body;

  try {
    const existingEmail = await User.findOne({ email });
    const existingUsername = await Account.findOne({ username });

    if (existingEmail || existingUsername) {
      return res.status(400).json({ message: 'Email or username already exists.' });
    }

    const newUser = new User({ fullName, email });
    await newUser.save();

    const newAccount = new Account({ username, password, userId: newUser._id, refreshTokens: [] });
    await newAccount.save();

    const accessToken = jwt.sign(
      { accountId: newAccount._id, userId: newUser._id, role: newAccount.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { accountId: newAccount._id, userId: newUser._id, role: newAccount.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save refresh token to the database as part of the refreshTokens array
    // newAccount.refreshTokens.push({ token: refreshToken });
    // await newAccount.save();

    res.cookie('accessToken', accessToken, { 
      httpOnly: true, 
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, 
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({ message: 'Registration successful', account: newAccount, user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// exports.login = async (req, res) => {
//   const { username, password } = req.body;

//   try {
//     const account = await Account.findOne({ username }).populate('userId');
//     if (!account || !account.accountStatus) return res.status(401).json({ message: 'Invalid login information' });

//     const isMatch = await account.comparePassword(password);
//     if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

//     const token = jwt.sign(
//       { accountId: account._id, userId: account.userId._id, role: account.role },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     res.status(200).json({
//       message: 'Login successful',
//       token,
//       account: {
//         id: account._id,
//         username: account.username,
//         role: account.role,
//         userId: account.userId._id,
//       },
//       user: account.userId
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

exports.login = async (req, res) => {
  const { username, password } = req.body;
  // const userAgent = req.headers['user-agent'];

  try {
    const account = await Account.findOne({ username }).populate('userId');
    if (!account || !account.accountStatus) return res.status(401).json({ message: 'Invalid login information' });

    const isMatch = await account.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

    const accessToken = jwt.sign(
      { accountId: account._id, userId: account.userId._id, role: account.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { accountId: account._id, userId: account.userId._id, role: account.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save the new refresh token to the database as part of the array with expiration date and user agent
    // account.refreshTokens.push({ 
    //   token: refreshToken, 
    //   createdAt: new Date(), 
    //   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    //   userAgent: userAgent
    // });
    // await account.save();

    res.cookie('accessToken', accessToken, { 
      httpOnly: true, 
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, 
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      accessToken, // Them de test
      message: 'Login successful',
      account: {
        id: account._id,
        username: account.username,
        role: account.role,
        userId: account.userId._id,
      },
      user: account.userId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;
  // console.log('Refresh token:', refreshToken);

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not found' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    // console.log('Decoded refresh token:', decoded);

    // Check if the refresh token is still valid in the database (if stored)
    const account = await Account.findById(decoded.accountId);
    if (!account) {
      return res.status(403).json({ message: 'Account not found' });
    }

    const newAccessToken = jwt.sign(
      { accountId: decoded.accountId, userId: decoded.userId, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { accountId: decoded.accountId, userId: decoded.userId, role: decoded.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Optionally update the refresh token in the database
    res.cookie('accessToken', newAccessToken, { 
      httpOnly: true, 
      // secure: true, 
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    res.cookie('refreshToken', newRefreshToken, { 
      httpOnly: true, 
      // secure: true, 
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (err) {
    console.error(err);
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

// refesh token with database check
// exports.refreshToken = async (req, res) => {
//   const { refreshToken } = req.cookies;

//   if (!refreshToken) {
//     return res.status(401).json({ message: 'Refresh token not found' });
//   }

//   try {
//     const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

//     // Check if the refresh token exists in the database
//     const account = await Account.findById(decoded.accountId);
//     if (!account) {
//       return res.status(403).json({ message: 'Account not found' });
//     }

//     const tokenExists = account.refreshTokens.some(tokenObj => 
//       bcrypt.compareSync(refreshToken, tokenObj.token)
//     );

//     if (!tokenExists) {
//       return res.status(403).json({ message: 'Invalid refresh token' });
//     }

//     // Remove the old refresh token and add a new one
//     account.refreshTokens = account.refreshTokens.filter(tokenObj => 
//       !bcrypt.compareSync(refreshToken, tokenObj.token)
//     );

//     const newRefreshToken = jwt.sign(
//       { accountId: decoded.accountId, userId: decoded.userId, role: decoded.role },
//       process.env.JWT_REFRESH_SECRET,
//       { expiresIn: '7d' }
//     );

//     account.refreshTokens.push({ token: newRefreshToken });
//     await account.save();

//     const newAccessToken = jwt.sign(
//       { accountId: decoded.accountId, userId: decoded.userId, role: decoded.role },
//       process.env.JWT_SECRET,
//       { expiresIn: '15m' }
//     );

//     res.cookie('accessToken', newAccessToken, { 
//       httpOnly: true, 
//       sameSite: 'strict',
//       maxAge: 15 * 60 * 1000 // 15 minutes
//     });
//     res.cookie('refreshToken', newRefreshToken, { 
//       httpOnly: true, 
//       sameSite: 'strict',
//       maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
//     });

//     res.status(200).json({ message: 'Token refreshed successfully' });
//   } catch (err) {
//     console.error(err);
//     res.status(403).json({ message: 'Invalid or expired refresh token' });
//   }
// };

exports.logout = (req, res) => {
  try {
    res.clearCookie('accessToken', { httpOnly: true, sameSite: 'strict' });
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
    res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

