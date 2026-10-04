# IdeaHub Enhanced Social + PostgreSQL Features

This build keeps the existing HTML/CSS/JS + Express + PostgreSQL architecture and adds the interaction layer needed for a small college social-video model.

## Reels
- Approved Reel feed is filtered with `content_type = 'reel'` and `moderation_status = 'approved'`.
- Two approved demo Reels are seeded so the feed is not empty.
- Newly uploaded Reels remain visible in the creator's own pending strip until moderation.
- Visible Reels autoplay/pause through `IntersectionObserver` and start muted for browser autoplay compatibility.
- Reel views are persisted in PostgreSQL.
- Reel like, save, comment and share actions are persisted.

## Comments
- Comments are stored in `comments` with foreign keys to users and ideas.
- Reel and card comment buttons open an inline modal.
- New comments update `comments_count` transactionally.
- Comment creation creates an owner notification through a PostgreSQL trigger.

## Notifications
- New `notifications` table stores like/comment/save/share/verification/moderation/system events.
- PostgreSQL triggers create notifications when social events happen.
- The header bell shows an unread badge and a dropdown.
- Read and mark-all-read endpoints are persisted in PostgreSQL.
- The browser can optionally show desktop notifications after the user grants permission.
- The client polls unread state every 15 seconds, so the bell updates without a page refresh.

## Search
- `ideas.search_vector` is maintained by a PostgreSQL trigger.
- A GIN index supports text search.
- API search uses PostgreSQL `websearch_to_tsquery` plus ILIKE fallbacks.
- Global search supports live suggestions and `Ctrl+K`.

## Sharing and views
- `shares` stores individual share events and method (`native`, `copy`, `direct`).
- `ideas.shares_count` is maintained by the API transaction.
- `POST /api/ideas/:id/view` records a view.
- `POST /api/ideas/:id/share` records a share.

## My Ideas
- Filters: All, Published, Pending, Rejected.
- Summary counts and richer management rows.
- Pending-only uploads no longer produce a misleading empty published grid.

## Account activity
- `users.last_login_at` is updated at every successful login.
- `login_history` stores time, IP and user-agent for recent sessions.
- The own-profile page shows recent login activity.

## Navbar
- Sticky glass header.
- Global search dropdown.
- `Ctrl+K` focus shortcut.
- Working notification bell.
- Account menu with Profile / My Ideas / Saved / Admin / Logout.
- Responsive mobile bottom navigation.

## Safety / moderation
- Ideas and Reels are still moderated before public display.
- Editing an idea sends it back to moderation for non-admin users.
- Notification messages do not expose passwords or authentication secrets.

## PostgreSQL structure
Current core tables:
- `users`
- `login_history`
- `ideas`
- `likes`
- `saves`
- `shares`
- `comments`
- `notifications`

The design intentionally keeps video files in `backend/uploads/` and stores their metadata/URLs plus relationships in PostgreSQL.
