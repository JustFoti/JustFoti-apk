CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  permissions TEXT,
  specific_permissions TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  last_login INTEGER
);

INSERT INTO admin_users (username, password_hash, role, created_at) 
VALUES ('vynx', '0Ejo1LSS+BhPhhCMnnKXGpXY+ChQwRhTKSKaFagkqb3FknaxeFBYOOfiJLGFpLmX', 'super_admin', 1767575372818)
ON CONFLICT(username) DO UPDATE SET 
  password_hash = '0Ejo1LSS+BhPhhCMnnKXGpXY+ChQwRhTKSKaFagkqb3FknaxeFBYOOfiJLGFpLmX',
  last_login = NULL;