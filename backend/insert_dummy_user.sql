-- Insert dummy user 'kbg' with password 'kbg'
-- The hashed password was generated using bcrypt
INSERT INTO users (username, hashed_password, role, created_at, updated_at)
VALUES (
    'kbg',
    '$2b$12$VNPCXWWc60g2pHHwKNBteeY0m5KI8pVAIGGbd/1jTC86b0uq/ajAm',
    'admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;
