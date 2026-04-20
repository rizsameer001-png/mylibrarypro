require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Book = require('../models/Book');
const {
  Category,
  Author,
  Publisher,
  MembershipPlan,
  PenaltyRule,
  SystemSettings,
  CMS
} = require('../models/index');

const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();
  console.log('🌱 Safe Seeding database (NO DATA LOSS)...');

  // =========================
  // CATEGORIES (SAFE UPSERT)
  // =========================
  const categoryData = [
    { name: 'Fiction', icon: '📖', description: 'Novels and fictional works' },
    { name: 'Science', icon: '🔬', description: 'Science and technology' },
    { name: 'History', icon: '🏛️', description: 'Historical accounts' },
    { name: 'Biography', icon: '👤', description: 'Life stories' },
    { name: 'Technology', icon: '💻', description: 'Computing and tech' },
    { name: 'Self Help', icon: '🌟', description: 'Personal development' },
    { name: 'Children', icon: '🧸', description: "Children's books" },
    { name: 'Philosophy', icon: '🤔', description: 'Philosophy and ethics' },
  ];

  const categories = [];
  for (const cat of categoryData) {
    const existing = await Category.findOne({ name: cat.name });
    const result = existing
      ? await Category.findByIdAndUpdate(existing._id, cat, { new: true })
      : await Category.create(cat);

    categories.push(result);
  }

  // =========================
  // AUTHORS (SAFE UPSERT)
  // =========================
  const authorData = [
    { name: 'George Orwell', nationality: 'British' },
    { name: 'J.K. Rowling', nationality: 'British' },
    { name: 'Yuval Noah Harari', nationality: 'Israeli' },
    { name: 'Stephen Hawking', nationality: 'British' },
    { name: 'Malcolm Gladwell', nationality: 'Canadian' },
  ];

  const authors = [];
  for (const a of authorData) {
    const existing = await Author.findOne({ name: a.name });
    const result = existing
      ? await Author.findByIdAndUpdate(existing._id, a, { new: true })
      : await Author.create(a);

    authors.push(result);
  }

  // =========================
  // PUBLISHERS (SAFE UPSERT)
  // =========================
  const publisherData = [
    { name: 'Penguin Books', website: 'https://penguin.com' },
    { name: 'Oxford University Press', website: 'https://oup.com' },
    { name: 'HarperCollins', website: 'https://harpercollins.com' },
  ];

  const publishers = [];
  for (const p of publisherData) {
    const existing = await Publisher.findOne({ name: p.name });
    const result = existing
      ? await Publisher.findByIdAndUpdate(existing._id, p, { new: true })
      : await Publisher.create(p);

    publishers.push(result);
  }

  // =========================
  // BOOKS (SAFE UPSERT BY ISBN)
  // =========================
  const bookData = [
    {
      title: '1984',
      isbn: '978-0451524935',
      authors: [authors[0]._id],
      categories: [categories[0]._id],
      publisher: publishers[0]._id,
      totalCopies: 5,
      availableCopies: 5,
      language: 'English',
      publicationYear: 1949,
      description: 'A dystopian novel about totalitarianism.'
    },
    {
      title: "Harry Potter and the Philosopher's Stone",
      isbn: '978-0590353427',
      authors: [authors[1]._id],
      categories: [categories[0]._id],
      publisher: publishers[2]._id,
      totalCopies: 8,
      availableCopies: 8,
      language: 'English',
      publicationYear: 1997
    },
    {
      title: 'Sapiens',
      isbn: '978-0062316097',
      authors: [authors[2]._id],
      categories: [categories[2]._id],
      publisher: publishers[0]._id,
      totalCopies: 4,
      availableCopies: 4,
      language: 'English',
      publicationYear: 2011
    },
    {
      title: 'A Brief History of Time',
      isbn: '978-0553380163',
      authors: [authors[3]._id],
      categories: [categories[1]._id],
      publisher: publishers[1]._id,
      totalCopies: 3,
      availableCopies: 3,
      language: 'English',
      publicationYear: 1988
    },
    {
      title: 'Outliers',
      isbn: '978-0316017930',
      authors: [authors[4]._id],
      categories: [categories[5]._id],
      publisher: publishers[2]._id,
      totalCopies: 6,
      availableCopies: 6,
      language: 'English',
      publicationYear: 2008
    }
  ];

  for (const b of bookData) {
    const existing = await Book.findOne({ isbn: b.isbn });

    if (existing) {
      await Book.findByIdAndUpdate(existing._id, b);
    } else {
      await Book.create(b);
    }
  }

  // =========================
  // MEMBERSHIPS (SAFE UPSERT)
  // =========================
  const plans = [
    { name: 'Basic', duration: 30, borrowingLimit: 2, ebookAccess: false, price: 0, isActive: true },
    { name: 'Standard', duration: 90, borrowingLimit: 5, ebookAccess: false, price: 9.99, isActive: true },
    { name: 'Premium', duration: 365, borrowingLimit: 10, ebookAccess: true, price: 29.99, isActive: true },
  ];

  for (const p of plans) {
    const existing = await MembershipPlan.findOne({ name: p.name });

    existing
      ? await MembershipPlan.findByIdAndUpdate(existing._id, p)
      : await MembershipPlan.create(p);
  }

  // =========================
  // SINGLETONS
  // =========================
  await PenaltyRule.findOneAndUpdate(
    {},
    { perDayFine: 0.5, gracePeriodDays: 1, maxFineAmount: 50, currency: 'USD' },
    { upsert: true }
  );

  await SystemSettings.findOneAndUpdate(
    {},
    {
      siteName: 'City Library',
      tagline: 'Your knowledge hub',
      issueDays: 14,
      reserveDays: 3,
      maxBooksPerMember: 5,
      currency: 'USD',
      contactEmail: 'library@example.com',
    },
    { upsert: true }
  );

  await CMS.findOneAndUpdate(
    {},
    {
      heroTitle: 'Welcome to City Library',
      heroSubtitle: 'Discover thousands of books, journals, and e-books.',
      featuresSection: [
        { icon: '📚', title: 'Vast Collection', description: 'Over 10,000 books' },
        { icon: '📱', title: 'Mobile App', description: 'Access anywhere' },
        { icon: '🔔', title: 'Smart Notifications', description: 'Due reminders' },
        { icon: '📖', title: 'E-Books', description: 'Digital reading' },
      ],
    },
    { upsert: true }
  );

  // =========================
  // USERS (SAFE UPSERT)
  // =========================
  const hash = (p) => bcrypt.hashSync(p, 10);

  const users = [
    { name: 'Admin User', email: 'admin@library.com', password: hash('Admin@123'), role: 'admin' },
    { name: 'Library Manager', email: 'manager@library.com', password: hash('Manager@123'), role: 'manager' },
    { name: 'John Member', email: 'member@library.com', password: hash('Member@123'), role: 'member' },
  ];

  for (const u of users) {
    const existing = await User.findOne({ email: u.email });

    existing
      ? await User.findByIdAndUpdate(existing._id, u)
      : await User.create(u);
  }

  console.log('✅ Safe seeding completed (no duplicates, no data loss)');
  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});