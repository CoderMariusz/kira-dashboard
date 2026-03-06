const crypto = require('crypto');
const fs = require('fs');

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

// Użycie: node auth/users-seed.js <mariusz_pin> <angelika_pin> <zuza_pin> <iza_pin>
const [,, p1, p2, p3, p4] = process.argv;
if (!p1 || !p2 || !p3 || !p4) {
  console.log('Usage: node auth/users-seed.js <mariusz_pin> <angelika_pin> <zuza_pin> <iza_pin>');
  process.exit(1);
}

const users = [
  { name: 'Mariusz', pin_hash: hashPin(p1), role: 'admin', avatar: '🦊' },
  { name: 'Angelika', pin_hash: hashPin(p2), role: 'home_plus', avatar: '🌸' },
  { name: 'Zuza', pin_hash: hashPin(p3), role: 'home', avatar: '⭐' },
  { name: 'Iza', pin_hash: hashPin(p4), role: 'home', avatar: '🌙' },
];

fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
console.log('✅ users.json created with hashed PINs');
