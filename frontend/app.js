/* IdeaHub Vanilla Frontend
 * Plain HTML + CSS + JavaScript replacement for the React frontend.
 * Backend/API stays compatible with the existing IdeaHub Express + PostgreSQL server.
 */

const API_URL = (window.IDEAHUB_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const UPLOADS_URL = API_URL.replace(/\/api$/, '/uploads');
const TOKEN_KEY = 'ideahub_token';
const USER_KEY = 'ideahub_user';
const THEME_KEY = 'ideahub_theme';

// Configure these from your EmailJS dashboard. The public key is intended for browser use.
const EMAILJS_CONFIG = window.IDEAHUB_EMAIL_CONFIG || {
  publicKey: '',
  serviceId: '',
  contactTemplateId: '',
  verificationTemplateId: '',
};
// if (window.emailjs && EMAILJS_CONFIG.publicKey) {
//   emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey, blockHeadless: true, limitRate: { id: 'ideahub', throttle: 10000 } });
// }

const CATEGORIES = ['All', 'AI / ML', 'Web / App', 'IoT', 'Robotics', 'Cyber Security', 'Electronics', 'Computer Vision', 'Design', 'Mechanical', 'Civil', 'Other'];
const STATUSES = ['Idea', 'Building', 'Prototype', 'Working Prototype', 'Demo Ready', 'Completed'];

const demoVideo = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const DEMO_IDEAS = [
  { id: 'idea-1', title: 'AI Attendance with Face Recognition', description: 'A compact attendance system that detects students, matches their faces against a registered dataset and records attendance automatically.', category: 'AI / ML', technologies: ['Python', 'OpenCV', 'FaceNet'], status: 'Working Prototype', duration: 48, videoUrl: demoVideo, thumbnail: '', creator: { id: 'user-1', name: 'Ranjan Kumar', username: 'ranjan.ai', verificationStatus: 'verified' }, views: 1280, likes: 126, commentsCount: 2, tags: ['#AI', '#OpenCV', '#Attendance'] },
  { id: 'idea-2', title: 'Smart Dustbin using Arduino', description: 'An ultrasonic sensor detects a nearby user and a servo motor opens the dustbin automatically. The goal is hands-free waste disposal.', category: 'IoT', technologies: ['Arduino', 'Ultrasonic Sensor', 'Servo'], status: 'Prototype', duration: 36, videoUrl: demoVideo, thumbnail: '', creator: { id: 'user-2', name: 'Priya Sharma', username: 'priya.makes', verificationStatus: 'verified' }, views: 980, likes: 87, commentsCount: 0, tags: ['#Arduino', '#IoT', '#Prototype'] },
  { id: 'idea-3', title: 'CyberSafe QR Scam Pre-Scanner', description: 'A mobile-first security concept that checks a QR destination before a payment or link is opened and warns users about suspicious URLs.', category: 'Cyber Security', technologies: ['Kotlin', 'Firebase', 'Python'], status: 'Building', duration: 54, videoUrl: demoVideo, thumbnail: '', creator: { id: 'user-3', name: 'Aditya Singh', username: 'aditya.sec', verificationStatus: 'verified' }, views: 1540, likes: 153, commentsCount: 0, tags: ['#CyberSecurity', '#QR', '#Android'] },
  { id: 'idea-4', title: 'Campus Navigation for First-Year Students', description: 'A simple indoor/outdoor navigation concept to help new students find labs, offices and classrooms quickly.', category: 'Web / App', technologies: ['React', 'Node.js', 'Maps'], status: 'Idea', duration: 31, videoUrl: demoVideo, thumbnail: '', creator: { id: 'user-4', name: 'Karan Mehta', username: 'karan.builds', verificationStatus: 'verified' }, views: 640, likes: 49, commentsCount: 0, tags: ['#React', '#Campus', '#UX'] },
  { id: 'idea-5', title: 'Low-Cost Water Level Alert', description: 'A low-cost IoT device that detects tank level and sends an alert when the water reaches a configured threshold.', category: 'Electronics', technologies: ['ESP32', 'IoT', 'Sensors'], status: 'Demo Ready', duration: 42, videoUrl: demoVideo, thumbnail: '', creator: { id: 'user-5', name: 'Sakshi Verma', username: 'sakshi.lab', verificationStatus: 'verified' }, views: 820, likes: 71, commentsCount: 0, tags: ['#ESP32', '#Sensors', '#SmartHome'] },
  { id: 'idea-6', title: 'Gesture-Controlled Presentation', description: 'A computer-vision experiment that lets a presenter change slides with simple hand gestures.', category: 'Computer Vision', technologies: ['Python', 'MediaPipe', 'OpenCV'], status: 'Working Prototype', duration: 57, videoUrl: demoVideo, thumbnail: '', creator: { id: 'user-6', name: 'Vivek Rao', username: 'vivek.cv', verificationStatus: 'verified' }, views: 1130, likes: 99, commentsCount: 0, tags: ['#ComputerVision', '#Python', '#MediaPipe'] },
];

const state = {
  user: readJSON(USER_KEY, null),
  token: localStorage.getItem(TOKEN_KEY) || '',
  ideas: [],
  loading: true,
  query: '',
  theme: localStorage.getItem(THEME_KEY) || 'dark',
  toast: '',
  previousPath: '#/',
  notifications: [],
  notificationUnread: 0,
  notificationOpen: false,
  globalSearchResults: [],
  myIdeaFilter: 'all',
  commentModalId: null,
  notificationTimer: null,
};

function readJSON(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function esc(value) { return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
function fmtViews(value) { const n = Number(value || 0); if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`; if (n >= 1000) return `${(n / 1000).toFixed(1)}K`; return String(n); }
function normalizeIdea(i) { return { ...i, id: i.id || i._id, contentType: i.contentType || 'idea', status: i.projectStatus || i.status || 'Prototype', thumbnail: i.thumbnailUrl || i.thumbnail || '', likes: i.likesCount ?? i.likes ?? 0, saves: i.savesCount ?? i.saves ?? 0, shares: i.sharesCount ?? i.shares ?? 0, commentsCount: i.commentsCount ?? i.comments?.length ?? 0 }; }
function icon(name, size = 18) {
  const paths = {
    home: '<path d="m3 9 9-7 9 7v10a2 2 0 0 1-2 2h-5v-6H10v6H5a2 2 0 0 1-2-2Z"/><path d="M9 21h6"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M3 9h18M3 15h18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    plusCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    bookmark: '<path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.5L6 21z"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
    grid: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
    shield: '<path d="M12 3 20 6v6c0 5-3.2 8-8 10-4.8-2-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    login: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M13 4h6v16h-6"/>',
    logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 4h4v16h-4"/>',
    eye: '<path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
    heart: '<path d="M20.8 8.7c0 5.4-8.8 10.3-8.8 10.3S3.2 14.1 3.2 8.7A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 8.8 2.7Z"/>',
    message: '<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-4.2-1L4 20l1.5-3.6A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/>',
    play: '<path d="m9 6 9 6-9 6Z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="8" y="6" width="3" height="12" fill="currentColor" stroke="none"/><rect x="13" y="6" width="3" height="12" fill="currentColor" stroke="none"/>',
    volume: '<path d="M4 10v4h4l5 4V6l-5 4z"/><path d="M16 9a4.2 4.2 0 0 1 0 6M18.5 6.8a7.3 7.3 0 0 1 0 8.4"/>',
    mute: '<path d="M4 10v4h4l5 4V6l-5 4z"/><path d="m17 9 4 4m0-4-4 4"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 11 7.6-4.8M8.2 13l7.6 4.8"/>',
    edit: '<path d="m4 16.5-.8 4.3 4.3-.8L19 8.5a2.5 2.5 0 0 0-3.5-3.5zM14.5 6.5l3 3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
    arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    chevronUp: '<path d="m6 15 6-6 6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    scissors: '<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="m8 8 10 8M8 16 18 8"/>',
    camera: '<path d="M5 7h3l1.5-2h5L16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.5"/>',
    upload: '<path d="M12 15V4M8 8l4-4 4 4M5 14v5h14v-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
    mapPin: '<path d="M12 21s6-6 6-11a6 6 0 0 0-12 0c0 5 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
    zap: '<path d="m13 2-8 11h6l-1 9 8-11h-6z"/>',
    sliders: '<path d="M4 7h16M4 17h16M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    userCheck: '<circle cx="8" cy="8" r="3"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M16 11l2 2 4-4"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
}

function href(path) { return `#${path}`; }
function route() { const hash = location.hash || '#/'; const clean = hash.replace(/^#/, '') || '/'; return clean.startsWith('/') ? clean : `/${clean}`; }
function go(path) { state.previousPath = location.hash || '#/'; location.hash = path; }
function getRouteParts() { return route().split('/').filter(Boolean); }
function isAuth() { return Boolean(state.token && state.user); }
function requireAuth(target = '/login') { if (!isAuth()) { go(target); return false; } return true; }

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(data?.message || data || 'Request failed.');
  return data;
}
const api = {
  me: () => request('/auth/me'),

  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }),

  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }),

  ideas: ({
    search = '',
    category = '',
    mine = false,
    saved = false,
    sort = 'latest',
    contentType = '',
    page = 1,
    limit = 12
  } = {}) => {
    const q = new URLSearchParams({
      search,
      category,
      mine: String(mine),
      saved: String(saved),
      sort,
      contentType,
      page: String(page),
      limit: String(limit)
    });

    return request(`/ideas?${q}`);
  },

  idea: (id) =>
    request(`/ideas/${encodeURIComponent(id)}`),

  view: (id) =>
    request(`/ideas/${encodeURIComponent(id)}/view`, {
      method: 'POST'
    }),

  share: (id, method = 'copy') =>
    request(`/ideas/${encodeURIComponent(id)}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ method })
    }),

  createIdea: (formData) =>
    request('/ideas', {
      method: 'POST',
      body: formData
    }),

  createReel: (formData) =>
    request('/ideas/reel', {
      method: 'POST',
      body: formData
    }),

  updateIdea: (id, formData) =>
    request(`/ideas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: formData
    }),

  deleteIdea: (id) =>
    request(`/ideas/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),

  like: (id) =>
    request(`/ideas/${encodeURIComponent(id)}/like`, {
      method: 'POST'
    }),

  save: (id) =>
    request(`/ideas/${encodeURIComponent(id)}/save`, {
      method: 'POST'
    }),

  comments: (id) =>
    request(`/ideas/${encodeURIComponent(id)}/comments`),

  comment: (id, text) =>
    request(`/ideas/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    }),

  notifications: ({
    unreadOnly = false,
    limit = 30
  } = {}) =>
    request(
      `/notifications?unreadOnly=${String(unreadOnly)}&limit=${limit}`
    ),

  markNotificationRead: (id) =>
    request(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH'
    }),

  markAllNotificationsRead: () =>
    request('/notifications/read-all', {
      method: 'PATCH'
    }),

  loginHistory: () =>
    request('/users/me/login-history'),

  profile: (username) =>
    request(`/users/${encodeURIComponent(username)}`),

  adminDashboard: () =>
    request('/admin/dashboard'),

  pendingUsers: () =>
    request('/admin/users/pending'),

  verifyUser: (id, status) =>
    request(`/admin/users/${id}/verification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    }),

  pendingIdeas: () =>
    request('/admin/ideas/pending'),

  moderateIdea: (
    id,
    status,
    rejectionReason = ''
  ) =>
    request(`/admin/ideas/${encodeURIComponent(id)}/moderation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status,
        rejectionReason
      })
    })
};

