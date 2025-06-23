const Account = require('../models/Account');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

exports.register = async (req, res) => {
  const { fullName, email, username, password } = req.body;

  try {
    const existingEmail = await User.findOne({ email });
    const existingUsername = await Account.findOne({ username });

    if (existingEmail || existingUsername) {
      return res.status(400).json({ message: 'Email or username already exists.' });
    }

    // Tạo mã xác nhận
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // Tạo user
    const newUser = new User({ fullName, email });
    await newUser.save();

    // Tạo account với mã xác nhận và trạng thái chưa xác thực
    const newAccount = new Account({ 
      username, 
      password, 
      userId: newUser._id, 
      refreshTokens: [],
      verificationOtp: { code: verificationCode, expiresAt },
      accountStatus: false
    });
    await newAccount.save();

    // Gửi email xác nhận
    const transporter = nodemailer.createTransport({
      service: 'gmail', // hoặc dịch vụ email của bạn
      auth: {
        user: process.env.EMAIL_USER, // email gửi
        pass: process.env.EMAIL_PASS, // mật khẩu ứng dụng
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Xác nhận tài khoản Travelmate',
      html: `
        <div style="font-family: Arial, sans-serif; background: #f6f6f6; padding: 32px;">
          <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px 24px;">
            <div style="text-align:center; margin-bottom: 24px;">
              <img src="https://res.cloudinary.com/dvoyjeco3/image/upload/v1748492096/Assets/Images/w4gsxcmtnq5sinujgmwd.png" alt="Travelmate Logo" style="width: 180px; height: 60px; object-fit: contain; margin-bottom: 8px;" />
              <h2 style="color: #2a7be4; margin: 0;">Chào mừng bạn đến với Travelmate!</h2>
            </div>
            <p style="font-size: 16px; color: #222; margin-bottom: 18px;">Xin chào <b>${fullName}</b>,</p>
            <p style="font-size: 16px; color: #222; margin-bottom: 18px;">Cảm ơn bạn đã đăng ký tài khoản tại <b>Travelmate</b>.<br>Để hoàn tất đăng ký, vui lòng sử dụng mã xác nhận bên dưới:</p>
            <div style="text-align:center; margin: 32px 0;">
              <span style="display:inline-block; font-size: 32px; letter-spacing: 8px; color: #fff; background: #2a7be4; padding: 12px 32px; border-radius: 8px; font-weight: bold;">${verificationCode}</span>
            </div>
            <p style="font-size: 15px; color: #555;">Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email này.</p>
            <div style="margin-top: 32px; text-align:center; color: #aaa; font-size: 13px;">&copy; ${new Date().getFullYear()} Travelmate</div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ 
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.',
      account: newAccount, 
      user: newUser 
    });
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
  const { username, password, platform } = req.body; // Add platform to body
  
  try {
    const account = await Account.findOne({ username }).populate('userId');
    if (!account || !account.accountStatus) return res.status(401).json({ message: 'Invalid login information or your account locked' });

    const isMatch = await account.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

    const payload = {
      accountId: account._id,
      role: account.role
    };

    // Add userId to the payload if the account is not an admin
    if (account.role !== 'admin') {
      payload.userId = account.userId._id;
    }

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    // Handle differently for web and app
    if (platform === 'web') {
      // For web: Set cookies AND return tokens (for development debugging)
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
        // Don't set domain for localhost/IP - let browser handle it automatically
        domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
      };

      res.cookie('accessToken', accessToken, { 
        ...cookieOptions,
        maxAge: 3 * 60 * 60 * 1000 // 3 hours
      });
      res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        message: 'Login successful',
        account: {
          id: account._id,
          username: account.username,
          role: account.role,
          userId: account.userId ? account.userId._id : undefined,
        },
        user: account.userId || undefined
      });
    } else {
      // For app: Return tokens in response, don't set cookies
      res.status(200).json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        account: {
          id: account._id,
          username: account.username,
          role: account.role,
          userId: account.userId ? account.userId._id : undefined,
        },
        user: account.userId || undefined
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.refreshToken = async (req, res) => {
  const { platform } = req.body; // Add platform to body
  let refreshToken;

  // console.log('[AuthController] Refresh token request:', {
  //   platform,
  //   cookies: req.cookies,
  //   headers: req.headers,
  //   origin: req.get('origin')
  // });
  // Get refreshToken from cookies or body depending on platform
  if (platform === 'web') {
    // Try cookies first, then fallback to body (for cross-origin issues)
    refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  } else {
    refreshToken = req.body.refreshToken;
  }

  console.log('[AuthController] Refresh token found:', !!refreshToken);
  console.log('[AuthController] Token source:', req.cookies?.refreshToken ? 'cookies' : 'body');

  if (!refreshToken) {
    console.log('[AuthController] No refresh token provided');
    return res.status(401).json({ message: 'Refresh token not found' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if the refresh token is still valid in the database (if stored)
    const account = await Account.findById(decoded.accountId);
    if (!account) {
      return res.status(403).json({ message: 'Account not found' });
    }

    const newAccessToken = jwt.sign(
      { accountId: decoded.accountId, userId: decoded.userId, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    const newRefreshToken = jwt.sign(
      { accountId: decoded.accountId, userId: decoded.userId, role: decoded.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Handle differently for web and app
    if (platform === 'web') {
      // For web: Update cookies and return tokens in development
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
        // Don't set domain for localhost/IP - let browser handle it automatically
        domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
      };

      res.cookie('accessToken', newAccessToken, { 
        ...cookieOptions,
        maxAge: 3 * 60 * 60 * 1000 // 3 hours
      });
      res.cookie('refreshToken', newRefreshToken, { 
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({ 
        message: 'Token refreshed successfully',
      });
    } else {
      // For app: Return tokens in response
      res.status(200).json({ 
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    }
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
  const { platform } = req.body; // Add platform to body
  try {
    // Only clear cookies for web platform
    if (platform === 'web') {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
        // Don't set domain for localhost/IP - let browser handle it automatically
        domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
      };

      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);
    }
    // For app, client handles token removal from local storage or secure storage
    
    res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

exports.verifyAccount = async (req, res) => {
  const { username, code } = req.body;
  try {
    const account = await Account.findOne({ username });
    if (!account) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
    }
    if (account.accountStatus) {
      return res.status(400).json({ message: 'Tài khoản đã được xác thực.' });
    }
    if (!account.verificationOtp || account.verificationOtp.code !== code) {
      return res.status(400).json({ message: 'Mã xác nhận không đúng.' });
    }
    if (account.verificationOtp.expiresAt && account.verificationOtp.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Mã xác nhận đã hết hạn.' });
    }
    account.accountStatus = true;
    account.verificationOtp = undefined;
    await account.save();
    res.status(200).json({ message: 'Xác thực tài khoản thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi xác thực tài khoản.' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại.' });
    }
    const account = await Account.findOne({ userId: user._id });
    if (!account) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
    }
    // Tạo mã OTP mới
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
    account.verificationOtp = { code: otp, expiresAt };
    await account.save();

    // Gửi email OTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Yêu cầu đặt lại mật khẩu Travelmate',
      html: `
        <div style="font-family: Arial, sans-serif; background: #f6f6f6; padding: 32px;">
          <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); border: 1px solid #e0e0e0; padding: 32px 24px;">
            <div style="text-align:center; margin-bottom: 24px;">
              <img src="https://res.cloudinary.com/dvoyjeco3/image/upload/v1748492096/Assets/Images/w4gsxcmtnq5sinujgmwd.png" alt="Travelmate Logo" style="width: 180px; height: 60px; object-fit: contain; margin-bottom: 8px;" />
              <h2 style="color: #2a7be4; margin: 0;">Đặt lại mật khẩu Travelmate</h2>
            </div>
            <p style="font-size: 16px; color: #222; margin-bottom: 18px;">Xin chào <b>${user.fullName}</b>,</p>
            <p style="font-size: 16px; color: #222; margin-bottom: 18px;">Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản <b>Travelmate</b>.<br>Vui lòng sử dụng mã OTP bên dưới để xác nhận:</p>
            <div style="text-align:center; margin: 32px 0;">
              <span style="display:inline-block; font-size: 32px; letter-spacing: 8px; color: #fff; background: #2a7be4; padding: 12px 32px; border-radius: 8px; font-weight: bold;">${otp}</span>
            </div>
            <p style="font-size: 15px; color: #555;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
            <div style="margin-top: 32px; text-align:center; color: #aaa; font-size: 13px;">&copy; ${new Date().getFullYear()} Travelmate</div>
          </div>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Đã gửi mã OTP về email. Vui lòng kiểm tra hộp thư.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi gửi OTP.' });
  }
};

exports.verifyForgotPasswordOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại.' });
    }
    const account = await Account.findOne({ userId: user._id });
    if (!account) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
    }
    if (!account.verificationOtp || account.verificationOtp.code !== otp) {
      return res.status(400).json({ message: 'Mã OTP không đúng.' });
    }
    if (account.verificationOtp.expiresAt && account.verificationOtp.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Mã OTP đã hết hạn.' });
    }
    // Không xóa OTP ở đây, chỉ xác thực thành công
    res.status(200).json({ message: 'OTP hợp lệ.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi xác thực OTP.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại.' });
    }
    const account = await Account.findOne({ userId: user._id });
    if (!account) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
    }
    if (!account.verificationOtp || account.verificationOtp.code !== otp) {
      return res.status(400).json({ message: 'Mã OTP không đúng.' });
    }
    if (account.verificationOtp.expiresAt && account.verificationOtp.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Mã OTP đã hết hạn.' });
    }
    if (!newPassword || newPassword === '___dummy___') {
      // FE gửi newPassword dummy để chỉ xác thực OTP, không đổi mật khẩu
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu mới.' });
    }
    account.password = newPassword;
    account.verificationOtp = undefined;
    await account.save();
    res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu.' });
  }
};

// Đổi mật khẩu khi đã đăng nhập
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    // Lấy accountId từ token (giả sử đã có middleware xác thực và gán req.accountId)
    const accountId = req.account.accountId 
    if (!accountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu mới và xác nhận không khớp.' });
    }
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
    }
    const isMatch = await account.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu cũ không đúng.' });
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({ message: 'Mật khẩu mới không được trùng mật khẩu cũ.' });
    }
    // Validate độ mạnh mật khẩu mới: ít nhất 8 ký tự, có chữ, số và ký tự đặc biệt
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ, số và ký tự đặc biệt.' });
    }
    account.password = newPassword;
    await account.save();
    res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu.' });
  }
};

