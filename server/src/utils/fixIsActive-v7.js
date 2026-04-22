/**
 * fixIsActive.js — One-time migration
 * Run: node src/utils/fixIsActive.js
 *
 * Sets isActive:true on all Categories, Authors, Publishers, MembershipPlans
 * that currently have isActive as null/undefined (created via insertMany without it).
 */
require('dotenv').config();
const connectDB = require('../config/db');
const { Category, Author, Publisher, MembershipPlan } = require('../models/index');

const fix = async () => {
  await connectDB();
  console.log('🔧 Fixing isActive fields...\n');

  const filter = { $or: [{ isActive: null }, { isActive: { $exists: false } }] };
  const update = { $set: { isActive: true } };

  const results = await Promise.all([
    Category.updateMany(filter, update),
    Author.updateMany(filter, update),
    Publisher.updateMany(filter, update),
    MembershipPlan.updateMany(filter, update),
  ]);

  console.log(`✅ Categories fixed:     ${results[0].modifiedCount}`);
  console.log(`✅ Authors fixed:        ${results[1].modifiedCount}`);
  console.log(`✅ Publishers fixed:     ${results[2].modifiedCount}`);
  console.log(`✅ MembershipPlans fixed: ${results[3].modifiedCount}`);
  console.log('\n✅ Migration complete!');
  process.exit(0);
};

fix().catch(err => { console.error(err); process.exit(1); });