function setTheme(theme) { state.theme = theme; localStorage.setItem(THEME_KEY, theme); document.documentElement.dataset.theme = theme; }
setTheme(state.theme);

function showToast(message) { state.toast = message; renderToast(); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { state.toast = ''; renderToast(); }, 1800); }
function renderToast() { let el = document.getElementById('toast-root'); if (!el) { el = document.createElement('div'); el.id = 'toast-root'; document.body.appendChild(el); } el.innerHTML = state.toast ? `<div class="toast-message static">${esc(state.toast)}</div>` : ''; }

async function loadSession() {
  if (!state.token) return;
  try { const result = await api.me(); state.user = result.user; writeJSON(USER_KEY, state.user); await loadNotifications(true); startNotificationPolling(); }
  catch { state.token = ''; state.user = null; localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
}
async function loadNotifications(silent = false) {
  if (!isAuth()) return;
  try {
    const result = await api.notifications({ limit: 30 });
    const oldUnread = Number(state.notificationUnread || 0);
    state.notifications = result.data || [];
    state.notificationUnread = Number(result.unreadCount || 0);
    if (!silent && state.notificationUnread > oldUnread && !state.notificationOpen) maybeNotify(state.notifications.find(n => !n.isRead));
    updateNotificationUI();
  } catch (e) { if (!silent) console.warn('Notification load failed:', e.message); }
}
function startNotificationPolling() {
  clearInterval(state.notificationTimer);
  if (!isAuth()) return;
  state.notificationTimer = setInterval(() => loadNotifications(true), 15000);
}
function stopNotificationPolling() { clearInterval(state.notificationTimer); state.notificationTimer = null; }
function maybeNotify(n) {
  if (!n || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try { new Notification(n.title, { body: n.message }); } catch { }
}
function updateNotificationUI() {
  const badge = document.querySelector('[data-notification-badge]');
  if (badge) { badge.textContent = state.notificationUnread > 9 ? '9+' : String(state.notificationUnread); badge.hidden = state.notificationUnread < 1; }
  const menu = document.getElementById('notification-menu');
  if (menu && state.notificationOpen) menu.innerHTML = notificationMenuInner();
}
function notificationMenuInner() {
  const items = state.notifications || [];
  return `<div class="notification-menu-head"><div><strong>Notifications</strong><small>${state.notificationUnread ? `${state.notificationUnread} unread` : 'All caught up'}</small></div>${state.notificationUnread ? '<button data-action="mark-all-notifications">Mark all read</button>' : ''}</div><div class="notification-list">${items.length ? items.map(n => `<button class="notification-item ${n.isRead ? '' : 'unread'}" data-notification-id="${esc(n.id)}" data-notification-idea="${esc(n.idea?.id || '')}"><span class="notification-icon">${icon(n.type === 'like' ? 'heart' : n.type === 'comment' ? 'message' : n.type === 'save' ? 'bookmark' : n.type === 'share' ? 'share' : n.type === 'verification' ? 'shield' : n.type === 'moderation' ? 'checkCircle' : 'bell', 16)}</span><span><strong>${esc(n.title)}</strong><small>${esc(n.message)}</small><time>${formatRelativeTime(n.createdAt)}</time></span></button>`).join('') : '<div class="notification-empty">No notifications yet.</div>'}</div><div class="notification-footer"><button data-action="request-browser-notifications">${typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'Desktop notifications enabled' : 'Enable desktop notifications'}</button></div>`;
}
function formatRelativeTime(value) { const t = new Date(value).getTime(); if (!Number.isFinite(t)) return ''; const diff = Math.max(0, Date.now() - t); const mins = Math.floor(diff / 60000); if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h`; const days = Math.floor(hrs / 24); return days < 7 ? `${days}d` : new Date(value).toLocaleDateString(); }
async function markNotificationRead(id) { try { await api.markNotificationRead(id); const item = state.notifications.find(n => String(n.id) === String(id)); if (item && !item.isRead) { item.isRead = true; state.notificationUnread = Math.max(0, state.notificationUnread - 1); } updateNotificationUI(); } catch { } }
async function loadIdeas(params = {}) {
  state.loading = true;
  try {
    const result = await api.ideas(params);
    state.ideas = (result.data || []).map(normalizeIdea);
    if (!state.ideas.length && location.protocol === 'file:' && !isAuth()) state.ideas = DEMO_IDEAS.map(normalizeIdea);
  } catch (e) {
    state.ideas = [];
    if (location.protocol === 'file:' && !isAuth()) state.ideas = DEMO_IDEAS.map(normalizeIdea);
    if (location.protocol !== 'file:') console.warn('Idea feed failed:', e.message);
  } finally { state.loading = false; }
}

function navBar() {
  const results = state.globalSearchResults || [];
  return `<header class="navbar"><div class="navbar-inner"><a class="brand" href="#/"><span class="brand-mark">IH</span><span>IdeaHub</span></a><div class="search-wrap">${icon('search')}<input id="global-search" value="${esc(state.query)}" placeholder="Search ideas, creators, technologies…" autocomplete="off" /><kbd>Ctrl K</kbd>${results.length ? `<div class="search-dropdown">${results.map(i => `<button data-nav="/idea/${encodeURIComponent(i.id)}"><span class="mini-gradient">▶</span><span><strong>${esc(i.title)}</strong><small>${esc(i.category)} · @${esc(i.creator?.username || 'creator')}</small></span></button>`).join('')}</div>` : ''}</div><div class="nav-actions"><a href="#/explore" class="icon-button" title="Explore">${icon('compass')}</a><button class="icon-button" id="theme-btn" title="Theme">${icon('sun')}</button>${isAuth() ? `<div class="notification-wrap"><button class="icon-button notification" id="notification-btn" title="Notifications">${icon('bell')}<span data-notification-badge ${state.notificationUnread ? '' : 'hidden'}>${state.notificationUnread > 9 ? '9+' : state.notificationUnread}</span></button><div id="notification-menu" class="notification-menu" ${state.notificationOpen ? '' : 'hidden'}>${notificationMenuInner()}</div></div><a class="upload-top" href="#/upload">${icon('plus')} New idea</a><button class="avatar-button" id="avatar-menu">${esc((state.user.name || 'I').slice(0, 1).toUpperCase())}</button><div id="account-menu" class="account-menu" hidden><a href="#/profile/${encodeURIComponent(state.user.username)}">${icon('user', 15)} Profile</a><a href="#/my-ideas">${icon('grid', 15)} My ideas</a><a href="#/saved">${icon('bookmark', 15)} Saved</a>${state.user.role === 'admin' ? `<a href="#/admin">${icon('shield', 15)} Admin</a>` : ''}<button data-action="logout">${icon('logout', 15)} Logout</button></div>` : `<a class="login-top" href="#/login">${icon('login')} Login</a>`}</div></div></header>`;
}

function sidebar() {
  const p = route();
  const link = (to, label, ic) => `<a href="#${to}" class="sidebar-link ${p === to ? 'active' : ''}">${icon(ic)}${label}</a>`;
  return `<aside class="sidebar"><div class="sidebar-block"><p class="sidebar-label">DISCOVER</p>${link('/', 'Home', 'home')}${link('/explore', 'Explore Ideas', 'compass')}${link('/reels', 'Idea Reels', 'film')}${isAuth() ? link('/reel-upload', 'Upload a Reel', 'upload') : ''}${link('/upload', 'Share an Idea', 'plusCircle')}${link('/about', 'About IdeaHub', 'info')}</div><div class="sidebar-block"><p class="sidebar-label">YOUR SPACE</p>${isAuth() ? `${link('/my-ideas', 'My Ideas', 'grid')}${link('/saved', 'Saved Ideas', 'bookmark')}${link(`/profile/${encodeURIComponent(state.user.username)}`, 'Profile', 'user')}${state.user.role === 'admin' ? link('/admin', 'Admin', 'shield') : ''}` : `<a href="#/register" class="sidebar-cta"><span>Join the verified idea community</span><strong>→</strong></a>`}</div><div class="sidebar-note"><strong>30–60 seconds.</strong><span>One idea. One prototype. One quick demo. Publishing is limited to verified student accounts.</span></div></aside>`;
}

function mobileNav() { if (!isAuth()) return ''; const p = route(); const link = (to, label, ic) => `<a href="#${to}" class="mobile-nav-link ${p === to ? 'active' : ''}">${icon(ic, 18)}<span>${label}</span></a>`; return `<nav class="mobile-nav">${link('/', 'Home', 'home')}${link('/explore', 'Explore', 'compass')}${link('/reels', 'Reels', 'film')}${link('/my-ideas', 'My ideas', 'grid')}${link(`/profile/${encodeURIComponent(state.user.username)}`, 'Profile', 'user')}</nav>`; }
function shell(content) { return `<div class="app-shell">${navBar()}<div class="page-layout">${sidebar()}<main class="main-content">${content}</main></div>${mobileNav()}</div>`; }

function ideaCard(idea, featured = false) {
  const thumb = idea.thumbnail ? `<img src="${esc(idea.thumbnail)}" alt="" loading="lazy">` : `<div class="media-gradient"><span class="play-circle">${icon('play', 25)}</span></div>`;
  return `<article class="idea-card ${featured ? 'featured' : ''}"><a href="#/idea/${encodeURIComponent(idea.id)}" class="idea-media">${thumb}<span class="duration-badge">${Math.round(idea.duration || 0)}s</span><span class="status-badge">${esc(idea.status || 'Prototype')}</span></a><div class="idea-body"><div class="idea-topline"><span class="category-tag">${esc(idea.category)}</span><span class="time-tag">${idea.contentType === 'reel' ? '10–60 sec Reel' : '30–60 sec Idea'}</span></div><a href="#/idea/${encodeURIComponent(idea.id)}" class="idea-title">${esc(idea.title)}</a><p class="idea-description">${esc(idea.description)}</p><div class="creator-row"><div class="creator-avatar">${esc((idea.creator?.name || 'I').slice(0, 1).toUpperCase())}</div><a href="#/profile/${encodeURIComponent(idea.creator?.username || 'creator')}"><strong>${esc(idea.creator?.name || 'IdeaHub creator')}</strong><small>@${esc(idea.creator?.username || 'creator')}</small></a>${idea.creator?.verificationStatus === 'verified' ? `<span class="verified-mini">✓</span>` : ''}</div><div class="idea-meta"><span>${icon('eye', 15)} ${fmtViews(idea.views)}</span><button data-action="like" data-id="${esc(idea.id)}" class="${idea.liked ? 'liked-button' : ''}">${icon('heart', 15)} ${idea.likes || 0}</button><button data-action="open-comments" data-id="${esc(idea.id)}">${icon('message', 15)} ${idea.commentsCount ?? 0}</button><button data-action="save" data-id="${esc(idea.id)}" class="save-demo" title="Save idea">${icon('bookmark', 15)}</button><button data-action="share" data-id="${esc(idea.id)}" title="Share">${icon('share', 15)} ${idea.shares || 0}</button></div></div></article>`;
}
function ideaGrid(ideas, empty = 'No ideas found.') { return ideas.length ? `<div class="idea-grid">${ideas.map(i => ideaCard(i)).join('')}</div>` : `<div class="empty-state"><h3>No ideas found</h3><p>${esc(empty)}</p></div>`; }
function categoryBar(current = 'All') { return `<div class="category-scroll">${CATEGORIES.map(c => `<button data-category="${esc(c)}" class="category-pill ${current === c ? 'active' : ''}">${esc(c)}</button>`).join('')}</div>`; }

function homePage() {
  const featured = state.ideas[0];
  return `<div class="home-page"><section class="hero-section"><div class="hero-copy"><div class="eyebrow">${icon('zap')} ENGINEERING + CREATIVITY</div><h1>Show your idea.<br><span>Prove it in 60 seconds.</span></h1><p>IdeaHub is a short-video platform for students, developers, makers and creative thinkers to showcase projects, prototypes, experiments and bold concepts.</p><div class="hero-actions"><a href="#/explore" class="primary-button">${icon('compass')} Explore ideas</a><a href="#/upload" class="secondary-button">${icon('plus')} Share your idea</a></div><div class="hero-points"><span>${icon('zap', 15)} Fast demos</span><span>${icon('cpu', 15)} Tech-first</span><span>${icon('arrowUpRight', 15)} Community feedback</span></div></div>${featured ? ideaCard(featured, true) : ''}</section><section class="section-block"><div class="section-heading-row"><div><span class="eyebrow">DISCOVER</span><h2>Ideas worth watching</h2><p>Short demos that get straight to the point.</p></div><a href="#/explore" class="text-link">View all ${icon('arrowUpRight', 15)}</a></div><div id="home-category-bar">${categoryBar('All')}</div><div id="home-ideas" class="idea-grid">${state.ideas.slice(0, 6).map(idea => ideaCard(idea)).join('')}</div></section><section class="idea-cta"><div><span class="eyebrow">BUILD IN PUBLIC</span><h2>Your prototype deserves a 60-second story.</h2><p>Capture the problem, the build and the result. Let other makers ask questions, suggest improvements and remix the idea.</p></div><a class="primary-button" href="#/upload">Upload a demo ${icon('arrowUpRight', 15)}</a></section></div>`;
}

async function explorePage() {
  const params = state.exploreParams || { category: 'All', sort: 'latest', query: '' };
  return `<div class="page-panel"><div class="page-header"><div><span class="eyebrow">${icon('sliders')} EXPLORE</span><h1>Find your next idea</h1><p>Search by problem, technology, project type or creator.</p></div><select id="explore-sort"><option value="latest" ${params.sort === 'latest' ? 'selected' : ''}>Newest</option><option value="popular" ${params.sort === 'popular' ? 'selected' : ''}>Most viewed</option><option value="likes" ${params.sort === 'likes' ? 'selected' : ''}>Most liked</option></select></div><div class="explore-search"><input id="explore-query" value="${esc(params.query)}" placeholder="Try: AI, Arduino, attendance, cyber security…" /></div><div id="explore-cats">${categoryBar(params.category)}</div>${state.loading ? `<div class="screen-loader">Loading ideas…</div>` : `<div id="explore-grid">${ideaGrid(state.ideas, 'Try another keyword or category.')}</div>`}</div>`;
}

function videoPlayer(idea) { return `<div class="video-player-shell"><video id="detail-video" src="${esc(idea.videoUrl || '')}" poster="${esc(idea.thumbnail || '')}" controls playsinline></video><div class="video-controls-overlay"><button data-action="detail-play">${icon('play')}</button><button data-action="detail-mute">${icon('volume')}</button></div><div class="video-label">Demo clip · ${Math.round(idea.duration || 0)}s</div></div>`; }

async function fetchIdea(id) { try { const remote = await api.idea(id); return normalizeIdea(remote); } catch { return state.ideas.find(i => String(i.id) === String(id)) || null; } }

async function detailsPage(id) {
  const idea = await fetchIdea(id);
  if (!idea) return `<div class="empty-state"><h2>Idea not found</h2><a href="#/explore" class="primary-button">Back to explore</a></div>`;
  const owner = isAuth() && String(state.user.id || state.user._id) === String(idea.creator?.id || idea.creator?._id);
  const comments = await loadCommentsSafe(id);
  return `<div class="details-page"><button class="back-link" data-action="back">${icon('arrowLeft')} Back</button><div class="details-layout"><div>${videoPlayer(idea)}<div class="details-content"><div class="idea-topline"><span class="category-tag">${esc(idea.category)}</span><span class="status-badge inline">${esc(idea.status)}</span>${idea.creator?.verificationStatus === 'verified' ? `<span class="verified-profile small">${icon('shield', 14)} Verified</span>` : ''}</div><div class="title-with-actions"><h1>${esc(idea.title)}</h1>${owner ? `<a class="icon-link" href="#/idea/${encodeURIComponent(idea.id)}/edit" title="Edit">${icon('edit')}</a>` : ''}</div><p class="details-description">${esc(idea.description)}</p><div class="creator-row large"><div class="creator-avatar">${esc((idea.creator?.name || 'I').slice(0, 1).toUpperCase())}</div><div><strong>${esc(idea.creator?.name || 'IdeaHub creator')}</strong><small>@${esc(idea.creator?.username || 'creator')}</small></div><a class="follow-button" href="#/profile/${encodeURIComponent(idea.creator?.username || 'creator')}">View creator</a></div><div class="detail-actions"><button data-action="like" data-id="${esc(idea.id)}" class="${idea.liked ? 'liked-button' : ''}">${icon('heart')} ${idea.likes || 0}</button><button data-action="save" data-id="${esc(idea.id)}">${icon('bookmark')} ${idea.saved ? 'Saved' : 'Save'}</button><button data-action="share" data-id="${esc(idea.id)}">${icon('share')} Share</button><span>${icon('eye')} ${fmtViews(idea.views)} views</span></div><div id="detail-toast"></div><div class="tech-list">${(idea.technologies || []).map(t => `<span>${esc(t)}</span>`).join('')}</div><div class="tag-row">${(idea.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}</div></div></div><aside class="details-side"><div class="side-card"><span class="eyebrow">PROJECT STATUS</span><h3>${esc(idea.status)}</h3><p>Short-form project showcase. Watch the demo, understand the problem, then ask the creator how you could improve or build on it.</p><div class="side-stat-grid"><span><strong>${Math.round(idea.duration || 0)}s</strong><small>clip</small></span><span><strong>${idea.saves || 0}</strong><small>saves</small></span><span><strong>${idea.commentsCount || comments.length}</strong><small>comments</small></span></div></div>${commentsPanel(id, comments)}</aside></div></div>`;
}
async function loadCommentsSafe(id) { try { return await api.comments(id); } catch { return []; } }
async function openCommentsModal(id) {
  const idea = await fetchIdea(id);
  if (!idea) return showToast('Idea not found.');
  const modalId = 'comment-modal';
  document.getElementById(modalId)?.remove();
  const wrap = document.createElement('div');
  wrap.id = modalId;
  wrap.className = 'comment-modal';
  wrap.innerHTML = `<div class="comment-modal-card" role="dialog" aria-modal="true" aria-label="Comments for ${esc(idea.title)}">
    <div class="comment-modal-head"><div><span class="eyebrow">PROJECT DISCUSSION</span><h2>${esc(idea.title)}</h2></div><button class="modal-close" data-comment-close>${icon('x')}</button></div>
    <div class="comment-modal-body"><div class="screen-loader compact">Loading comments…</div></div>
  </div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener('click', (event) => { if (event.target === wrap || event.target.closest('[data-comment-close]')) close(); });
  const body = wrap.querySelector('.comment-modal-body');
  try {
    const comments = await api.comments(id);
    body.innerHTML = `${isAuth() ? `<form class="comment-form modal-comment-form" data-modal-comment-form><input name="text" maxlength="400" placeholder="Ask a question or suggest an improvement…" autocomplete="off"><button class="primary-button" type="submit">Comment</button></form>` : '<p class="login-hint">Sign in to join the discussion.</p>'}
      <div class="comment-list">${comments.length ? comments.map(c => `<div class="comment-item"><div class="creator-avatar small">${esc((c.user || 'I').slice(0, 1).toUpperCase())}</div><div><strong>${esc(c.user || 'User')}</strong>${c.verificationStatus === 'verified' ? '<span class="verified-mini">✓</span>' : ''}<small>${formatRelativeTime(c.createdAt)}</small><p>${esc(c.text)}</p></div></div>`).join('') : '<div class="notification-empty">No comments yet. Start the discussion.</div>'}</div>`;
    const form = body.querySelector('[data-modal-comment-form]');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!isAuth()) return go('/login');
      const input = form.querySelector('input[name="text"]');
      const text = String(input.value || '').trim();
      if (!text) return;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        await api.comment(id, text);
        input.value = '';
        await openCommentsModal(id);
        patchIdea(id, { commentsCount: (idea.commentsCount || 0) + 1 });
      } catch (error) { showToast(error.message); }
      finally { button.disabled = false; }
    });
  } catch (error) {
    body.innerHTML = `<div class="empty-state compact"><h3>Comments could not load</h3><p>${esc(error.message || 'Please try again.')}</p></div>`;
  }
}

