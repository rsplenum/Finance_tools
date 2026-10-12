-- Interaction data (UD1, D-TECH-37): one row per event. Which steps a visit used, never what was typed: no figure,
-- name, GSTIN, address, IP, user agent or cookie. `visit` is a random tag the page made in memory, never stored there.
-- `at` is UTC to the minute; rows older than 400 days are deleted each night (the Worker's cron).
CREATE TABLE IF NOT EXISTS events (
  at    TEXT    NOT NULL, -- 2026-10-12T09:41
  visit TEXT    NOT NULL, -- 8 hex characters, one page view
  page  TEXT    NOT NULL, -- /dscr/
  came  TEXT    NOT NULL, -- a page of the site, 'search', 'other' or ''
  width TEXT    NOT NULL, -- phone, tablet or desktop
  kind  TEXT    NOT NULL, -- open, field, more, tap, result, download, error, leave
  name  TEXT,             -- the element's id, the format of a download, or the last step on leaving
  ms    INTEGER NOT NULL  -- milliseconds since the page opened
);
CREATE INDEX IF NOT EXISTS events_page_at ON events (page, at);
