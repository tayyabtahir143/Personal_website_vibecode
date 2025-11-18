import 'dotenv/config';
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  collectMarkdownPosts,
  createMarkdownPost,
  deleteMarkdownPost,
  rebuildPostsJson,
  POSTS_JSON_PATH,
  PROJECT_ROOT
} from './lib/posts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

app.use(express.json({ limit: '2mb' }));

app.get('/api/profile', async (req, res) => {
  try {
    const raw = await fs.readFile(path.join(PROJECT_ROOT, 'data', 'profile.json'), 'utf8');
    res.json(JSON.parse(raw));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load profile data.' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await collectMarkdownPosts();
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load posts.' });
  }
});

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_TOKEN) {
    return res
      .status(500)
      .json({ error: 'ADMIN_TOKEN is not configured on the server.', success: false });
  }
  const token = req.body?.token;
  if (token && token === ADMIN_TOKEN) {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Invalid admin token.', success: false });
});

app.post('/api/posts', async (req, res) => {
  if (!ADMIN_TOKEN) {
    return res.status(500).json({ error: 'ADMIN_TOKEN is not configured.' });
  }
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { title, summary, tags = [], heroImage = '', canonicalUrl = '', content, date } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }
  try {
    const slug = await createMarkdownPost({
      title,
      summary,
      tags,
      heroImage,
      canonicalUrl,
      content,
      date
    });
    await rebuildPostsJson();
    const posts = await collectMarkdownPosts();
    const created = posts.find((post) => post.slug === slug);
    res.json({ success: true, post: created, posts, outputPath: POSTS_JSON_PATH });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create post.' });
  }
});

app.delete('/api/posts/:slug', async (req, res) => {
  if (!ADMIN_TOKEN) {
    return res.status(500).json({ error: 'ADMIN_TOKEN is not configured.' });
  }
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { slug } = req.params;
  if (!slug) {
    return res.status(400).json({ error: 'Slug is required.' });
  }
  try {
    await deleteMarkdownPost(slug);
    await rebuildPostsJson();
    const posts = await collectMarkdownPosts();
    res.json({ success: true, posts });
  } catch (error) {
    if (error.message === 'Post not found') {
      return res.status(404).json({ error: 'Post not found.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Unable to delete post.' });
  }
});

app.use(express.static(PROJECT_ROOT));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(PROJECT_ROOT, 'index.html'));
});

app.listen(PORT, HOST, () => {
  const urlHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`Server listening on http://${urlHost}:${PORT}`);
});
