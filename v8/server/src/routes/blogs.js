const express = require('express');
const router  = express.Router();
const { BlogPost } = require('../models/index');
const { protect, authorize } = require('../middleware/auth');
const { deleteFromCloudinary } = require('../utils/cloudinary');

// Public: list published
router.get('/', async (req, res, next) => {
  try {
    const { page=1, limit=9, tag, category, featured } = req.query;
    const query = { status: 'published' };
    if (tag)      query.tags     = tag;
    if (category) query.category = category;
    if (featured === 'true') query.featured = true;
    const [total, posts] = await Promise.all([
      BlogPost.countDocuments(query),
      BlogPost.find(query)
        .populate('author','name avatar')
        .sort('-publishedAt')
        .limit(parseInt(limit))
        .skip((parseInt(page)-1)*parseInt(limit))
        .select('-content'),
    ]);
    res.json({ success:true, posts, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) } });
  } catch(e){next(e);}
});

// Public: single post by slug/id
router.get('/:slug', async (req, res, next) => {
  try {
    const id  = req.params.slug;
    const q   = id.match(/^[a-f\d]{24}$/i) ? { _id: id } : { slug: id, status: 'published' };
    const post= await BlogPost.findOne(q).populate('author','name avatar');
    if (!post) return res.status(404).json({ success:false, message:'Post not found' });
    BlogPost.findByIdAndUpdate(post._id, { $inc:{ views:1 } }).catch(()=>{});
    res.json({ success:true, post });
  } catch(e){next(e);}
});

// Admin CRUD
router.post('/',  protect, authorize('admin','manager'), async (req,res,next)=>{
  try {
    const post = await BlogPost.create({ ...req.body, author: req.user._id });
    res.status(201).json({ success:true, post });
  } catch(e){next(e);}
});

router.put('/:id', protect, authorize('admin','manager'), async (req,res,next)=>{
  try {
    const existing = await BlogPost.findById(req.params.id);
    if (!existing) return res.status(404).json({ success:false, message:'Not found' });
    Object.assign(existing, req.body);
    await existing.save();
    res.json({ success:true, post: existing });
  } catch(e){next(e);}
});

router.delete('/:id', protect, authorize('admin'), async (req,res,next)=>{
  try {
    const p = await BlogPost.findByIdAndDelete(req.params.id);
    if (p?.coverPublicId) deleteFromCloudinary(p.coverPublicId,'image').catch(()=>{});
    res.json({ success:true });
  } catch(e){next(e);}
});

module.exports = router;