async function handleComment(event) {
  event.preventDefault();
  if (!isAuth()) return go('/login');
  const form = event.currentTarget;
  const id = form.dataset.id;
  const input = form.querySelector('input[name="text"]');
  const text = String(input?.value || '').trim();
  if (!text) return;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    await api.comment(id, text);
    input.value = '';
    showToast('Comment added');
    await openCommentsModal(id);
  } catch (error) { showToast(error.message); }
  finally { button.disabled = false; }
}

function commentsPanel(id, comments) { return `<section class="comments-panel"><div class="section-heading"><h2>${icon('message')} Project discussion</h2><span>${comments.length} comments</span></div>${isAuth() ? `<form class="comment-form" data-form="comment" data-id="${esc(id)}"><input name="text" placeholder="Ask a question or suggest an improvement…" /><button>Comment</button></form>` : `<p class="login-hint">Sign in to join the discussion.</p>`}<div class="comment-list">${comments.map(c => `<div class="comment-item"><div class="creator-avatar small">${esc((c.user || 'I').slice(0, 1).toUpperCase())}</div><div><strong>${esc(c.user || 'User')}</strong>${c.verificationStatus === 'verified' ? `<span class="verified-mini">✓</span>` : ''}<p>${esc(c.text)}</p></div></div>`).join('')}</div></section>`; }

