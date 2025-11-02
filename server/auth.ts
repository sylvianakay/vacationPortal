import jwt from 'jsonwebtoken';
import type { IncomingMessage, ServerResponse } from 'http';
import { clearCookie, parseCookies, sendJson, setCookie } from './utils';
import { pool } from './db';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'session';
type JwtPayload = { uid: number; role: 'manager' | 'employee' };

export function signToken(payload: JwtPayload): string {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

export function getSession(req: IncomingMessage): JwtPayload | null {
	try {
		const cookies = parseCookies(req);
		const token = cookies[COOKIE_NAME];
		if (!token) return null;
		return jwt.verify(token, JWT_SECRET) as JwtPayload;
	} catch {
		return null;
	}
}

export function requireAuth(req: IncomingMessage, res: ServerResponse, role?: 'manager' | 'employee'):
	| JwtPayload
	| null {
	const session = getSession(req);
	if (!session) {
		sendJson(res, 401, { error: 'unauthorized' });
		return null;
	}
	if (role && session.role !== role) {
		sendJson(res, 403, { error: 'forbidden' });
		return null;
	}
	return session;
}

export function handleSignin() {
	return async (req: IncomingMessage, res: ServerResponse) => {
		let body = '';
		for await (const chunk of req) body += chunk;
		const { email, password } = JSON.parse(body || '{}');
		if (!email || !password) return sendJson(res, 400, { error: 'missing_credentials' });

        const result = await pool.query(
            `SELECT id, role, password_hash FROM users WHERE email = $1`,
            [email]
        );
        const row = result.rows[0] as { id: number; role: 'manager' | 'employee'; password_hash: string } | undefined;
		if (!row) return sendJson(res, 401, { error: 'invalid_credentials' });
		const ok = bcrypt.compareSync(password, row.password_hash);
		if (!ok) return sendJson(res, 401, { error: 'invalid_credentials' });

		const token = signToken({ uid: row.id, role: row.role });
		setCookie(res, COOKIE_NAME, token, { maxAge: 60 * 60 * 2 });
		sendJson(res, 200, { ok: true });
	};
}

export function handleSigninUserCode() {
	return async (req: IncomingMessage, res: ServerResponse) => {
		let body = '';
		for await (const chunk of req) body += chunk;
		const { user_code, password } = JSON.parse(body || '{}');
		const trimmed = typeof user_code === 'string' ? user_code.trim() : '';
		if (!trimmed || !password) return sendJson(res, 400, { error: 'missing_credentials' });
		if (!/^\d{7}$/.test(trimmed)) return sendJson(res, 400, { error: 'invalid_user_code' });

		const result = await pool.query(
			`SELECT id, role, password_hash FROM users WHERE employee_code = $1`,
			[trimmed]
		);
		const row = result.rows[0] as { id: number; role: 'manager' | 'employee'; password_hash: string } | undefined;
		if (!row) return sendJson(res, 401, { error: 'invalid_credentials' });
		const ok = bcrypt.compareSync(password, row.password_hash);
		if (!ok) return sendJson(res, 401, { error: 'invalid_credentials' });

		const token = signToken({ uid: row.id, role: row.role });
		setCookie(res, COOKIE_NAME, token, { maxAge: 60 * 60 * 2 });
		sendJson(res, 200, { ok: true });
	};
}

export function handleSignout() {
	return (_req: IncomingMessage, res: ServerResponse) => {
		clearCookie(res, COOKIE_NAME);
		sendJson(res, 200, { ok: true });
	};
}

export function handleMe() {
    return async (req: IncomingMessage, res: ServerResponse) => {
		const session = getSession(req);
		if (!session) return sendJson(res, 200, { user: null });
        const userRes = await pool.query(
            `SELECT id, name, email, employee_code, role FROM users WHERE id = $1`,
            [session.uid]
        );
        const user = userRes.rows[0];
		sendJson(res, 200, { user });
	};
}

