const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String },
  icon: { type: String },
  slug: { type: String, unique: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

categorySchema.pre('save', function (next) {
  this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
  next();
});

const authorSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, unique: true, sparse: true },

  // Profile
  avatar:      { type: String },                         // Cloudinary URL
  avatarPublicId: { type: String },
  nationality: { type: String },
  birthYear:   { type: Number },
  deathYear:   { type: Number },
  genres:      [{ type: String }],                       // e.g. ['Poetry','Fiction']
  languages:   [{ type: String }],                       // languages author wrote in

  // Bio
  shortBio:    { type: String },                         // ~150 chars, shown on cards
  fullBio:     { type: String },                         // full HTML/text biography
  multiBio:    [{ lang: String, bio: String }],          // multi-language bios

  // Linked content
  youtubeLinks: [{
    title: String,
    url:   String,
    thumb: String,
  }],
  audioLinks: [{
    title: String,
    url:   String,
    duration: String,
  }],
  articles: [{
    title: String,
    url:   String,
    source: String,
  }],

  // Life timeline
  timeline: [{
    year:        Number,
    event:       String,
    description: String,
  }],

  // Discovery
  isFeatured:  { type: Boolean, default: false },
  popularity:  { type: Number,  default: 0 },      // view/interaction count
  bookCount:   { type: Number,  default: 0 },      // denormalised, updated on book save
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

// Auto-generate slug from name
authorSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

const publisherSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  address: { type: String },
  website: { type: String },
  email: { type: String },
  phone: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const membershipPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  duration: { type: Number, required: true }, // in days
  borrowingLimit: { type: Number, required: true },
  ebookAccess: { type: Boolean, default: false },
  price: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const penaltyRuleSchema = new mongoose.Schema({
  perDayFine: { type: Number, default: 1.00 },
  gracePeriodDays: { type: Number, default: 0 },
  maxFineAmount: { type: Number, default: 100 },
  currency: { type: String, default: 'USD' },
}, { timestamps: true });

const systemSettingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'My Library' },
  logo: { type: String },
  tagline: { type: String },
  issueDays: { type: Number, default: 14 },
  reserveDays: { type: Number, default: 3 },
  maxBooksPerMember: { type: Number, default: 5 },
  currency: { type: String, default: 'USD' },
  defaultLanguage: { type: String, default: 'English' },
  contactEmail: { type: String },
  contactPhone: { type: String },
  address: { type: String },
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
  },
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },
  pushNotifications: { type: Boolean, default: true },
}, { timestamps: true });

const cmsSchema = new mongoose.Schema({
  heroTitle: { type: String, default: 'Welcome to Our Library' },
  heroSubtitle: { type: String, default: 'Discover thousands of books' },
  heroImage: { type: String },
  featuresSection: [{
    icon: String,
    title: String,
    description: String,
  }],
  testimonials: [{
    name: String,
    role: String,
    avatar: String,
    comment: String,
    rating: { type: Number, min: 1, max: 5 },
    isActive: { type: Boolean, default: true },
  }],
  ctaTitle: { type: String, default: 'Become a Member Today' },
  ctaDescription: { type: String },
  aboutText: { type: String },
}, { timestamps: true });

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  details: { type: String },
  ip: { type: String },
  module: { type: String },
}, { timestamps: true });

module.exports = {
  Category: mongoose.model('Category', categorySchema),
  Author: mongoose.model('Author', authorSchema),
  Publisher: mongoose.model('Publisher', publisherSchema),
  MembershipPlan: mongoose.model('MembershipPlan', membershipPlanSchema),
  PenaltyRule: mongoose.model('PenaltyRule', penaltyRuleSchema),
  SystemSettings: mongoose.model('SystemSettings', systemSettingsSchema),
  CMS: mongoose.model('CMS', cmsSchema),
  ActivityLog: mongoose.model('ActivityLog', activityLogSchema),
};
