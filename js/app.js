const API_BASE = window.__API_BASE__ || '/api';
const profilePath = `${API_BASE}/profile`;
const postsPath = `${API_BASE}/posts`;
const profileFallbackPath = 'data/profile.json';
const postsFallbackPath = 'data/posts.json';

const qs = (id) => document.getElementById(id);
const $ = {
  heroTitle: qs('hero-title'),
  heroSummary: qs('hero-summary'),
  heroLocation: qs('hero-location'),
  brandName: qs('brand-name'),
  brandMark: qs('brand-mark'),
  resumeCta: qs('resumeCta'),
  latestPostCta: qs('latestPostCta'),
  focusList: qs('focusList'),
  socialLinks: qs('socialLinks'),
  statExperience: qs('stat-experience'),
  statProjects: qs('stat-projects'),
  statPosts: qs('stat-posts'),
  aboutStory: qs('aboutStory'),
  skillChips: qs('skillChips'),
  resumeDownload: qs('resumeDownload'),
  experienceTimeline: qs('experienceTimeline'),
  projectsGrid: qs('projectsGrid'),
  projectsFallback: qs('projectsFallback'),
  projectSearch: qs('projectSearch'),
  projectFilters: qs('projectFilters'),
  blogGrid: qs('blogGrid'),
  blogTags: qs('blogTags'),
  blogSearch: qs('blogSearch'),
  contactGrid: qs('contactGrid'),
  footerYear: qs('footerYear'),
  footerName: qs('footerName'),
  postPanel: qs('postPanel'),
  postPanelBody: qs('postPanelBody'),
  postPanelClose: qs('postPanelClose'),
  navToggle: qs('navToggle'),
  navLinks: qs('navLinks'),
  adminButton: qs('adminButton'),
  adminBanner: qs('adminBanner'),
  adminStatus: qs('adminStatus'),
  adminHint: qs('adminHint'),
  adminLogin: qs('adminLogin'),
  adminLogout: qs('adminLogout'),
  adminActions: qs('adminActions'),
  blogComposer: qs('blogComposer'),
  composerForm: qs('composerForm'),
  composerTitle: qs('composerTitle'),
  composerSummary: qs('composerSummary'),
  composerDate: qs('composerDate'),
  composerTags: qs('composerTags'),
  composerCanonical: qs('composerCanonical'),
  composerHero: qs('composerHero'),
  composerContent: qs('composerContent'),
  composerPreview: qs('composerPreview'),
  composerCopy: qs('composerCopy'),
  composerDownload: qs('composerDownload'),
  composerReset: qs('composerReset'),
  composerHint: qs('composerHint'),
  backToTop: qs('backToTop')
};

const state = {
  projects: [],
  filteredProjects: [],
  activeProjectTag: null,
  liveBlogPosts: [],
  draftPosts: [],
  blogPosts: [],
  filteredPosts: [],
  activeBlogTag: null,
  isAdmin: false,
  adminKey: null,
  adminHint: '',
  adminStatusTimer: null
};

async function fetchJSON(path, fallbackPath) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Unable to load ${path}`);
    return res.json();
  } catch (error) {
    if (fallbackPath && path !== fallbackPath) {
      return fetchJSON(fallbackPath);
    }
    throw error;
  }
}

async function init() {
  try {
    const profile = await fetchJSON(profilePath, profileFallbackPath);
    const posts = await fetchJSON(postsPath, postsFallbackPath).catch((error) => {
      console.warn('Posts data missing. Run publish automation.', error);
      return [];
    });
    renderProfile(profile);
    await renderProjects(profile);
    renderBlog(posts);
    renderContact(profile.contact);
    $.footerYear.textContent = new Date().getFullYear();
    $.footerName.textContent = profile.name;
    attachNav();
    attachPostPanel();
    initComposer();
    initAdminUiToggle();
    initAdminControls();
    initBackToTop();
  } catch (err) {
    console.error(err);
    $.projectsGrid.innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

function renderProfile(profile) {
  $.heroTitle.textContent = profile.tagline;
  $.heroSummary.textContent = profile.summary;
  $.heroLocation.textContent = profile.location;
  $.brandName.textContent = profile.name;
  $.brandMark.textContent = initials(profile.name);
  $.resumeCta.href = profile.resumeUrl;
  $.resumeDownload.href = profile.resumeUrl;
  $.aboutStory.textContent = profile.about;
  $.footerName.textContent = profile.name;
  $.statExperience.textContent = `${profile.stats.experienceYears}+ yrs`;
  renderFocus(profile.focusAreas);
  renderSkills(profile.highlightSkills);
  renderSocial(profile.social);
  renderTimeline(profile.experience);
  state.adminHint = profile.admin?.hint || '';
}

function renderFocus(areas = []) {
  $.focusList.innerHTML = areas.map((item) => `<li>${item}</li>`).join('');
}

function renderSkills(skills = []) {
  $.skillChips.innerHTML = skills.map((skill) => `<span>${skill}</span>`).join('');
}

function renderSocial(social = []) {
  $.socialLinks.innerHTML = social
    .map(
      (item) =>
        `<li><a href="${item.url}" target="_blank" rel="noopener">${item.label}</a></li>`
    )
    .join('');
}

function renderTimeline(experience = []) {
  $.experienceTimeline.innerHTML = experience
    .map(
      (role) => `
      <div class="timeline-item">
        <h3>${role.title}</h3>
        <small>${role.company} - ${role.period}</small>
        <p>${role.summary}</p>
      </div>`
    )
    .join('');
}

async function renderProjects(profile) {
  const local = profile.projects || [];
  const githubProjects = profile.githubUsername
    ? await fetchGitHubProjects(profile.githubUsername).catch((error) => {
        console.warn(error);
        return [];
      })
    : [];

  const merged = mergeProjects(githubProjects, local);
  state.projects = merged;
  state.filteredProjects = merged;
  $.statProjects.textContent = merged.length;

  $.projectSearch.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    filterProjects(query, state.activeProjectTag);
  });

  buildProjectFilters(merged);
  renderProjectCards(merged);
}

function mergeProjects(primary, fallback) {
  const map = new Map();
  [...primary, ...fallback].forEach((project) => {
    map.set(project.slug || project.id, project);
  });
  return [...map.values()];
}

async function fetchGitHubProjects(username) {
  const response = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
    { headers: { Accept: 'application/vnd.github+json' } }
  );
  if (!response.ok) throw new Error('GitHub rate limit or username issue');
  const repos = await response.json();
  return repos
    .filter((repo) => !repo.fork)
    .slice(0, 8)
    .map((repo) => ({
      id: repo.id,
      title: repo.name,
      description: repo.description || 'No description provided.',
      url: repo.html_url,
      updatedAt: repo.updated_at,
      stars: repo.stargazers_count,
      stack: repo.language ? [repo.language] : [],
      topics: repo.topics || []
    }));
}

function buildProjectFilters(projects) {
  const tags = new Set();
  projects.forEach((project) => {
    project.stack?.forEach((stack) => tags.add(stack));
    project.topics?.forEach((topic) => tags.add(topic));
  });

  if (!tags.size) {
    $.projectFilters.innerHTML = '';
    return;
  }

  $.projectFilters.innerHTML = `<button class="filter-chip active" data-tag="all">All</button>`;
  [...tags].forEach((tag) => {
    $.projectFilters.innerHTML += `<button class="filter-chip" data-tag="${tag}">${tag}</button>`;
  });

  $.projectFilters.addEventListener('click', (event) => {
    if (!event.target.dataset.tag) return;
    const chip = event.target;
    $.projectFilters.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    const tag = chip.dataset.tag === 'all' ? null : chip.dataset.tag;
    state.activeProjectTag = tag;
    filterProjects($.projectSearch.value.toLowerCase(), tag);
  });
}

function filterProjects(query, tag) {
  state.filteredProjects = state.projects.filter((project) => {
    const matchesQuery =
      !query ||
      project.title.toLowerCase().includes(query) ||
      (project.description || '').toLowerCase().includes(query);
    const stack = [...(project.stack || []), ...(project.topics || [])]
      .join(' ')
      .toLowerCase();
    const matchesStack = !tag || stack.includes(tag.toLowerCase());
    return matchesQuery && matchesStack;
  });
  renderProjectCards(state.filteredProjects);
}

function renderProjectCards(projects) {
  if (!projects.length) {
    $.projectsGrid.innerHTML = `<p class="muted">No projects matched that filter.</p>`;
    return;
  }

  $.projectsGrid.innerHTML = projects
    .map(
      (project) => `
      <article class="project-card" role="listitem">
        <div>
          <h3>${project.title}</h3>
          <p class="muted">${project.description}</p>
        </div>
        <div class="stack-chips">
          ${[...(project.stack || []), ...(project.topics || [])]
            .map((chip) => `<span>${chip}</span>`)
            .join('')}
        </div>
        <div class="card-footer">
          <span>${formatDate(project.updatedAt)}</span>
          <a href="${project.url}" target="_blank" rel="noopener">View &rarr;</a>
        </div>
      </article>`
    )
    .join('');
  $.projectsFallback.style.display = 'none';
}

function renderBlog(posts = []) {
  state.liveBlogPosts = posts
    .slice()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  state.draftPosts = state.draftPosts.filter(
    (draft) => !state.liveBlogPosts.some((post) => post.slug === draft.slug)
  );
  state.blogPosts = combineBlogPosts();
  state.filteredPosts = state.blogPosts;
  $.statPosts.textContent = state.liveBlogPosts.length;
  updateLatestPostCta();
  attachLatestPostHandler();
  attachBlogSearchHandler();
  buildBlogTags(state.blogPosts);
  if (!state.blogPosts.length) {
    $.blogGrid.innerHTML =
      '<p class="muted">No posts yet. Run <code>npm run build:posts</code> after adding Markdown files.</p>';
    return;
  }
  renderBlogCards(state.blogPosts);
}

function buildBlogTags(posts) {
  const tags = new Set(posts.flatMap((post) => post.tags || []));
  if (!tags.size) {
    $.blogTags.innerHTML = '';
    return;
  }
  $.blogTags.innerHTML = `<button class="filter-chip active" data-blog-tag="all">All</button>`;
  [...tags].forEach((tag) => {
    $.blogTags.innerHTML += `<button class="filter-chip" data-blog-tag="${tag}">${tag}</button>`;
  });

  if (!$.blogTags.dataset.bound) {
    $.blogTags.addEventListener('click', (event) => {
      if (!event.target.dataset.blogTag) return;
      const chip = event.target;
      $.blogTags.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const tag = chip.dataset.blogTag === 'all' ? null : chip.dataset.blogTag;
      state.activeBlogTag = tag;
      filterPosts(($.blogSearch?.value || '').toLowerCase(), tag);
    });
    $.blogTags.dataset.bound = 'true';
  }
}

function attachBlogSearchHandler() {
  if (!$.blogSearch || $.blogSearch.dataset.bound === 'true') return;
  $.blogSearch.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    filterPosts(query, state.activeBlogTag);
  });
  $.blogSearch.dataset.bound = 'true';
}

function attachLatestPostHandler() {
  if (!$.latestPostCta || $.latestPostCta.dataset.bound === 'true') return;
  $.latestPostCta.addEventListener('click', (event) => {
    const slug = event.currentTarget.dataset.slug;
    openPostPanel(state.blogPosts.find((post) => post.slug === slug));
  });
  $.latestPostCta.dataset.bound = 'true';
}

function filterPosts(query, tag) {
  state.filteredPosts = state.blogPosts.filter((post) => {
    const matchesQuery =
      !query ||
      post.title.toLowerCase().includes(query) ||
      post.summary.toLowerCase().includes(query);
    const matchesTag = !tag || post.tags?.includes(tag);
    return matchesQuery && matchesTag;
  });
  renderBlogCards(state.filteredPosts);
}

function renderBlogCards(posts) {
  if (!posts.length) {
    $.blogGrid.innerHTML = '<p class="muted">No posts match that filter yet.</p>';
    return;
  }
  $.blogGrid.innerHTML = posts
    .map(
      (post) => `
        <article class="blog-card" role="listitem">
          <p class="eyebrow">${formatDate(post.publishedAt)}</p>
          ${post.isDraft ? '<span class="draft-pill">Draft preview</span>' : ''}
          <h3>${post.title}</h3>
          <p class="muted">${post.summary}</p>
          <div class="stack-chips">
            ${(post.tags || []).map((tag) => `<span>${tag}</span>`).join('')}
          </div>
          <div class="card-footer">
            <span>${post.readingTime} min read</span>
            <button class="btn ghost small" data-slug="${post.slug}">Read</button>
          </div>
          ${state.isAdmin ? adminControlsTemplate(post) : ''}
        </article>`
    )
    .join('');

  $.blogGrid
    .querySelectorAll('button[data-slug]')
    .forEach((button) =>
      button.addEventListener('click', () =>
        openPostPanel(state.blogPosts.find((post) => post.slug === button.dataset.slug))
      )
    );

  if (state.isAdmin) {
    $.blogGrid
      .querySelectorAll('button[data-copy-path]')
      .forEach((button) =>
        button.addEventListener('click', () =>
          copyToClipboard(
            button.dataset.copyPath,
            `Copied ${button.dataset.copyPath} to clipboard`
          )
        )
      );
    $.blogGrid
      .querySelectorAll('button[data-delete-slug]')
      .forEach((button) =>
        button.addEventListener('click', () =>
          handleDeletePost(button.dataset.deleteSlug, button.dataset.draft === 'true')
        )
      );
  }
}

function renderContact(contact = []) {
  $.contactGrid.innerHTML = contact
    .map(
      (item) => `
        <article class="contact-card">
          <p class="eyebrow">${item.label}</p>
          <a href="${item.url}" target="_blank" rel="noopener">${item.value}</a>
        </article>`
    )
    .join('');
}

function combineBlogPosts() {
  if (state.isAdmin) {
    return [...(state.draftPosts || []), ...(state.liveBlogPosts || [])];
  }
  return [...(state.liveBlogPosts || [])];
}

function updateLatestPostCta() {
  if (!$.latestPostCta) return;
  const list = state.blogPosts;
  if (list && list.length) {
    $.latestPostCta.dataset.slug = list[0].slug;
  }
}

function adminControlsTemplate(post) {
  const shareUrl = encodeURIComponent(post.canonicalUrl || window.location.href);
  const sourceButton = post.sourcePath
    ? `<button class="btn ghost small" data-copy-path="${post.sourcePath}">Copy Markdown path</button>`
    : '';
  const flag = post.isDraft ? 'Draft preview' : 'Admin tools';
  const deleteButton = post.isDraft
    ? `<button class="btn danger small" data-delete-slug="${post.slug}" data-draft="true">Remove draft</button>`
    : '';
  return `
    <div class="admin-controls">
      <span class="admin-flag">${flag}</span>
      ${sourceButton}
      ${deleteButton}
      <a class="btn primary small" href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" target="_blank" rel="noopener">Share on LinkedIn</a>
    </div>
  `;
}

function initComposer() {
  if (!$.composerForm) return;
  if ($.composerHint) {
    $.composerHint.textContent =
      'Drafts stay local. Copy or download the Markdown, add it to content/posts/, and run npm run build:posts before deploying.';
  }
  const today = new Date().toISOString().split('T')[0];
  if ($.composerDate && !$.composerDate.value) {
    $.composerDate.value = today;
  }
  $.composerForm.addEventListener('submit', handleComposerPublish);
  $.composerPreview?.addEventListener('click', (event) => {
    event.preventDefault();
    previewComposerPost();
  });
  $.composerCopy?.addEventListener('click', handleComposerCopy);
  $.composerDownload?.addEventListener('click', handleComposerDownload);
  $.composerReset?.addEventListener('click', handleComposerReset);
  toggleAdminComposer();
}

function toggleAdminComposer() {
  if (!$.blogComposer) return;
  const shouldShow = state.isAdmin;
  $.blogComposer.hidden = !shouldShow;
  $.blogComposer.classList.toggle('active', shouldShow);
}

function attachNav() {
  $.navToggle.addEventListener('click', () => {
    const expanded = $.navToggle.getAttribute('aria-expanded') === 'true';
    $.navToggle.setAttribute('aria-expanded', String(!expanded));
    $.navLinks.classList.toggle('open');
  });

  $.navLinks.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => {
      $.navLinks.classList.remove('open');
      $.navToggle.setAttribute('aria-expanded', 'false');
    })
  );
}

function attachPostPanel() {
  $.postPanelClose.addEventListener('click', closePostPanel);
  $.postPanel.addEventListener('click', (event) => {
    if (event.target === $.postPanel) {
      closePostPanel();
    }
  });
}

function openPostPanel(post) {
  if (!post) return;
  $.postPanelBody.innerHTML = `
    <header>
      <p class="eyebrow">${formatDate(post.publishedAt)}</p>
      <h2>${post.title}</h2>
      <p class="muted">${post.summary}</p>
    </header>
    <div>${post.contentHtml}</div>
    <footer class="muted">
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        post.canonicalUrl || window.location.origin
      )}" target="_blank" rel="noopener">Share on LinkedIn</a>
    </footer>
  `;
  $.postPanel.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePostPanel() {
  $.postPanel.classList.remove('open');
  document.body.style.overflow = '';
}

function initAdminUiToggle() {
  const stored = localStorage.getItem('vx-admin-ui');
  if (stored === 'visible') {
    document.body.classList.add('admin-ui-visible');
  }
  window.addEventListener('keydown', handleAdminUiShortcut);
}

function initBackToTop() {
  if (!$.backToTop) return;
  $.backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const toggleVisibility = () => {
    if (window.scrollY > 400) {
      $.backToTop.classList.add('visible');
    } else {
      $.backToTop.classList.remove('visible');
    }
  };
  window.addEventListener('scroll', toggleVisibility);
  toggleVisibility();
}

function handleAdminUiShortcut(event) {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
    event.preventDefault();
    const next = !document.body.classList.contains('admin-ui-visible');
    setAdminUiVisibility(next);
  }
}

function setAdminUiVisibility(isVisible, { silent = false, persist = true } = {}) {
  document.body.classList.toggle('admin-ui-visible', isVisible);
  if ($.adminBanner) $.adminBanner.hidden = !isVisible;
  if ($.adminActions) $.adminActions.hidden = !isVisible;
  if (persist) {
    if (isVisible) {
      localStorage.setItem('vx-admin-ui', 'visible');
    } else {
      localStorage.removeItem('vx-admin-ui');
    }
  }
  if (!silent) {
    setTemporaryAdminMessage(
      isVisible
        ? 'Admin controls visible. Use Ctrl+Shift+A to hide.'
        : 'Admin controls hidden.'
    );
  }
}

function initAdminControls() {
  if (!$.adminBanner) return;
  $.adminBanner.classList.add('active');
  updateAdminBannerText();
  toggleAdminComposer();
  if ($.adminHint) {
    $.adminHint.textContent = state.adminHint || '';
  }
  $.adminLogin?.addEventListener('click', promptAdminLogin);
  $.adminLogout?.addEventListener('click', handleAdminLogout);
  $.adminButton?.addEventListener('click', () => {
    if (state.isAdmin) {
      handleAdminLogout();
    } else {
      promptAdminLogin();
    }
  });
  const storedKey = localStorage.getItem('vx-admin-key');
  if (storedKey) {
    attemptAdminLogin(storedKey, { silent: true, persist: true });
  }
}

function promptAdminLogin() {
  const attempt = window.prompt('Enter your admin passphrase');
  if (!attempt) return;
  attemptAdminLogin(attempt);
}

async function attemptAdminLogin(token, { silent = false, persist = true } = {}) {
  try {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Invalid admin token.');
    }
    state.adminKey = token;
    if (persist) {
      localStorage.setItem('vx-admin-key', token);
    }
    setAdminUiVisibility(true, { silent: true });
    enableAdminMode();
    if (!silent) {
      setTemporaryAdminMessage('Admin shortcuts unlocked.');
    }
  } catch (error) {
    if (!silent) {
      alert(error.message || 'Admin login failed.');
    }
    localStorage.removeItem('vx-admin-key');
    state.adminKey = null;
    disableAdminMode();
  }
}

function handleAdminLogout() {
  localStorage.removeItem('vx-admin-key');
  state.adminKey = null;
  disableAdminMode();
}

function enableAdminMode({ silent = false } = {}) {
  if (state.isAdmin) return;
  state.isAdmin = true;
  document.body.classList.add('admin-mode');
  updateAdminBannerText();
  toggleAdminComposer();
  refreshBlogAdminView();
  if (!silent) {
    setTemporaryAdminMessage('Admin mode enabled.');
  }
}

function disableAdminMode() {
  if (!state.isAdmin) return;
  state.isAdmin = false;
  document.body.classList.remove('admin-mode');
  updateAdminBannerText();
  toggleAdminComposer();
  refreshBlogAdminView();
}

function updateAdminBannerText() {
  if (!$.adminStatus) return;
  $.adminStatus.textContent = state.isAdmin
    ? 'Admin shortcuts unlocked. Blog cards now show edit and share tools just for you.'
    : 'You are viewing the public version. Enter your passphrase to unlock admin shortcuts.';
  if ($.adminHint) $.adminHint.textContent = state.adminHint || '';
  if ($.adminLogin) $.adminLogin.disabled = state.isAdmin;
  if ($.adminLogout) $.adminLogout.disabled = !state.isAdmin;
  if ($.adminButton) $.adminButton.textContent = state.isAdmin ? 'Admin (On)' : 'Admin';
}

function refreshBlogAdminView() {
  state.blogPosts = combineBlogPosts();
  updateLatestPostCta();
  buildBlogTags(state.blogPosts);
  const query = $.blogSearch?.value?.toLowerCase() || '';
  filterPosts(query, state.activeBlogTag);
}

function setTemporaryAdminMessage(message) {
  if (!$.adminStatus) return;
  $.adminStatus.textContent = message;
  if (state.adminStatusTimer) {
    clearTimeout(state.adminStatusTimer);
  }
  state.adminStatusTimer = window.setTimeout(() => {
    state.adminStatusTimer = null;
    updateAdminBannerText();
  }, 3500);
}

async function copyToClipboard(value, successMessage) {
  if (!value) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setTemporaryAdminMessage(successMessage || `Copied ${value} to clipboard`);
  } catch (error) {
    console.error('Clipboard copy failed', error);
    alert('Unable to copy the path automatically. Copy it manually instead.');
  }
}

function initials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(input) {
  if (!input) return '--';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(input));
}

async function handleComposerPublish(event) {
  event.preventDefault();
  if (!state.isAdmin || !state.adminKey) {
    alert('Log in as admin to publish new posts.');
    return;
  }
  const data = getComposerData();
  if (!data || !data.title || !data.content) {
    alert('Fill in the title and body before publishing.');
    return;
  }
  const slug = slugify(data.title);
  try {
    if ($.composerPublish) $.composerPublish.disabled = true;
    const response = await fetch(postsPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': state.adminKey
      },
      body: JSON.stringify({
        title: data.title,
        summary: data.summary,
        tags: data.tags,
        heroImage: data.heroImage,
        canonicalUrl: data.canonicalUrl,
        content: data.content,
        date: data.date
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Unable to publish post.');
    }
    state.draftPosts = state.draftPosts.filter((draft) => draft.slug !== slug);
    setTemporaryAdminMessage('Post published. It is now live.');
    $.composerForm?.reset();
    if ($.composerDate) {
      $.composerDate.value = new Date().toISOString().split('T')[0];
    }
    await reloadPostsFromServer();
  } catch (error) {
    alert(error.message || 'Unable to publish post.');
  } finally {
    if ($.composerPublish) $.composerPublish.disabled = false;
  }
}

async function reloadPostsFromServer() {
  try {
    const posts = await fetchJSON(postsPath, postsFallbackPath);
    renderBlog(posts);
  } catch (error) {
    console.error('Failed to reload posts', error);
  }
}

async function handleDeletePost(slug, isDraft) {
  if (!slug) return;
  if (isDraft) {
    const confirmed = window.confirm('Remove this local draft? This cannot be undone.');
    if (!confirmed) return;
    state.draftPosts = state.draftPosts.filter((draft) => draft.slug !== slug);
    setTemporaryAdminMessage('Draft removed.');
    refreshBlogAdminView();
    return;
  }
  if (!state.isAdmin || !state.adminKey) {
    alert('Log in as admin to delete live posts.');
    return;
  }
  const confirmed = window.confirm('Delete this published post? It will be removed for everyone.');
  if (!confirmed) return;
  try {
    const response = await fetch(`${postsPath}/${slug}`, {
      method: 'DELETE',
      headers: {
        'X-Admin-Token': state.adminKey
      }
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Unable to delete post.');
    }
    setTemporaryAdminMessage('Post deleted.');
    await reloadPostsFromServer();
  } catch (error) {
    alert(error.message || 'Unable to delete post.');
  }
}

function getComposerData() {
  if (!$.composerForm) return null;
  return {
    title: $.composerTitle?.value.trim() || '',
    summary: $.composerSummary?.value.trim() || '',
    date: $.composerDate?.value || new Date().toISOString().split('T')[0],
    tags: ($.composerTags?.value || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    canonicalUrl: $.composerCanonical?.value.trim() || '',
    heroImage: $.composerHero?.value.trim() || '',
    content: $.composerContent?.value.trim() || ''
  };
}

function previewComposerPost() {
  const post = buildComposerPost();
  if (!post) return;
  state.draftPosts = state.draftPosts.filter((draft) => draft.slug !== post.slug);
  state.draftPosts.unshift(post);
  setTemporaryAdminMessage(`Draft "${post.title}" loaded. Copy or download the Markdown next.`);
  refreshBlogAdminView();
}

function buildComposerPost() {
  const data = getComposerData();
  if (!data || !data.title || !data.content) {
    alert('Please fill in both the title and body to create a draft.');
    return null;
  }
  const slug = slugify(data.title);
  const summary = data.summary || data.content.slice(0, 160);
  return {
    title: data.title,
    slug,
    publishedAt: data.date,
    summary,
    tags: data.tags,
    heroImage: data.heroImage,
    canonicalUrl: data.canonicalUrl,
    readingTime: calculateReadingTime(data.content),
    contentHtml: markdownToHtmlLite(data.content),
    sourcePath: `content/posts/${slug}.md`,
    isDraft: true
  };
}

function handleComposerCopy() {
  const data = getComposerData();
  if (!data || !data.title || !data.content) {
    alert('Fill in the title and body before copying.');
    return;
  }
  const markdown = generateMarkdownFromComposer(data);
  copyToClipboard(markdown, 'Markdown copied. Paste it into content/posts/your-slug.md.');
}

function handleComposerDownload() {
  const data = getComposerData();
  if (!data || !data.title || !data.content) {
    alert('Fill in the title and body before downloading.');
    return;
  }
  const slug = slugify(data.title);
  const markdown = generateMarkdownFromComposer(data);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${slug}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  setTemporaryAdminMessage('Downloaded Markdown file. Drop it into content/posts/.');
}

function handleComposerReset() {
  $.composerForm?.reset();
  if ($.composerDate) {
    $.composerDate.value = new Date().toISOString().split('T')[0];
  }
  setTemporaryAdminMessage('Composer cleared.');
}

function generateMarkdownFromComposer(data) {
  const tags = data.tags.length ? JSON.stringify(data.tags) : '[]';
  const summary = data.summary || data.content.slice(0, 140).replace(/"/g, "'");
  return `---
title: "${data.title}"
date: "${data.date}"
summary: "${summary}"
tags: ${tags}
heroImage: "${data.heroImage}"
canonicalUrl: "${data.canonicalUrl}"
---

${data.content}
`;
}

function markdownToHtmlLite(markdown = '') {
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

function calculateReadingTime(text = '') {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function slugify(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

init();
