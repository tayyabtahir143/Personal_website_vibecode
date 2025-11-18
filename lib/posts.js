import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const POSTS_DIR = path.join(PROJECT_ROOT, 'content', 'posts');
export const POSTS_JSON_PATH = path.join(PROJECT_ROOT, 'data', 'posts.json');

export async function collectMarkdownPosts() {
  const files = await fs.readdir(POSTS_DIR);
  const posts = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const absolute = path.join(POSTS_DIR, file);
    const raw = await fs.readFile(absolute, 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);
    if (!frontmatter.title) {
      console.warn(`Skipping ${file} because it lacks a title.`);
      continue;
    }
    const slug = slugify(frontmatter.slug || frontmatter.title);
    posts.push({
      title: frontmatter.title,
      slug,
      publishedAt: frontmatter.date || new Date().toISOString(),
      summary: frontmatter.summary || body.slice(0, 140),
      tags: parseTags(frontmatter.tags),
      heroImage: frontmatter.heroImage || '',
      canonicalUrl: frontmatter.canonicalUrl || '',
      readingTime: calculateReadingTime(body),
      contentHtml: markdownToHtml(body),
      sourcePath: path.relative(PROJECT_ROOT, absolute)
    });
  }

  posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return posts;
}

export async function rebuildPostsJson() {
  const posts = await collectMarkdownPosts();
  await fs.writeFile(POSTS_JSON_PATH, JSON.stringify(posts, null, 2));
  return posts;
}

export async function createMarkdownPost({
  title,
  summary = '',
  tags = [],
  heroImage = '',
  canonicalUrl = '',
  content = '',
  date
}) {
  if (!title) {
    throw new Error('Title is required');
  }
  if (!content) {
    throw new Error('Content (Markdown) is required');
  }
  const slug = slugify(title);
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  const frontmatter = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `date: "${date || new Date().toISOString().split('T')[0]}"`,
    `summary: "${(summary || content.slice(0, 140)).replace(/"/g, "'")}"`,
    `tags: ${JSON.stringify(tags)}`,
    `heroImage: "${heroImage}"`,
    `canonicalUrl: "${canonicalUrl}"`,
    '---',
    '',
    content.trim(),
    ''
  ].join('\n');
  await fs.writeFile(filePath, frontmatter, 'utf8');
  return slug;
}

export async function deleteMarkdownPost(slug) {
  if (!slug) throw new Error('Slug is required');
  const safeSlug = slugify(slug);
  const filePath = path.join(POSTS_DIR, `${safeSlug}.md`);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Post not found');
    }
    throw error;
  }
}

export function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*[\r\n]+([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: raw.trim() };
  const frontmatterBlock = match[1].trim();
  const body = raw.slice(match[0].length).trim();
  const frontmatter = {};

  frontmatterBlock.split(/\r?\n/).forEach((line) => {
    if (!line.trim()) return;
    const [key, ...rest] = line.split(':');
    if (!key || !rest.length) return;
    const value = rest.join(':').trim();
    frontmatter[key.trim()] = parseScalar(value);
  });

  return { frontmatter, body };
}

export function parseScalar(value) {
  if (value === undefined || value === null) return '';
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.warn('Could not parse array value:', value);
    }
  }
  return trimmed;
}

export function parseTags(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length) {
    return value.split(',').map((tag) => tag.trim());
  }
  return [];
}

export function slugify(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function markdownToHtml(markdown = '') {
  let html = markdown;
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)+/gims, (match) => `<ul>${match}</ul>`);
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      if (block.startsWith('<') && block.endsWith('>')) {
        return block;
      }
      return `<p>${block.trim()}</p>`;
    })
    .join('');
  return html;
}

export function calculateReadingTime(text = '') {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
