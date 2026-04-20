const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');

// @desc    Get all users
// @route   GET /api/users
// @access  Admin/Manager
const getUsers = async (req, res, next) => {
  try {
    const { role, search, isActive, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('membershipPlan', 'name')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      success: true,
      users,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Admin/Manager
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('membershipPlan');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) { next(error); }
};

// @desc    Create user (by admin/manager)
// @route   POST /api/users
// @access  Admin/Manager
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address, membershipPlan } = req.body;

    // Managers can only create members
    if (req.user.role === 'manager' && role !== 'member') {
      return res.status(403).json({ success: false, message: 'Managers can only create members' });
    }

    const user = await User.create({ name, email, password, role: role || 'member', phone, address, membershipPlan });
    await logActivity(req.user._id, 'CREATE_USER', `Created user: ${user.name}`, req.ip, 'Users');
    res.status(201).json({ success: true, user });
  } catch (error) { next(error); }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Admin/Manager
const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, phone, address, isActive, membershipPlan, membershipExpiry } = req.body;

    // Managers cannot delete; but can update
    if (req.user.role === 'manager' && role && role !== 'member') {
      return res.status(403).json({ success: false, message: 'Managers can only manage members' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, phone, address, isActive, membershipPlan, membershipExpiry },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await logActivity(req.user._id, 'UPDATE_USER', `Updated user: ${user.name}`, req.ip, 'Users');
    res.json({ success: true, user });
  } catch (error) { next(error); }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Admin only
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await logActivity(req.user._id, 'DELETE_USER', `Deleted user: ${user.name}`, req.ip, 'Users');
    res.json({ success: true, message: 'User deleted' });
  } catch (error) { next(error); }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };
