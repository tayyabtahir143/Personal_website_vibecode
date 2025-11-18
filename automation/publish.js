#!/usr/bin/env node
/**
 * Transforms Markdown posts into JSON consumed by the site.
 */
import path from 'path';
import { rebuildPostsJson, POSTS_JSON_PATH, PROJECT_ROOT } from '../lib/posts.js';

async function main() {
  const posts = await rebuildPostsJson();
  console.log(`Generated ${posts.length} post(s) -> ${path.relative(PROJECT_ROOT, POSTS_JSON_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
