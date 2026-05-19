const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ success: false, message: 'Vui lòng đăng nhập' });

  const bearer = token.split(' ')[1]; // Format: Bearer <token>
  if (!bearer) return res.status(403).json({ success: false, message: 'Token không hợp lệ' });

  jwt.verify(bearer, process.env.JWT_SECRET || 'aloshipp-bakery-secret-key-2026', (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: 'Phiên đăng nhập hết hạn' });
    req.customerId = decoded.id;
    next();
  });
};

module.exports = { verifyToken };
