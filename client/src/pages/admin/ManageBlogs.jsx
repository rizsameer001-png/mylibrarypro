import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Modal, ConfirmDialog, LoadingSpinner, EmptyState, Pagination } from '../../components/ui/index';
import CloudinaryUploader from '../../components/ui/CloudinaryUploader';
import { getImageUrl, imgOnError } from '../../utils/image';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const EMPTY = { title:'', excerpt:'', content:'', category:'General', tags:'', status:'draft', featured:false, coverImage:'', coverPublicId:'' };

export default function ManageBlogs() {
  const [posts, setPosts]       = useState([]);
  const [pagination, setPagination] = useState({ page:1,pages:1,total:0 });
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(()=>{ fetchPosts(); },[page]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // Get all posts (admin) — use published + draft mix
      const { data } = await api.get(`/blogs?page=${page}&limit=15`);
      // Also try to get drafts (same endpoint, server returns only published for now)
      setPosts(data.posts||[]);
      setPagination(data.pagination||{});
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const openCreate = () => { setEditPost(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit   = (p) => {
    setEditPost(p);
    setForm({ title:p.title||'', excerpt:p.excerpt||'', content:p.content||'',
      category:p.category||'General', tags:p.tags?.join(', ')||'',
      status:p.status||'draft', featured:p.featured||false,
      coverImage:p.coverImage||'', coverPublicId:p.coverPublicId||'' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean) };
      if (editPost) {
        const { data } = await api.put(`/blogs/${editPost._id}`, payload);
        setPosts(prev=>prev.map(p=>p._id===editPost._id?data.post:p));
        toast.success('Post updated');
      } else {
        const { data } = await api.post('/blogs', payload);
        setPosts(prev=>[data.post,...prev]);
        toast.success('Post created');
      }
      setModalOpen(false);
    } catch(err) { toast.error(err.response?.data?.message||'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/blogs/${deleteId}`);
      setPosts(prev=>prev.filter(p=>p._id!==deleteId));
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
    finally { setDeleteId(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Blog Posts</h1>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center space-x-1">
          <PlusIcon className="h-4 w-4"/><span>New Post</span>
        </button>
      </div>

      {loading ? <LoadingSpinner/> : posts.length===0 ? (
        <EmptyState title="No blog posts yet" description="Create your first post"/>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto shadow-sm">
          <table className="table-base">
            <thead><tr>
              {['Cover','Title','Category','Status','Views','Date','Actions'].map(h=>(
                <th key={h} className="th">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map(post=>(
                <tr key={post._id} className="hover:bg-gray-50">
                  <td className="td">
                    <div className="h-10 w-14 rounded overflow-hidden bg-gray-100">
                      <img src={getImageUrl(post.coverImage)} alt=""
                        className="h-full w-full object-cover" onError={imgOnError}/>
                    </div>
                  </td>
                  <td className="td font-medium max-w-[200px]">
                    <div className="truncate">{post.title}</div>
                    {post.featured && <span className="badge bg-yellow-100 text-yellow-700 text-xs">Featured</span>}
                  </td>
                  <td className="td text-sm">{post.category}</td>
                  <td className="td">
                    <span className={`badge ${post.status==='published'?'badge-green':'badge-gray'}`}>{post.status}</span>
                  </td>
                  <td className="td text-sm text-center">{post.views||0}</td>
                  <td className="td text-xs text-gray-500">
                    {post.publishedAt ? format(new Date(post.publishedAt),'MMM d, yyyy') : '—'}
                  </td>
                  <td className="td">
                    <div className="flex items-center space-x-1">
                      <a href={`/blog/${post.slug||post._id}`} target="_blank" rel="noreferrer"
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><EyeIcon className="h-4 w-4"/></a>
                      <button onClick={()=>openEdit(post)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                        <PencilIcon className="h-4 w-4"/>
                      </button>
                      <button onClick={()=>setDeleteId(post._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <TrashIcon className="h-4 w-4"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage}/>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editPost?'Edit Post':'New Blog Post'} size="xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" required value={form.title} onChange={e=>set('title',e.target.value)}/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e=>set('category',e.target.value)}>
                {['General','Reviews','Authors','News','Tips','Events'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e=>set('status',e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex items-center space-x-2 mt-6">
              <input type="checkbox" checked={form.featured} onChange={e=>set('featured',e.target.checked)} className="rounded"/>
              <label className="text-sm">Featured</label>
            </div>
          </div>
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input className="input" value={form.tags} onChange={e=>set('tags',e.target.value)} placeholder="reading, tips, fiction"/>
          </div>
          <div>
            <label className="label">Excerpt</label>
            <textarea className="input" rows={2} value={form.excerpt} onChange={e=>set('excerpt',e.target.value)} placeholder="Short summary shown in listings…"/>
          </div>
          <div>
            <label className="label">Content</label>
            <textarea className="input" rows={10} value={form.content} onChange={e=>set('content',e.target.value)} placeholder="Full post content…"/>
          </div>
          <div>
            <label className="label">Cover Image</label>
            <CloudinaryUploader folder="lms/blog" resourceType="image" accept="image/*"
              multiple={false} showUrlInput currentUrl={form.coverImage}
              onRemove={()=>set('coverImage','')}
              onUploaded={r=>{set('coverImage',r[0].secureUrl);set('coverPublicId',r[0].publicId);}}/>
          </div>
          <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving?'Saving…':'Save Post'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Post" message="Delete this blog post permanently?" danger/>
    </div>
  );
}
