import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
	connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/vacation_portal',
});

export async function migrate() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			employee_code VARCHAR(7) NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL CHECK (role IN ('manager','employee')),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS requests (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			date_from DATE NOT NULL,
			date_to DATE NOT NULL,
			reason TEXT,
			status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
			submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS pending_password_updates (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			password_plain TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			decided_at TIMESTAMPTZ
		);
	`);

	await pool.query(`
		CREATE UNIQUE INDEX IF NOT EXISTS pending_password_updates_unique_user
		ON pending_password_updates (user_id)
		WHERE status = 'pending';
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS pending_email_updates (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			email_new TEXT NOT NULL,
			status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			decided_at TIMESTAMPTZ
		);
	`);

	await pool.query(`
		CREATE UNIQUE INDEX IF NOT EXISTS pending_email_updates_unique_user
		ON pending_email_updates (user_id)
		WHERE status = 'pending';
	`);
}