function loginPage() { return `<div class="auth-page"><div class="auth-showcase"><span class="eyebrow">${icon('shield')} VERIFIED CREATOR NETWORK</span><h1>Good ideas deserve a trusted audience.</h1><p>IdeaHub keeps the feed focused on engineering, prototype and creative work. Only verified student accounts can publish.</p><div class="auth-highlights"><div>${icon('userCheck')}<span>Student verification</span></div><div>${icon('shield')}<span>Moderated uploads</span></div></div></div><div class="auth-card"><span class="eyebrow">WELCOME BACK</span><h2>Sign in to IdeaHub</h2><p>Use a verified IdeaHub account. New accounts are reviewed before publishing access.</p><form id="login-form"><label>Username or Email<input name="identifier" autocomplete="username" placeholder="username or you@example.com" /></label><label>Password<input name="password" type="password" placeholder="Your password" /></label><div id="login-error"></div><button class="primary-button auth-submit">Sign in ${icon('arrowRight')}</button></form><div class="demo-note"><strong>Tip</strong><span>Use the username or email you used during registration.</span></div><p class="auth-switch">New creator? <a href="#/register">Create a verified account</a></p></div></div>`; }

function registerPage() { return `<div class="auth-page register-page"><div class="auth-card auth-card-wide"><span class="eyebrow">${icon('shield')} STUDENT VERIFICATION</span><h2>Create your IdeaHub account</h2><p>Use your college/student ID and institutional email. New accounts start as <strong>Pending</strong> and need admin approval before they can publish.</p><div class="privacy-note">${icon('checkCircle')}<span>For this college model, IdeaHub verifies a student profile instead of collecting Aadhaar numbers or biometric data.</span></div><form id="register-form" class="form-grid"><label>Full name<input name="name" placeholder="Your full name" /></label><label>Username<input name="username" placeholder="ranjan.ai" /></label><label>Email<input name="email" type="email" placeholder="personal@example.com" /></label><label>Password<input name="password" type="password" placeholder="Minimum 8 characters" /></label><label>College / Institution<input name="collegeName" placeholder="Your college name" /></label><label>Student / Enrollment ID<input name="studentId" placeholder="CSE-23-104" /></label><label class="full">Institutional email<input name="institutionEmail" type="email" placeholder="name@college.edu" /></label><div id="register-error" class="full"></div><div class="form-footer full"><span>Use your official student details. Admin verification controls publishing access.</span><button class="primary-button">Create account</button></div></form><p class="auth-switch">Already registered? <a href="#/login">Sign in</a></p></div></div>`; }

function profilePageShell(username) { return `<div class="screen-loader" id="profile-loading">Loading creator…</div>`; }

async function renderProfile(username) {
  try {
    const data = await api.profile(username);
    const user = data.user; const ideas = (data.ideas || []).map(normalizeIdea);
    const isOwnProfile = isAuth() && String(state.user.username) === String(user.username);
    let loginHistory = [];
    if (isOwnProfile) {
      try { loginHistory = (await api.loginHistory()).data || []; } catch { loginHistory = []; }
    }
    const historyCard = isOwnProfile ? `<section class="profile-activity"><div class="section-heading-row"><div><span class="eyebrow">ACCOUNT SECURITY</span><h2>Recent login activity</h2><p>Your last ${Math.min(loginHistory.length, 8)} signed-in sessions recorded in PostgreSQL.</p></div></div><div class="login-history-list">${loginHistory.length ? loginHistory.slice(0, 8).map(item => `<div><span class="login-dot"></span><div><strong>${new Date(item.loggedInAt).toLocaleString()}</strong><small>${esc(item.ipAddress || 'Local network')} · ${esc((item.userAgent || 'Browser').slice(0, 90))}</small></div></div>`).join('') : '<div class="notification-empty">No login history yet.</div>'}</div></section>` : '';
    return `<div class="profile-page"><div class="profile-cover"></div><div class="profile-card"><div class="profile-avatar">${esc((user.name || 'I').slice(0, 1).toUpperCase())}</div><div class="profile-main"><div class="profile-name-row"><div><span class="eyebrow">CREATOR PROFILE</span><h1>${esc(user.name)} ${user.verificationStatus === 'verified' ? icon('checkCircle', 22) : ''}</h1><p>@${esc(user.username)}</p></div><span class="verified-profile">${icon('shield', 15)} ${user.verificationStatus === 'verified' ? 'Verified student' : 'Pending verification'}</span></div><p class="profile-bio">${esc(user.bio || 'Engineering ideas, prototypes and experiments.')}</p><div class="profile-facts"><span>${icon('mapPin')} ${esc(user.collegeName || 'College not listed')}</span><span>${ideas.length} published ideas</span></div><div class="skill-row">${(user.skills || []).map(s => `<span>${esc(s)}</span>`).join('')}</div>${isAuth() && !isOwnProfile ? `<div class="profile-contact"><button class="primary-button" data-action="show-contact" data-email="${esc(user.institutionEmail || user.email || '')}" data-name="${esc(user.name)}">${icon('message')} Contact creator</button><span>Email opens directly when EmailJS is not configured.</span></div>` : ''}</div></div><section class="section-block"><div class="section-heading-row"><div><span class="eyebrow">SHOWCASE</span><h2>${ideas.length} ideas</h2></div></div>${ideaGrid(ideas, 'No published ideas yet.')}</section>${historyCard}</div>`;
  } catch (e) { return `<div class="empty-state"><h2>${esc(e.message)}</h2><a href="#/explore" class="primary-button">Explore ideas</a></div>`; }
}

function aboutPage() { return `<div class="about-page"><div class="about-hero"><span class="eyebrow">ABOUT IDEAHUB</span><h1>A trusted short-video layer for ideas, prototypes and experiments.</h1><p>IdeaHub is designed for engineering students, developers, makers and creative thinkers who want to explain an idea quickly, get feedback and help others discover useful work.</p></div><div class="about-grid"><div class="feature-card">${icon('film', 25)}<h3>30–60 second demos</h3><p>One focused clip: problem → build → result. Built for fast discovery without turning into a generic video feed.</p></div><div class="feature-card">${icon('shield', 25)}<h3>Verified publishing</h3><p>Student accounts start pending. Only verified accounts can publish, and every new or edited idea can be moderated by an admin.</p></div><div class="feature-card">${icon('user', 25)}<h3>Community feedback</h3><p>Like, save, share and comment so a prototype can attract suggestions, collaborators and future versions.</p></div></div><div class="trust-box">${icon('checkCircle', 22)}<div><strong>Student-first verification</strong><p>This model uses college/student identity details and admin approval instead of collecting Aadhaar numbers or biometric data.</p></div></div></div>`; }

function editorForm(idea = null, reelMode = false) {
  const form = idea || { title: '', description: '', category: 'AI / ML', status: 'Prototype', technologies: '', tags: '', videoUrl: '', thumbnail: '', duration: 0 };
  const initialTech = Array.isArray(form.technologies) ? form.technologies.join(', ') : (form.technologies || '');
  const initialTags = Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags || '');
  return `<form id="idea-editor-form" class="editor-shell"><input type="hidden" name="ideaId" value="${esc(idea?.id || '')}"><input type="hidden" name="reelOnly" value="${reelMode ? 'true' : 'false'}"><div class="editor-grid"><section class="editor-media-card"><div class="editor-video-stage" id="editor-stage">${form.videoUrl ? `<video id="editor-video" src="${esc(form.videoUrl)}" poster="${esc(form.thumbnail)}" controls playsinline></video>` : `<div class="editor-placeholder">${icon('film', 28)}<strong>Preview your ${reelMode ? '10–60 second Reel' : '30–60 second idea'}</strong><span>${reelMode ? 'Upload a short video and edit the clip before moderation.' : 'Upload a prototype demo and edit the clip before publishing.'}</span></div>`}${form.videoUrl ? `<span class="editor-duration" id="editor-duration">${Math.round(form.duration || 0)}s selected</span>` : ''}</div><div class="editor-media-actions"><button type="button" class="secondary-button" data-action="choose-video">${icon('upload')} ${form.videoUrl ? 'Change video' : 'Choose video'}</button><input id="video-file" hidden type="file" accept="video/mp4,video/webm,video/quicktime,video/*"><button type="button" class="secondary-button" data-action="capture-cover" ${form.videoUrl ? '' : 'disabled'}>${icon('camera')} Use current frame as cover</button></div><div id="cover-preview" class="cover-preview" ${form.thumbnail ? '' : 'hidden'}>${form.thumbnail ? `<img src="${esc(form.thumbnail)}" alt="Selected cover"><span>Cover image</span>` : ''}</div><div id="trim-panel"></div></section><section class="editor-form-card"><div><span class="eyebrow">${reelMode ? 'REEL STUDIO' : 'PUBLISH'}</span><h1>${idea ? 'Edit your idea' : (reelMode ? 'Create an Idea Reel' : 'Share your idea')}</h1><p>${reelMode ? 'Show the idea, prototype or experiment in a focused 30–60 second video.' : 'Make the first few seconds clear: problem → build → result.'}</p></div><div class="form-grid"><label class="full">Idea title<input name="title" maxlength="100" value="${esc(form.title)}" placeholder="e.g. AI-based fake call detector"></label><label>Category<select name="category">${CATEGORIES.filter(x => x !== 'All').map(x => `<option ${x === form.category ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>${reelMode ? '' : `<label>Project status<select name="projectStatus">${STATUSES.map(x => `<option ${x === (form.status || 'Prototype') ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`}<label class="full">Technologies<input name="technologies" value="${esc(initialTech)}" placeholder="Python, OpenCV, Flask"></label><label class="full">${reelMode ? 'Caption' : 'Description'}<textarea name="description" rows="5" maxlength="500" placeholder="${reelMode ? 'Tell viewers what this Reel demonstrates…' : 'What problem are you solving, how does it work, and what makes it useful?'}">${esc(form.description)}</textarea></label><label class="full">Tags<input name="tags" value="${esc(initialTags)}" placeholder="AI, prototype, campus"></label></div><div id="editor-error"></div><div class="editor-footer"><div><strong id="video-file-name">${form.videoUrl ? 'Keeping the current video' : 'No video selected'}</strong><span id="video-file-meta">${form.videoUrl ? `${Math.round(form.duration || 0)}s current clip` : 'MP4 / WebM / MOV · max 100 MB'}</span></div><button class="primary-button" type="submit">${idea ? 'Save changes' : (reelMode ? 'Upload Reel' : 'Submit for review')}</button></div></section></div></form>`;
}

function uploadPage() {
  if (!isAuth()) return loginPage();
  if (state.user?.verificationStatus !== 'verified' && state.user?.role !== 'admin') return `<div class="page-panel"><div class="verification-block"><span class="eyebrow">PUBLISHING LOCKED</span><h1>Verify your student account first.</h1><p>Your account is currently <strong>${esc(state.user?.verificationStatus || 'pending')}</strong>. Full project publishing is limited to verified students.</p><div class="status-pulse">Admin verification required before publishing an Idea.</div><div class="verification-actions"><a class="secondary-button" href="#/reel-upload">${icon('film')} Upload a Reel instead</a><a class="secondary-button" href="#/profile/${encodeURIComponent(state.user.username)}">${icon('user')} View verification status</a></div></div></div>`;
  return `<div class="form-page"><div class="page-header"><div><span class="eyebrow">CREATOR STUDIO</span><h1>Publish a 30–60 second idea</h1><p>Trim the clip, choose a cover and add enough context for another builder to understand it.</p></div></div>${editorForm()}</div>`;
}

function reelUploadPage() {
  if (!isAuth()) return loginPage();
  return `<div class="form-page"><div class="page-header"><div><span class="eyebrow">IDEA REELS</span><h1>Upload a short video</h1><p>Every registered user can submit a 30–60 second Reel. Reels are moderated before they appear publicly.</p></div></div>${editorForm(null, true)}</div>`;
}

async function editPage(id) { const idea = await fetchIdea(id); if (!idea) return `<div class="empty-state"><h2>Idea not found</h2><a href="#/my-ideas" class="primary-button">Back to my ideas</a></div>`; return `<div class="form-page"><div class="page-header"><div><span class="eyebrow">CREATOR STUDIO</span><h1>Edit your idea</h1><p>Changes to media or metadata are sent back through moderation.</p></div></div>${editorForm(idea)}</div>`; }

function myIdeasPage() {
  const ideas = state.myIdeas || [];
  const published = ideas.filter(i => i.moderationStatus === 'approved');
  const pending = ideas.filter(i => i.moderationStatus === 'pending');
  const rejected = ideas.filter(i => i.moderationStatus === 'rejected');
  const visible = state.myIdeaFilter === 'published' ? published : state.myIdeaFilter === 'pending' ? pending : state.myIdeaFilter === 'rejected' ? rejected : ideas;
  const tab = (key, label, count) => `<button data-my-filter="${key}" class="manage-tab ${state.myIdeaFilter === key ? 'active' : ''}">${label}<span>${count}</span></button>`;
  return `<div class="page-panel"><div class="page-header"><div><span class="eyebrow">CREATOR SPACE</span><h1>My ideas</h1><p>Manage published projects, pending uploads and moderation results in one place.</p></div><a class="primary-button" href="#/upload">${icon('plus')} Share an idea</a></div><div class="creator-stats"><div><strong>${ideas.length}</strong><span>Total submissions</span></div><div><strong>${published.length}</strong><span>Published</span></div><div><strong>${pending.length}</strong><span>Pending</span></div><div><strong>${rejected.length}</strong><span>Needs changes</span></div></div><div class="manage-tabs">${tab('all', 'All', ideas.length)}${tab('published', 'Published', published.length)}${tab('pending', 'Pending', pending.length)}${tab('rejected', 'Rejected', rejected.length)}</div>${visible.length ? `<div class="manage-list enhanced">${visible.map(i => `<div class="manage-row"><a href="#/idea/${encodeURIComponent(i.id)}" class="manage-thumb">${i.thumbnail ? `<img src="${esc(i.thumbnail)}" alt="">` : `<span>${icon(i.contentType === 'reel' ? 'film' : 'grid')}</span>`}</a><div class="manage-info"><strong>${esc(i.title)}</strong><span>${esc(i.category)} · ${i.contentType === 'reel' ? 'Reel' : 'Idea'} · <em class="moderation ${esc(i.moderationStatus || 'pending')}">${esc(i.moderationStatus || 'pending')}</em></span>${i.moderationStatus === 'rejected' && i.rejectionReason ? `<small>${esc(i.rejectionReason)}</small>` : ''}</div><div class="manage-metrics"><span>${icon('eye', 14)} ${fmtViews(i.views)}</span><span>${icon('heart', 14)} ${i.likes || 0}</span><span>${icon('message', 14)} ${i.commentsCount || 0}</span></div><div class="manage-actions"><a href="#/idea/${encodeURIComponent(i.id)}/edit" title="Edit">${icon('edit')}</a><button data-action="delete-idea" data-id="${esc(i.id)}" title="Delete">${icon('trash')}</button></div></div>`).join('')}</div>` : `<div class="empty-state"><h3>${state.myIdeaFilter === 'published' ? 'No published ideas yet' : state.myIdeaFilter === 'pending' ? 'No pending uploads' : state.myIdeaFilter === 'rejected' ? 'No rejected uploads' : 'No ideas yet'}</h3><p>${state.myIdeaFilter === 'published' ? 'Approve your first submission and it will appear here.' : 'Your next 30–60 second project can start here.'}</p><a href="#/upload" class="primary-button">${icon('upload')} Upload a demo</a></div>`}</div>`;
}

function savedPage() { const ideas = state.savedIdeas || []; return `<div class="page-panel"><div class="page-header"><div><span class="eyebrow">YOUR SPACE</span><h1>Saved ideas</h1><p>Keep useful prototypes and concepts for later.</p></div></div>${state.loading ? `<div class="screen-loader">Loading saved ideas…</div>` : ideaGrid(ideas, "You haven't saved any ideas yet.")}</div>`; }

function reelsPage() {
  const ideas = state.ideas.filter(i => i.contentType === 'reel');
  const ownPending = (state.myReels || []).filter(i => i.moderationStatus !== 'approved');
  return `<div class="reels-page"><div class="reels-heading"><div><span class="eyebrow">SHORT-FORM PROJECT SHOWCASE</span><h1>Idea Reels</h1><p>One focused idea, one vertical demo, one useful takeaway.</p></div><div class="reels-heading-actions"><div class="reels-heading-pill">${ideas.length} approved videos</div><a class="primary-button" href="#/reel-upload">${icon('upload')} Upload Reel</a></div></div>${ownPending.length ? `<div class="reel-pending-banner">${icon('clock')}<div><strong>${ownPending.length} Reel${ownPending.length > 1 ? 's' : ''} waiting for moderation.</strong><span>Only approved Reels appear in the public feed.</span></div><a href="#/my-ideas">Manage uploads →</a></div>` : ''}${state.loading ? `<div class="screen-loader">Loading reels…</div>` : ideas.length ? `<div class="reels-feed" id="reels-feed">${ideas.map((i, idx) => reelItem(i, idx)).join('')}</div>` : `<div class="empty-state reels-empty"><div class="empty-icon">${icon('film', 28)}</div><h3>No approved Reels yet</h3><p>Upload a 10–60 second project demo. Once approved, it will appear here for the community.</p><a class="primary-button" href="#/reel-upload">${icon('upload')} Upload your first Reel</a></div>`}</div>`;
}
function reelItem(idea, index) { return `<article class="reel-item" data-reel-index="${index}" data-reel-id="${esc(idea.id)}"><div class="reel-video-wrap"><video data-reel-video src="${esc(idea.videoUrl || '')}" poster="${esc(idea.thumbnail || '')}" loop playsinline muted preload="metadata"></video><div class="reel-gradient reel-gradient-top"></div><div class="reel-gradient reel-gradient-bottom"></div><div class="reel-topbar"><div><span class="reel-kicker">${esc(idea.category)}</span><strong>Idea Reels</strong></div><button class="reel-icon-button" data-action="reel-mute">${icon('mute')}</button></div><button class="reel-center-button" data-action="reel-play">${icon('play', 24)}</button><button class="reel-sound-hint" data-action="reel-mute">Tap for sound</button><span class="reel-duration">${Math.round(idea.duration || 0)}s</span><div class="reel-caption"><div class="reel-status-row"><span class="reel-chip">${esc(idea.status)}</span><span class="reel-chip-ghost">${esc(idea.category)}</span></div><h1>${esc(idea.title)}</h1><p>${esc(idea.description)}</p><div class="reel-tech-row">${(idea.technologies || []).slice(0, 4).map(t => `<span>#${esc(t.replace(/\s+/g, ''))}</span>`).join('')}</div><div class="reel-creator-row"><span class="creator-avatar small">${esc((idea.creator?.name || 'I').slice(0, 1).toUpperCase())}</span><div><strong>${esc(idea.creator?.name || 'IdeaHub creator')}</strong><small>@${esc(idea.creator?.username || 'creator')}</small></div><a href="#/profile/${encodeURIComponent(idea.creator?.username || 'creator')}" class="reel-follow-button">View profile</a></div></div><div class="reel-actions"><button class="reel-action ${idea.liked ? 'liked' : ''}" data-action="reel-like" data-id="${esc(idea.id)}">${icon('heart', 20)}<span>${idea.likes || 0}</span></button><button class="reel-action" data-action="reel-comments" data-id="${esc(idea.id)}">${icon('message', 20)}<span>${idea.commentsCount || 0}</span></button><button class="reel-action ${idea.saved ? 'liked' : ''}" data-action="reel-save" data-id="${esc(idea.id)}">${icon('bookmark', 20)}<span>Save</span></button><button class="reel-action" data-action="reel-share" data-id="${esc(idea.id)}">${icon('share', 20)}<span>${idea.shares || 0}</span></button><button class="reel-action" data-nav="/idea/${encodeURIComponent(idea.id)}">${icon('info', 20)}<span>Details</span></button></div></div><div class="reel-scroll-hint" aria-hidden="true">${icon('chevronUp', 16)}<span>Scroll</span>${icon('chevronDown', 16)}</div></article>`; }

async function adminPage() { if (!isAuth() || state.user.role !== 'admin') return `<div class="empty-state"><h2>Admin access required</h2><a href="#/" class="primary-button">Back home</a></div>`; try { const [stats, users, ideas] = await Promise.all([api.adminDashboard(), api.pendingUsers(), api.pendingIdeas()]); state.adminData = { stats, users, ideas }; } catch (e) { state.adminError = e.message; } const d = state.adminData || {}; return `<div class="page-panel admin-page"><div class="page-header"><div><span class="eyebrow">${icon('shield')} ADMIN & MODERATION</span><h1>IdeaHub control room</h1><p>Verify student accounts and keep the project feed focused on genuine engineering and creative work.</p></div></div>${state.adminError ? `<div class="form-error">${esc(state.adminError)}</div>` : ''}${d.stats ? `<div class="admin-stats"><div><strong>${d.stats.users}</strong><span>Total users</span></div><div><strong>${d.stats.ideas}</strong><span>Total ideas</span></div><div><strong>${d.stats.pendingUsers}</strong><span>Users pending</span></div><div><strong>${d.stats.pendingIdeas}</strong><span>Ideas pending</span></div><div><strong>${d.stats.views}</strong><span>Total views</span></div></div>` : ''}<div class="admin-grid"><section class="admin-card"><div class="section-heading"><h2>${icon('userCheck')} Student verification</h2><span>${(d.users || []).length} pending</span></div>${!(d.users || []).length ? `<div class="admin-empty">${icon('check')}<span>No users waiting for review.</span></div>` : (d.users || []).map(u => `<div class="admin-item"><div><strong>${esc(u.name)} · @${esc(u.username)}</strong><span>${esc(u.collegeName)} · ${esc(u.studentId)}</span><small>${esc(u.institutionEmail)} · registered ${new Date(u.createdAt).toLocaleDateString()}</small></div><div class="admin-actions"><button class="approve" data-action="verify-user" data-id="${esc(u._id)}" data-status="verified">${icon('check')}</button><button class="reject" data-action="verify-user" data-id="${esc(u._id)}" data-status="rejected">${icon('x')}</button></div></div>`).join('')}</section><section class="admin-card"><div class="section-heading"><h2>${icon('clock')} Idea moderation</h2><span>${(d.ideas || []).length} pending</span></div>${!(d.ideas || []).length ? `<div class="admin-empty">${icon('check')}<span>No ideas waiting for review.</span></div>` : (d.ideas || []).map(i => `<div class="admin-item"><div><strong>${esc(i.title)}</strong><span>${i.contentType === 'reel' ? '🎬 Reel' : '💡 Idea'} · ${esc(i.category)} · ${esc(i.projectStatus)} · ${esc(i.duration)}s</span><small>by @${esc(i.creator?.username || 'creator')} · ${esc(i.creator?.collegeName || '')}</small></div><div class="admin-actions"><button class="approve" data-action="moderate-idea" data-id="${esc(i._id)}" data-status="approved">${icon('check')}</button><button class="reject" data-action="moderate-idea" data-id="${esc(i._id)}" data-status="rejected">${icon('x')}</button></div></div>`).join('')}</section></div></div>`; }

function notFoundPage() { return `<div class="empty-state"><h2>Page not found</h2><p>That IdeaHub page does not exist.</p><a href="#/" class="primary-button">Go home</a></div>`; }

async function render() {
  const app = document.getElementById('app');
  const parts = getRouteParts();
  const first = parts[0] || '';
  let content = '';
  try {
    if (first === 'login') content = loginPage();
    else if (first === 'register') content = registerPage();
    else if (first === 'explore') { state.exploreParams ||= { category: 'All', sort: 'latest', query: '' }; await loadIdeas({ search: state.exploreParams.query, category: state.exploreParams.category, sort: state.exploreParams.sort }); content = await explorePage(); }
    else if (first === 'reels') { await loadIdeas({ contentType: 'reel', sort: 'latest', page: 1 }); if (isAuth()) { try { const r = await api.ideas({ mine: true, contentType: 'reel', limit: 20 }); state.myReels = (r.data || []).map(normalizeIdea); } catch { state.myReels = []; } } content = reelsPage(); }
    else if (first === 'idea' && parts.length >= 2 && parts[2] === 'edit') { if (!requireAuth()) return; content = await editPage(parts[1]); }
    else if (first === 'idea' && parts.length >= 2) content = await detailsPage(parts[1]);
    else if (first === 'upload') { if (!requireAuth()) return; content = uploadPage(); }
    else if (first === 'reel-upload') { if (!requireAuth()) return; content = reelUploadPage(); }
    else if (first === 'my-ideas') { if (!requireAuth()) return; state.loading = true; try { const r = await api.ideas({ mine: true }); state.myIdeas = (r.data || []).map(normalizeIdea); } catch { state.myIdeas = []; } finally { state.loading = false; } content = myIdeasPage(); }
    else if (first === 'saved') { if (!requireAuth()) return; state.loading = true; try { const r = await api.ideas({ saved: true }); state.savedIdeas = (r.data || []).map(normalizeIdea); } catch { state.savedIdeas = []; } finally { state.loading = false; } content = savedPage(); }
    else if (first === 'profile') content = await renderProfile(decodeURIComponent(parts[1] || ''));
    else if (first === 'admin') content = await adminPage();
    else if (first === 'about') content = aboutPage();
    else { await loadIdeas(); content = homePage(); }
  } catch (e) { content = `<div class="empty-state"><h2>${esc(e.message || 'Something went wrong')}</h2><a href="#/" class="primary-button">Go home</a></div>`; }
  app.innerHTML = shell(content); renderToast(); bindPage(); updateSearchEvents();
}

function updateSearchEvents() { const input = document.getElementById('global-search'); if (!input) return; input.addEventListener('input', () => { state.query = input.value; clearTimeout(updateSearchEvents.timer); if (!state.query.trim()) { state.globalSearchResults = []; render(); return; } updateSearchEvents.timer = setTimeout(async () => { try { const r = await api.ideas({ search: state.query, limit: 6 }); state.globalSearchResults = r.data || []; render(); setTimeout(() => { const el = document.getElementById('global-search'); el?.focus(); el?.setSelectionRange(el.value.length, el.value.length); }, 0); } catch { } }, 260); }); input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); state.exploreParams = { ...(state.exploreParams || { category: 'All', sort: 'latest', query: '' }), query: state.query }; state.globalSearchResults = []; go('/explore'); } }); }

