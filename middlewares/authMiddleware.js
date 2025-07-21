const jwt = require('jsonwebtoken');

exports.authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // gán dữ liệu token vào req.user
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

exports.verifyToken = (req, res, next) => {
  // Get token from header or cookie
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  // console.log('Token from header:', token);

  // If there is no token in the header, try to get it from the cookie
  if (!token && req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // console.log('Token from cookie:', token);

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.account = decoded;
    // console.log('Decoded token:', decoded);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

exports.verifyRefreshToken = (req, res, next) => {
  // Get refresh token from cookies or request body
  let refreshToken = req.cookies && req.cookies.refreshToken || null;
  
  // If no token in cookies, try to get from request body
  if (!refreshToken && req.body && req.body.refreshToken) {
    refreshToken = req.body.refreshToken;
  }

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    req.account = decoded; // gán dữ liệu refresh token vào req.user
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

exports.authorizeRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.account || !req.account.role) {
      return res.status(403).json({ message: 'Access denied. No role provided.' });
    }

    if (req.account.role !== requiredRole) {
      return res.status(403).json({ message: 'Access denied. Insufficient role.' });
    }

    next();
  };
};
