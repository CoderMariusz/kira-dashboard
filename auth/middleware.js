const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'kiraboard-dev-secret-change-in-prod';
const JWT_EXPIRY = '7d';

let users = [];
try { users = JSON.parse(fs.readFileSync('users.json', 'utf8')); } catch {}

const PAGE_ACCESS = {
  admin:     ['dashboard','pipeline','models','eval','nightclaw','patterns','chat','home','settings'],
  home_plus: ['home','chat'],
  home:      ['home']
};

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

function authenticate(pin) {
  const hash = hashPin(pin);
  const user = users.find(u => u.pin_hash === hash);
  if (!user) return null;
  const token = jwt.sign(
    { name: user.name, role: user.role, avatar: user.avatar },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
  return { token, user: { name: user.name, role: user.role, avatar: user.avatar } };
}

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET);
  } catch { return null; }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  };
}

function canAccessPage(role, page) {
  return (PAGE_ACCESS[role] || []).includes(page);
}

module.exports = { authenticate, verifyToken, requireRole, canAccessPage, PAGE_ACCESS };
