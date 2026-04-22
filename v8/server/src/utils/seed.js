require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const Book     = require('../models/Book');
const { Category, Author, Publisher, MembershipPlan, PenaltyRule, SystemSettings, CMS } = require('../models/index');
const connectDB = require('../config/db');

// Open-licence cover images (Lorem Picsum — unique per book via seed parameter)
const covers = [
  'https://picsum.photos/seed/book1/240/320',
  'https://picsum.photos/seed/book2/240/320',
  'https://picsum.photos/seed/book3/240/320',
  'https://picsum.photos/seed/book4/240/320',
  'https://picsum.photos/seed/book5/240/320',
];

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}),
    Book.deleteMany({}),
    Category.deleteMany({}),
    Author.deleteMany({}),
    Publisher.deleteMany({}),
    MembershipPlan.deleteMany({}),
    PenaltyRule.deleteMany({}),
    SystemSettings.deleteMany({}),
    CMS.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // Categories
  const categories = await Category.insertMany([
    { name: 'Fiction',    icon: '📖', description: 'Novels and fictional works',  isActive: true },
    { name: 'Science',    icon: '🔬', description: 'Science and technology',       isActive: true },
    { name: 'History',    icon: '🏛️', description: 'Historical accounts',          isActive: true },
    { name: 'Biography',  icon: '👤', description: 'Life stories',                 isActive: true },
    { name: 'Technology', icon: '💻', description: 'Computing and tech',           isActive: true },
    { name: 'Self Help',  icon: '🌟', description: 'Personal development',         isActive: true },
    { name: 'Children',   icon: '🧸', description: "Children's books",             isActive: true },
    { name: 'Philosophy', icon: '🤔', description: 'Philosophy and ethics',        isActive: true },
  ]);
  console.log('✅ Categories seeded');

  // Authors
  const authors = await Author.insertMany([
    { name: 'George Orwell',      nationality: 'British',   isActive: true },
    { name: 'J.K. Rowling',       nationality: 'British',   isActive: true },
    { name: 'Yuval Noah Harari',  nationality: 'Israeli',   isActive: true },
    { name: 'Stephen Hawking',    nationality: 'British',   isActive: true },
    { name: 'Malcolm Gladwell',   nationality: 'Canadian',  isActive: true },
  ]);
  console.log('✅ Authors seeded');

  // Publishers
  const publishers = await Publisher.insertMany([
    { name: 'Penguin Books',          website: 'https://penguin.com',       isActive: true },
    { name: 'Oxford University Press', website: 'https://oup.com',          isActive: true },
    { name: 'HarperCollins',          website: 'https://harpercollins.com', isActive: true },
  ]);
  console.log('✅ Publishers seeded');

  // Books  (coverImage uses Lorem Picsum for dev — shows actual images)
  await Book.insertMany([
    {
      title: '1984', isbn: '978-0451524935',
      authors: [authors[0]._id], categories: [categories[0]._id],
      publisher: publishers[0]._id,
      totalCopies: 5, availableCopies: 5,
      language: 'English', publicationYear: 1949, pages: 328,
      description: 'A dystopian novel set in a totalitarian society ruled by Big Brother.',
      bookType: 'physical',
      coverImage: covers[0],
      status: 'active',
    },
    {
      title: "Harry Potter and the Philosopher's Stone", isbn: '978-0590353427',
      authors: [authors[1]._id], categories: [categories[0]._id],
      publisher: publishers[2]._id,
      totalCopies: 8, availableCopies: 8,
      language: 'English', publicationYear: 1997, pages: 309,
      description: 'A young boy discovers he is a wizard on his 11th birthday.',
      bookType: 'physical',
      coverImage: covers[1],
      status: 'active',
    },
    {
      title: 'Sapiens: A Brief History of Humankind', isbn: '978-0062316097',
      authors: [authors[2]._id], categories: [categories[2]._id],
      publisher: publishers[0]._id,
      totalCopies: 4, availableCopies: 4,
      language: 'English', publicationYear: 2011, pages: 443,
      description: 'A narrative history of humankind from the Stone Age to the present.',
      bookType: 'physical',
      coverImage: covers[2],
      status: 'active',
    },
    {
      title: 'A Brief History of Time', isbn: '978-0553380163',
      authors: [authors[3]._id], categories: [categories[1]._id],
      publisher: publishers[1]._id,
      totalCopies: 3, availableCopies: 3,
      language: 'English', publicationYear: 1988, pages: 212,
      description: 'Stephen Hawking explores cosmology and the nature of time.',
      bookType: 'physical',
      coverImage: covers[3],
      status: 'active',
    },
    {
      title: 'Outliers: The Story of Success', isbn: '978-0316017930',
      authors: [authors[4]._id], categories: [categories[5]._id],
      publisher: publishers[2]._id,
      totalCopies: 6, availableCopies: 6,
      language: 'English', publicationYear: 2008, pages: 309,
      description: 'Malcolm Gladwell examines the factors behind extraordinary success.',
      bookType: 'physical',
      coverImage: covers[4],
      status: 'active',
    },
  ]);
  console.log('✅ Books seeded');

  // Membership Plans
  await MembershipPlan.insertMany([
    { name: 'Basic',    description: 'Basic library access',          duration: 30,  borrowingLimit: 2,  ebookAccess: false, price: 0,     isActive: true },
    { name: 'Standard', description: 'Standard library access',       duration: 90,  borrowingLimit: 5,  ebookAccess: false, price: 9.99,  isActive: true },
    { name: 'Premium',  description: 'Full access including e-books', duration: 365, borrowingLimit: 10, ebookAccess: true,  price: 29.99, isActive: true },
  ]);
  console.log('✅ Membership plans seeded');

  // Penalty Rule
  await PenaltyRule.create({ perDayFine: 0.50, gracePeriodDays: 1, maxFineAmount: 50, currency: 'USD' });

  // System Settings
  await SystemSettings.create({
    siteName: 'City Library', tagline: 'Your knowledge hub',
    issueDays: 14, reserveDays: 3, maxBooksPerMember: 5,
    currency: 'USD', contactEmail: 'library@example.com',
  });

  // CMS
  await CMS.create({
    heroTitle:    'Welcome to City Library',
    heroSubtitle: 'Discover thousands of books, journals, and e-books. Your knowledge journey starts here.',
    featuresSection: [
      { icon: '📚', title: 'Vast Collection',      description: 'Over 10,000 books across all genres.' },
      { icon: '📱', title: 'Mobile App',            description: 'Access your library from anywhere.' },
      { icon: '🔔', title: 'Smart Notifications',   description: 'Get reminded about due dates.' },
      { icon: '📖', title: 'E-Books & PDFs',        description: 'Read or download digital books anytime.' },
    ],
    testimonials: [
      { name: 'Alice Johnson', role: 'Student',    comment: 'The library app made it so easy to find and reserve books!', rating: 5, isActive: true },
      { name: 'Bob Smith',     role: 'Researcher', comment: 'Amazing collection and excellent service.',                    rating: 5, isActive: true },
      { name: 'Carol White',   role: 'Teacher',    comment: 'My students love the reservation system.',                    rating: 4, isActive: true },
    ],
    ctaTitle:       'Become a Member Today',
    ctaDescription: 'Join thousands of readers and get unlimited access to our library.',
  });
  console.log('✅ Settings & CMS seeded');

  // Users — use User.create() so pre-save hook hashes the password correctly
  // This is the only safe way to ensure bcrypt works properly
  await User.create([
    { name: 'Admin User',      email: 'admin@library.com',   password: 'Admin@123',   role: 'admin',   isActive: true },
    { name: 'Library Manager', email: 'manager@library.com', password: 'Manager@123', role: 'manager', isActive: true },
    { name: 'John Member',     email: 'member@library.com',  password: 'Member@123',  role: 'member',  isActive: true },
  ]);
  console.log('✅ Users seeded');

  console.log('\n✅ Database seeded successfully!\n');
  console.log('📋 Login Credentials:');
  console.log('  Admin:   admin@library.com   / Admin@123');
  console.log('  Manager: manager@library.com / Manager@123');
  console.log('  Member:  member@library.com  / Member@123\n');

  process.exit(0);
};

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
