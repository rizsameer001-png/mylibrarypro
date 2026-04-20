const { ActivityLog } = require('../models/index');

const logActivity = async (userId, action, details, ip, module) => {
  try {
    await ActivityLog.create({ user: userId, action, details, ip, module });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

module.exports = { logActivity };
