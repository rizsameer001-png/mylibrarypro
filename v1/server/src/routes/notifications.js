const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const User = require('../models/User');

// Send bulk email notification
router.post('/email', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { subject, message, role } = req.body;
    const query = role ? { role, isActive: true } : { isActive: true };
    const users = await User.find(query).select('email name');

    const results = { sent: 0, failed: 0 };
    for (const user of users) {
      try {
        await sendEmail({
          to: user.email,
          subject,
          html: `<p>Dear ${user.name},</p><p>${message}</p>`,
        });
        results.sent++;
      } catch { results.failed++; }
    }

    res.json({ success: true, results });
  } catch (e) { next(e); }
});

// Save FCM token for push notifications
router.put('/fcm-token', protect, async (req, res, next) => {
  try {
    const { token } = req.body;
    await User.findByIdAndUpdate(req.user._id, { fcmToken: token });
    res.json({ success: true, message: 'FCM token saved' });
  } catch (e) { next(e); }
});

module.exports = router;