function handleNotificationDocumentClick(e) {
  const menu = document.getElementById('notification-menu');
  if (!menu) return;
  if (e.target.closest('[data-action="mark-all-notifications"]')) { api.markAllNotificationsRead().then(() => { state.notifications.forEach(n => n.isRead = true); state.notificationUnread = 0; updateNotificationUI(); render(); }); return; }
  const browserBtn = e.target.closest('[data-action="request-browser-notifications"]');
  if (browserBtn) { if (typeof Notification !== 'undefined') Notification.requestPermission().then(() => updateNotificationUI()); return; }
  const item = e.target.closest('[data-notification-id]');
  if (item) { const id = item.dataset.notificationId; const ideaId = item.dataset.notificationIdea; markNotificationRead(id).finally(() => { state.notificationOpen = false; if (ideaId) go(`/idea/${encodeURIComponent(ideaId)}`); else render(); }); }
}

function bindPage() {
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', () => go(el.dataset.nav)));
  document.getElementById('theme-btn')?.addEventListener('click', () => { setTheme(state.theme === 'light' ? 'dark' : 'light'); render(); });
  document.getElementById('notification-btn')?.addEventListener('click', async () => { state.notificationOpen = !state.notificationOpen; render(); if (state.notificationOpen) await loadNotifications(true); });
  document.getElementById('avatar-menu')?.addEventListener('click', () => { const m = document.getElementById('account-menu'); if (m) m.hidden = !m.hidden; });
  document.querySelector('[data-action="logout"]')?.addEventListener('click', () => { stopNotificationPolling(); state.token = ''; state.user = null; state.notifications = []; state.notificationUnread = 0; localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); go('/'); });
  document.querySelectorAll('[data-category]').forEach(btn => btn.addEventListener('click', () => { const p = route(); if (p === '/') { const cat = btn.dataset.category; document.querySelectorAll('[data-category]').forEach(b => b.classList.toggle('active', b === btn)); const filtered = cat === 'All' ? state.ideas : state.ideas.filter(i => i.category === cat); document.getElementById('home-ideas').innerHTML = filtered.slice(0, 6).map(ideaCard).join(''); bindCommonActions(); } else if (p === '/explore') { state.exploreParams ||= { category: 'All', sort: 'latest', query: '' }; state.exploreParams.category = btn.dataset.category; render(); } }));
  bindCommonActions();
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
  document.getElementById('explore-sort')?.addEventListener('change', e => { state.exploreParams.sort = e.target.value; render(); });
  document.getElementById('explore-query')?.addEventListener('input', e => { state.exploreParams.query = e.target.value; clearTimeout(bindPage.searchTimer); bindPage.searchTimer = setTimeout(() => render(), 240); });
  document.querySelector('[data-form="comment"]')?.addEventListener('submit', handleComment);
  document.querySelector('[data-action="back"]')?.addEventListener('click', () => history.length > 1 ? history.back() : go('/explore'));
  document.getElementById('idea-editor-form')?.addEventListener('submit', handleEditorSubmit);
  document.querySelector('[data-action="choose-video"]')?.addEventListener('click', () => document.getElementById('video-file')?.click());
  document.getElementById('video-file')?.addEventListener('change', handleVideoSelect);
  document.querySelector('[data-action="capture-cover"]')?.addEventListener('click', captureCover);
  initReels();
}
function bindCommonActions() {
  document.querySelectorAll('[data-action="like"]').forEach(b => b.addEventListener('click', async e => { e.preventDefault(); if (!requireAuth()) return; const id = b.dataset.id; try { const r = await api.like(id); patchIdea(id, { liked: r.liked, likes: r.likes }); render(); } catch (err) { showToast(err.message); } }));
  document.querySelectorAll('[data-action="save"]').forEach(b => b.addEventListener('click', async e => { e.preventDefault(); if (!requireAuth()) return; const id = b.dataset.id; try { const r = await api.save(id); patchIdea(id, { saved: r.saved, saves: r.saves }); render(); } catch (err) { showToast(err.message); } }));
  document.querySelectorAll('[data-action="share"]').forEach(b => b.addEventListener('click', async e => { e.preventDefault(); const idea = await fetchIdea(b.dataset.id); if (idea) { const result = await shareIdea(idea); if (result !== 'cancelled') { patchIdea(idea.id, { shares: (idea.shares || 0) + 1 }); showToast(result === 'copied' ? 'Link copied' : 'Shared'); } } }));
  document.querySelectorAll('[data-action="open-comments"]').forEach(b => b.addEventListener('click', async e => { e.preventDefault(); await openCommentsModal(b.dataset.id); }));
  document.querySelectorAll('[data-my-filter]').forEach(b => b.addEventListener('click', () => { state.myIdeaFilter = b.dataset.myFilter; render(); }));
  document.querySelectorAll('[data-action="delete-idea"]').forEach(b => b.addEventListener('click', async () => { if (!confirm('Delete this idea?')) return; try { await api.deleteIdea(b.dataset.id); showToast('Idea deleted'); render(); } catch (e) { showToast(e.message); } }));
  document.querySelectorAll('[data-action="verify-user"]').forEach(b => b.addEventListener('click', async () => { try { const updated = await api.verifyUser(b.dataset.id, b.dataset.status); if (b.dataset.status === 'verified' && updated?.institutionEmail) { try { await sendEmail('verificationTemplateId', { to_email: updated.institutionEmail, to_name: updated.name, status: 'verified', username: updated.username, message: 'Your IdeaHub student account has been verified. You can now publish Ideas.' }); } catch { } } showToast(`User ${b.dataset.status}.`); render(); } catch (e) { showToast(e.message); } }));
  document.querySelectorAll('[data-action="moderate-idea"]').forEach(b => b.addEventListener('click', async () => { try { await api.moderateIdea(b.dataset.id, b.dataset.status, b.dataset.status === 'rejected' ? 'Does not meet IdeaHub content requirements.' : ''); showToast(`Idea ${b.dataset.status}.`); render(); } catch (e) { showToast(e.message); } }));
  document.querySelector('[data-action="detail-play"]')?.addEventListener('click', () => { const v = document.getElementById('detail-video'); if (v) v.paused ? v.play() : v.pause(); });
  document.querySelector('[data-action="detail-mute"]')?.addEventListener('click', e => { const v = document.getElementById('detail-video'); if (v) { v.muted = !v.muted; e.currentTarget.innerHTML = icon(v.muted ? 'mute' : 'volume'); } });
  document.querySelector('[data-action="show-contact"]')?.addEventListener('click', e => contactModal(e.currentTarget.dataset.email, e.currentTarget.dataset.name));
}
function patchIdea(id, patch) { state.ideas = state.ideas.map(i => String(i.id) === String(id) ? { ...i, ...patch } : i); }

