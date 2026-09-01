const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true, maxlength: 100 },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['admin', 'investigator', 'analyst'], default: 'investigator' },
  isActive:     { type: Boolean, default: true },
  lastLoginAt:  { type: Date },
  createdAt:    { type: Date, default: Date.now },
});

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  this.passwordHash = await bcrypt.hash(this.passwordHash, rounds);
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Never expose passwordHash
userSchema.methods.toSafeObject = function () {
  const { passwordHash, __v, ...safe } = this.toObject();
  return safe;
};

module.exports = mongoose.model('User', userSchema);
