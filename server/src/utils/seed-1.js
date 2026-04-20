require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Book = require('../models/Book');
const { Category, Author, Publisher, MembershipPlan, PenaltyRule, SystemSettings, CMS } = require('../models/index');

const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Clear existing
  await Promise.all([
    User.deleteMany(), Book.deleteMany(), Category.deleteMany(),
    Author.deleteMany(), Publisher.deleteMany(), MembershipPlan.deleteMany(),
    PenaltyRule.deleteMany(), SystemSettings.deleteMany(), CMS.deleteMany(),
  ]);

  // Categories
  const categories = await Category.insertMany([
    { name: 'Fiction', icon: '📖', description: 'Novels and fictional works' },
    { name: 'Science', icon: '🔬', description: 'Science and technology' },
    { name: 'History', icon: '🏛️', description: 'Historical accounts' },
    { name: 'Biography', icon: '👤', description: 'Life stories' },
    { name: 'Technology', icon: '💻', description: 'Computing and tech' },
    { name: 'Self Help', icon: '🌟', description: 'Personal development' },
    { name: 'Children', icon: '🧸', description: "Children's books" },
    { name: 'Philosophy', icon: '🤔', description: 'Philosophy and ethics' },
  ]);

  // Authors
  const authors = await Author.insertMany([
    { name: 'George Orwell', nationality: 'British' },
    { name: 'J.K. Rowling', nationality: 'British' },
    { name: 'Yuval Noah Harari', nationality: 'Israeli' },
    { name: 'Stephen Hawking', nationality: 'British' },
    { name: 'Malcolm Gladwell', nationality: 'Canadian' },
  ]);

  // Publishers
  const publishers = await Publisher.insertMany([
    { name: 'Penguin Books', website: 'https://penguin.com' },
    { name: 'Oxford University Press', website: 'https://oup.com' },
    { name: 'HarperCollins', website: 'https://harpercollins.com' },
  ]);

  // Books
  await Book.insertMany([
    { title: '1984', isbn: '978-0451524935', authors: [authors[0]._id], categories: [categories[0]._id], publisher: publishers[0]._id, totalCopies: 5, availableCopies: 5, language: 'English', publicationYear: 1949, description: 'A dystopian novel about totalitarianism.' },
    { title: 'Harry Potter and the Philosopher\'s Stone', isbn: '978-0590353427', authors: [authors[1]._id], categories: [categories[0]._id], publisher: publishers[2]._id, totalCopies: 8, availableCopies: 8, language: 'English', publicationYear: 1997 },
    { title: 'Sapiens', isbn: '978-0062316097', authors: [authors[2]._id], categories: [categories[2]._id], publisher: publishers[0]._id, totalCopies: 4, availableCopies: 4, language: 'English', publicationYear: 2011 },
    { title: 'A Brief History of Time', isbn: '978-0553380163', authors: [authors[3]._id], categories: [categories[1]._id], publisher: publishers[1]._id, totalCopies: 3, availableCopies: 3, language: 'English', publicationYear: 1988 },
    { title: 'Outliers', isbn: '978-0316017930', authors: [authors[4]._id], categories: [categories[5]._id], publisher: publishers[2]._id, totalCopies: 6, availableCopies: 6, language: 'English', publicationYear: 2008 },
  ]);

  // Membership Plans
  await MembershipPlan.insertMany([
    { name: 'Basic', description: 'Basic library access', duration: 30, borrowingLimit: 2, ebookAccess: false, price: 0, isActive: true },
    { name: 'Standard', description: 'Standard library access', duration: 90, borrowingLimit: 5, ebookAccess: false, price: 9.99, isActive: true },
    { name: 'Premium', description: 'Full access including e-books', duration: 365, borrowingLimit: 10, ebookAccess: true, price: 29.99, isActive: true },
  ]);

  // Penalty Rule
  await PenaltyRule.create({ perDayFine: 0.50, gracePeriodDays: 1, maxFineAmount: 50, currency: 'USD' });

  // System Settings
  await SystemSettings.create({
    siteName: 'City Library',
    tagline: 'Your knowledge hub',
    issueDays: 14,
    reserveDays: 3,
    maxBooksPerMember: 5,
    currency: 'USD',
    contactEmail: 'library@example.com',
  });

  // CMS
  await CMS.create({
    heroTitle: 'Welcome to City Library',
    heroSubtitle: 'Discover thousands of books, journals, and e-books. Your knowledge journey starts here.',
    featuresSection: [
      { icon: '📚', title: 'Vast Collection', description: 'Over 10,000 books across all genres and subjects.' },
      { icon: '📱', title: 'Mobile App', description: 'Access your library from anywhere with our Flutter app.' },
      { icon: '🔔', title: 'Smart Notifications', description: 'Get reminded about due dates and new arrivals.' },
      { icon: '📖', title: 'E-Books', description: 'Read digital books online anytime, anywhere.' },
    ],
    testimonials: [
      { name: 'Alice Johnson', role: 'Student', comment: 'The library app made it so easy to find and reserve books. Highly recommend!', rating: 5, isActive: true },
      { name: 'Bob Smith', role: 'Researcher', comment: 'Amazing collection and excellent service. The e-book feature is a game changer.', rating: 5, isActive: true },
      { name: 'Carol White', role: 'Teacher', comment: 'My students love the reservation system. Very intuitive and fast.', rating: 4, isActive: true },
    ],
    ctaTitle: 'Become a Member Today',
    ctaDescription: 'Join thousands of readers and get unlimited access to our library.',
  });

  // Users
  const salt = await bcrypt.genSalt(10);
  await User.insertMany([
    { name: 'Admin User', email: 'admin@library.com', password: await bcrypt.hash('Admin@123', salt), role: 'admin', isActive: true },
    { name: 'Library Manager', email: 'manager@library.com', password: await bcrypt.hash('Manager@123', salt), role: 'manager', isActive: true },
    { name: 'John Member', email: 'member@library.com', password: await bcrypt.hash('Member@123', salt), role: 'member', isActive: true },
  ]);

  console.log('\n✅ Database seeded successfully!\n');
  console.log('📋 Login Credentials:');
  console.log('  Admin:   admin@library.com   / Admin@123');
  console.log('  Manager: manager@library.com / Manager@123');
  console.log('  Member:  member@library.com  / Member@123\n');

  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