function emailConfigured(templateKey) {
  return Boolean(window.emailjs && EMAILJS_CONFIG.publicKey && EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG[templateKey]);
}
async function sendEmail(templateKey, params) {
  if (!emailConfigured(templateKey)) return { skipped: true };
  await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG[templateKey], params);
  return { sent: true };
}
function contactModal(email, name) {
  document.getElementById('email-modal')?.remove();
  const wrap = document.createElement('div'); wrap.id = 'email-modal'; wrap.className = 'email-modal';
  wrap.innerHTML = `<div class="email-modal-card"><button class="email-modal-close" data-action="close-email">×</button><span class="eyebrow">CONTACT CREATOR</span><h2>Email ${esc(name)}</h2><p>Your message will be sent through the configured EmailJS service.</p><form id="creator-contact-form"><input type="hidden" name="to_email" value="${esc(email)}"><input type="hidden" name="to_name" value="${esc(name)}"><label>Your name<input name="from_name" value="${esc(state.user?.name || '')}" required></label><label>Your email<input name="reply_to" type="email" value="${esc(state.user?.email || '')}" required></label><label>Subject<input name="subject" value="IdeaHub message" required></label><label>Message<textarea name="message" rows="6" required placeholder="Write your message…"></textarea></label><div id="email-send-error"></div><button class="primary-button" type="submit">${icon('message')} Send email</button></form></div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('[data-action="close-email"]').addEventListener('click', () => wrap.remove());
  wrap.querySelector('#creator-contact-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const error = wrap.querySelector('#email-send-error'); error.innerHTML = '';
    if (!emailConfigured('contactTemplateId')) {
      const values = Object.fromEntries(new FormData(e.currentTarget).entries());
      const subject = encodeURIComponent(values.subject || 'IdeaHub message');
      const body = encodeURIComponent(`${values.message || ''}\n\nFrom: ${values.from_name || ''} (${values.reply_to || ''})`);
      window.location.href = `mailto:${encodeURIComponent(values.to_email || '')}?subject=${subject}&body=${body}`;
      wrap.remove();
      showToast('Opening your email app…');
      return;
    }
    const btn = e.currentTarget.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Sending…';
    try { await sendEmail('contactTemplateId', Object.fromEntries(new FormData(e.currentTarget).entries())); wrap.remove(); showToast('Email sent successfully.'); }
    catch (err) { error.innerHTML = `<div class="form-error">${esc(err?.text || err?.message || 'Email could not be sent.')}</div>`; btn.disabled = false; btn.innerHTML = `${icon('message')} Send email`; }
  });
}

async function handleLogin(e) { e.preventDefault(); const form = new FormData(e.currentTarget); const err = document.getElementById('login-error'); err.innerHTML = ''; const btn = e.currentTarget.querySelector('button'); btn.disabled = true; try { const result = await api.login({ identifier: String(form.get('identifier') || '').trim(), password: String(form.get('password') || '') }); state.token = result.token; state.user = result.user; localStorage.setItem(TOKEN_KEY, state.token); writeJSON(USER_KEY, state.user); await loadNotifications(true); startNotificationPolling(); go(state.user.role === 'admin' ? '/admin' : '/'); } catch (ex) { err.innerHTML = `<div class="form-error">${esc(ex.message)}</div>`; } finally { btn.disabled = false; } }
async function handleRegister(e) { e.preventDefault(); const form = new FormData(e.currentTarget); const err = document.getElementById('register-error'); err.innerHTML = ''; const btn = e.currentTarget.querySelector('button'); btn.disabled = true; try { const result = await api.register(Object.fromEntries(form.entries())); state.token = result.token; state.user = result.user; localStorage.setItem(TOKEN_KEY, state.token); writeJSON(USER_KEY, state.user); await loadNotifications(true); startNotificationPolling(); go('/'); } catch (ex) { err.innerHTML = `<div class="form-error">${esc(ex.message)}</div>`; } finally { btn.disabled = false; } }

let editorState = { file: null, previewUrl: '', cover: null, duration: 0, start: 0, end: 0, initialIdeaId: '' };
function resetEditorState() { if (editorState.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(editorState.previewUrl); editorState = { file: null, previewUrl: '', cover: null, duration: 0, start: 0, end: 0, initialIdeaId: document.querySelector('input[name="ideaId"]')?.value || '' }; }
function handleVideoSelect(e) { const file = e.target.files?.[0]; if (!file) return; if (!file.type.startsWith('video/')) return editorError('Please select a video file.'); if (file.size > 100 * 1024 * 1024) return editorError('Video must be 100 MB or smaller.'); resetEditorState(); editorState.file = file; editorState.previewUrl = URL.createObjectURL(file); const stage = document.getElementById('editor-stage'); stage.innerHTML = `<video id="editor-video" src="${esc(editorState.previewUrl)}" controls playsinline></video><span class="editor-duration" id="editor-duration">Loading…</span>`; document.querySelector('[data-action="capture-cover"]').disabled = false; document.getElementById('video-file-name').textContent = file.name; document.getElementById('video-file-meta').textContent = 'Loading video metadata…'; const v = document.getElementById('editor-video'); v.addEventListener('loadedmetadata', () => { editorState.duration = v.duration || 0; editorState.start = 0; editorState.end = Math.min(editorState.duration, 60); if (editorState.duration < (document.querySelector('input[name="reelOnly"]')?.value === 'true' ? 10 : 30)) editorState.end = editorState.duration; document.getElementById('video-file-meta').textContent = `${Math.round(editorState.duration)}s source · ${Math.round(Math.max(0, editorState.end - editorState.start))}s final`; renderTrimPanel(); }); editorError(''); }
function renderTrimPanel() { const panel = document.getElementById('trim-panel'); if (!panel || !editorState.file) return; const reelMode = document.querySelector('input[name="reelOnly"]')?.value === 'true'; const minDuration = reelMode ? 10 : 30; const dur = Math.max(0, editorState.end - editorState.start); panel.innerHTML = `<div class="trim-panel"><div class="trim-title"><div><span class="eyebrow">${icon('scissors')} VIDEO EDITOR</span><strong>Trim your clip</strong></div><span class="${dur >= minDuration && dur <= 60 ? 'trim-ok' : 'trim-bad'}">${Math.round(dur)}s</span></div><div class="trim-row"><label>Start <input id="trim-start" type="range" min="0" max="${Math.max(0.1, editorState.duration - 0.1)}" step="0.1" value="${editorState.start}"></label><strong>${editorState.start.toFixed(1)}s</strong></div><div class="trim-row"><label>End <input id="trim-end" type="range" min="${Math.min(editorState.duration, editorState.start + minDuration)}" max="${editorState.duration}" step="0.1" value="${editorState.end}"></label><strong>${editorState.end.toFixed(1)}s</strong></div><small>${reelMode ? 'Reels must be between 10 and 60 seconds.' : 'Idea videos must be between 30 and 60 seconds.'} The server renders the selected range into a clean MP4.</small></div>`; document.getElementById('trim-start').addEventListener('input', e => { editorState.start = Math.min(Number(e.target.value), Math.max(0, editorState.end - minDuration)); renderTrimPanel(); }); document.getElementById('trim-end').addEventListener('input', e => { editorState.end = Math.max(Number(e.target.value), editorState.start + minDuration); renderTrimPanel(); }); }
function editorError(msg) { const e = document.getElementById('editor-error'); if (e) e.innerHTML = msg ? `<div class="form-error">${esc(msg)}</div>` : ''; }
function captureCover() { const v = document.getElementById('editor-video'); if (!v || !v.videoWidth) return; const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); c.toBlob(blob => { if (!blob) return; editorState.cover = new File([blob], `ideahub-cover-${Date.now()}.jpg`, { type: 'image/jpeg' }); const url = URL.createObjectURL(blob); document.getElementById('cover-preview').hidden = false; document.getElementById('cover-preview').innerHTML = `<img src="${url}" alt="Selected cover"><span>Cover image</span>`; }); }
async function handleEditorSubmit(e) {
  e.preventDefault(); editorError('');
  const f = new FormData(e.currentTarget);
  const title = String(f.get('title') || '').trim();
  const desc = String(f.get('description') || '').trim();
  const ideaId = String(f.get('ideaId') || '');
  const reelOnly = String(f.get('reelOnly') || '') === 'true';
  const minText = reelOnly ? 5 : 8;
  const minDesc = reelOnly ? 10 : 30;
  if (title.length < minText) return editorError(`${reelOnly ? 'Reel' : 'Idea'} title should be at least ${minText} characters.`);
  if (desc.length < minDesc) return editorError(`${reelOnly ? 'Caption' : 'Description'} should be at least ${minDesc} characters.`);
  if (!ideaId && !editorState.file) return editorError('Choose a video clip.');
  if (editorState.file) {
    const finalDur = editorState.end - editorState.start;
    const minimumDuration = reelOnly ? 5 : 30;
    if (finalDur < minimumDuration || finalDur > 60) return editorError(reelOnly ? `Your selected Reel is ${Math.round(finalDur)}s. Keep the final Reel between 10 and 60 seconds.` : `Your selected clip is ${Math.round(finalDur)}s. Keep the final clip between 30 and 60 seconds.`);
    f.append('video', editorState.file); f.append('startTime', String(editorState.start)); f.append('endTime', String(editorState.end));
  }
  if (editorState.cover) f.append('thumbnail', editorState.cover);
  const btn = e.currentTarget.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Processing…';
  try {
    const result = ideaId ? await api.updateIdea(ideaId, f) : (reelOnly ? await api.createReel(f) : await api.createIdea(f));
    showToast(ideaId ? 'Changes saved' : (reelOnly ? 'Reel uploaded for moderation' : 'Idea uploaded for review'));
    resetEditorState(); go(`/idea/${encodeURIComponent(result.id || result._id)}`);
  } catch (ex) { editorError(ex.message); }
  finally { btn.disabled = false; btn.textContent = ideaId ? 'Save changes' : (reelOnly ? 'Upload Reel' : 'Submit for review'); }
}

function initReels() {
  const feed = document.getElementById('reels-feed');

  if (!feed) return;

  const items = [
    ...feed.querySelectorAll('.reel-item')
  ];

  if (!items.length) return;

  let activeIndex = 0;
  let wheelLocked = false;

  function activate(index) {
    index = Math.max(
      0,
      Math.min(index, items.length - 1)
    );

    activeIndex = index;

    items.forEach((item, i) => {
      const video =
        item.querySelector('[data-reel-video]');

      const playButton =
        item.querySelector('.reel-center-button');

      if (!video) return;

      if (i !== index) {
        video.pause();

        if (playButton) {
          playButton.classList.remove('hidden');
          playButton.innerHTML = icon('play', 24);
        }

        return;
      }

      video.muted = true;

      video.play()
        .then(() => {
          playButton?.classList.add('hidden');
        })
        .catch(() => {
          playButton?.classList.remove('hidden');
        });

      const id = item.dataset.reelId;

      if (id) {
        api.view(id)
          .then(result => {
            patchIdea(id, {
              views: result.views
            });
          })
          .catch(() => { });
      }
    });
  }

  function goTo(index) {
    index = Math.max(
      0,
      Math.min(index, items.length - 1)
    );

    activeIndex = index;

    items[index].scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    activate(index);
  }

  /* -----------------------------------------
     Intersection Observer
     ----------------------------------------- */

  const observer =
    new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry =>
            entry.isIntersecting
          )
          .sort(
            (a, b) =>
              b.intersectionRatio -
              a.intersectionRatio
          )[0];

        if (!visible) return;

        const index =
          Number(
            visible.target.dataset.reelIndex
          ) || 0;

        activate(index);
      },
      {
        root: feed,
        threshold: 0.65
      }
    );

  items.forEach(item => {
    observer.observe(item);
  });

  /* -----------------------------------------
     Mouse wheel = one reel at a time
     ----------------------------------------- */

  feed.addEventListener(
    'wheel',
    event => {

      if (Math.abs(event.deltaY) < 8) {
        return;
      }

      if (wheelLocked) {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      wheelLocked = true;

      const direction =
        event.deltaY > 0 ? 1 : -1;

      goTo(activeIndex + direction);

      setTimeout(() => {
        wheelLocked = false;
      }, 650);

    },
    {
      passive: false
    }
  );

  /* -----------------------------------------
     Keyboard navigation
     ----------------------------------------- */

  document.addEventListener(
    'keydown',
    event => {

      if (!document.body.contains(feed)) {
        return;
      }

      const tag =
        document.activeElement?.tagName;

      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT'
      ) {
        return;
      }

      if (
        event.key === 'ArrowDown' ||
        event.key === 'PageDown'
      ) {
        event.preventDefault();
        goTo(activeIndex + 1);
      }

      if (
        event.key === 'ArrowUp' ||
        event.key === 'PageUp'
      ) {
        event.preventDefault();
        goTo(activeIndex - 1);
      }

      if (event.key === ' ') {
        const item = items[activeIndex];
        const video =
          item?.querySelector('[data-reel-video]');

        if (!video) return;

        event.preventDefault();

        if (video.paused) {
          video.play().catch(() => { });
        } else {
          video.pause();
        }
      }
    }
  );

  /* -----------------------------------------
     Reel buttons
     ----------------------------------------- */

  feed.addEventListener(
    'click',
    async event => {

      const item =
        event.target.closest('.reel-item');

      if (!item) return;

      const video =
        item.querySelector('[data-reel-video]');

      if (!video) return;

      const action =
        event.target.closest('[data-action]');

      if (!action) return;

      const type =
        action.dataset.action;

      const id =
        action.dataset.id ||
        item.dataset.reelId;

      /* Play / pause */

      if (type === 'reel-play') {

        if (video.paused) {

          await video.play().catch(() => { });

          action.innerHTML =
            icon('pause', 24);

        } else {

          video.pause();

          action.innerHTML =
            icon('play', 24);
        }

        return;
      }

      /* Sound */

      if (type === 'reel-mute') {

        video.muted =
          !video.muted;

        action.innerHTML =
          icon(
            video.muted
              ? 'mute'
              : 'volume'
          );

        item
          .querySelector(
            '.reel-sound-hint'
          )
          ?.classList.add('hidden');

        return;
      }

      /* Like */

      if (type === 'reel-like') {

        if (!requireAuth()) return;

        try {

          const result =
            await api.like(id);

          patchIdea(id, {
            liked: result.liked,
            likes: result.likes
          });

          action.classList.toggle(
            'liked',
            result.liked
          );

          const count =
            action.querySelector('span');

          if (count) {
            count.textContent =
              result.likes;
          }

        } catch (error) {

          showToast(error.message);
        }

        return;
      }

      /* Save */

      if (type === 'reel-save') {

        if (!requireAuth()) return;

        try {

          const result =
            await api.save(id);

          patchIdea(id, {
            saved: result.saved,
            saves: result.saves
          });

          action.classList.toggle(
            'liked',
            result.saved
          );

        } catch (error) {

          showToast(error.message);
        }

        return;
      }

      /* Comments */

      if (type === 'reel-comments') {

        await openCommentsModal(id);

        return;
      }

      /* Share */

      if (type === 'reel-share') {

        const idea =
          state.ideas.find(
            item =>
              String(item.id) ===
              String(id)
          );

        if (!idea) return;

        const result =
          await shareIdea(idea);

        if (result !== 'cancelled') {

          patchIdea(id, {
            shares:
              Number(idea.shares || 0) + 1
          });

          showToast(
            result === 'copied'
              ? 'Link copied'
              : 'Shared'
          );
        }

        return;
      }
    }
  );

  /* Start first reel */

  requestAnimationFrame(() => {
    activate(0);
  });
}

async function shareIdea(idea) {
  const url = `${location.origin}${location.pathname}#/idea/${encodeURIComponent(idea.id)}`;
  try {
    if (navigator.share) { await navigator.share({ title: idea.title, text: idea.description, url }); await api.share(idea.id, 'native').catch(() => { }); return 'shared'; }
    if (navigator.clipboard) await navigator.clipboard.writeText(url); else { const input = document.createElement('input'); input.value = url; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove(); }
    await api.share(idea.id, 'copy').catch(() => { });
    return 'copied';
  } catch { return 'cancelled'; }
}

document.addEventListener('click', e => { const nav = e.target.closest('a[href^="#/"]'); if (nav && nav.getAttribute('href') === '#/') return; const action = e.target.closest('[data-action]'); if (action && !['like', 'save', 'share', 'delete-idea', 'verify-user', 'moderate-idea', 'logout', 'detail-play', 'detail-mute', 'choose-video', 'capture-cover', 'reel-play', 'reel-mute', 'reel-like', 'reel-save', 'reel-share'].includes(action.dataset.action)) { } });
document.addEventListener('click', handleNotificationDocumentClick);
document.addEventListener('click', (e) => { const menu = document.getElementById('account-menu'); if (menu && !e.target.closest('#avatar-menu') && !e.target.closest('#account-menu')) menu.hidden = true; });
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('global-search')?.focus(); } });
window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', async () => { await loadSession(); render(); });
