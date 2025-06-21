const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// const refreshTokenSchema = new mongoose.Schema({
//   token: { type: String, required: true }, // Đã băm
//   userAgent: { type: String }, // Thông tin về thiết bị người dùng
//   createdAt: { type: Date, default: Date.now },
//   expiresAt: { type: Date }
// }, { _id: false });

const accountSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'partner' ], default: 'user' },
  accountStatus: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // sẽ ra sao nếu là tài khoản admin?
  // userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: function() {
  //   return this.role === 'user';
  // }},
  // refreshTokens: [refreshTokenSchema]
  
  verificationOtp:{ 
    code: { type: String },
    expiresAt: { type: Date },
  }, // Mã xác nhận email
  
}, { timestamps: true });

// Auto hash password before save
accountSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare password method
accountSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// // Hash refresh tokens before saving
// accountSchema.pre('save', async function (next) {
//   try {
//     if (this.isModified('password')) {
//       this.password = await bcrypt.hash(this.password, 10);
//     }

//     if (this.isModified('refreshTokens')) {
//       for (let tokenObj of this.refreshTokens) {
//         if (tokenObj.token && !tokenObj.token.startsWith('$2')) {
//           tokenObj.token = await bcrypt.hash(tokenObj.token, 10);
//         }
//       }
//     }

//     next();
//   } catch (err) {
//     next(err);
//   }
// });

// // Compare refresh token method
// accountSchema.methods.compareRefreshToken = async function (candidateToken) {
//   for (const tokenObj of this.refreshTokens) {
//     const isMatch = await bcrypt.compare(candidateToken, tokenObj.token);
//     if (isMatch) return true;
//   }
//   return false;
// };

module.exports = mongoose.model('Account', accountSchema);
