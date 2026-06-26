const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  aadhaarNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^[0-9]{12}$/, 'Please enter a valid 12-digit Aadhaar number']
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  mobile: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
  	type: String,
  	enum: ['citizen', 'admin', 'guest', 'employee', 'field-staff', 'supervisor', 'commissioner'],
  	default: 'citizen'
  },
  employeeId: {
  	type: String,
  	unique: true,
  	sparse: true,
  	trim: true,
  	index: true
  },
  department: {
  	type: String,
  	enum: [
  	  'Road Damage',
  	  'Water Leakage',
  	  'Garbage & Sanitation',
  	  'Streetlight Failure',
  	  'Drainage Issue',
  	  'Traffic Issue',
  	  'Public Infrastructure',
  	  'Environmental Hazard',
  	  'All',
  	  'Other'
  	],
  	default: null
  },
  departments: [{
  	type: String,
  	enum: [
  	  'Road Damage',
  	  'Water Leakage',
  	  'Garbage & Sanitation',
  	  'Streetlight Failure',
  	  'Drainage Issue',
  	  'Traffic Issue',
  	  'Public Infrastructure',
  	  'Environmental Hazard',
  	  'All',
  	  'Other'
  	]
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: null
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  preferences: {
    language: {
      type: String,
      enum: ['en', 'hi', 'sat', 'nag'],
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    }
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ departments: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  if (!this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  };
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(otp) {
  console.log('verifyOTP called with:', { 
    providedOtp: otp, 
    storedOtp: this.otp?.code,
    otpType: typeof otp,
    storedOtpType: typeof this.otp?.code,
    hasOtp: !!this.otp,
    hasCode: !!this.otp?.code,
    hasExpiresAt: !!this.otp?.expiresAt,
    expiresAt: this.otp?.expiresAt,
    currentTime: new Date()
  });
  
  if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
    console.log('OTP verification failed: missing OTP data');
    return false;
  }
  
  if (new Date() > this.otp.expiresAt) {
    console.log('OTP verification failed: expired');
    this.otp = undefined;
    return false;
  }
  
  const isValid = this.otp.code === otp;
  console.log('OTP comparison result:', isValid);
  return isValid;
};

// Get user profile (without sensitive data)
userSchema.methods.getProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.otp;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
