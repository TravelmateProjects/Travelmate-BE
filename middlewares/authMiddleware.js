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
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 
  // const token = req.cookies && req.cookies.token; lấy từ cookie httpOnly

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // nhớ thay đúng SECRET
    req.account = decoded; // gán decoded vào request
    req.accountId = decoded.accountId || decoded.id;
    // console.log('Decoded token:', decoded); // In ra để kiểm tra
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

exports.verifyRefreshToken = (req, res, next) => { // Đang cấn, cần sửa
  const refreshToken = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
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
