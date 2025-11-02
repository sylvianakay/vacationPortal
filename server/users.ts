import type { IncomingMessage, ServerResponse } from 'http';
import { pool } from './db';
import { requireAuth } from './auth';
import { readJson, sendJson } from './utils';

export async function handleListUsers(req: IncomingMessage, res: ServerResponse) {
	const session = requireAuth(req, res, 'manager');
	if (!session) return;
	const result = await pool.query(
		`SELECT u.id, u.name, u.email, u.employee_code, u.role, u.created_at,
			pp.status AS pending_password_status,
			pp.created_at AS pending_password_created_at,
			pp.decided_at AS pending_password_decided_at,
			pe.status AS pending_email_status,
			pe.created_at AS pending_email_created_at,
			pe.decided_at AS pending_email_decided_at,
			pe.email_new AS pending_email_new
		FROM users u
		LEFT JOIN LATERAL (
			SELECT status, created_at, decided_at
			FROM pending_password_updates
			WHERE user_id = u.id
			ORDER BY created_at DESC
			LIMIT 1
		) pp ON true
		LEFT JOIN LATERAL (
			SELECT status, created_at, decided_at, email_new
			FROM pending_email_updates
			WHERE user_id = u.id
			ORDER BY created_at DESC
			LIMIT 1
		) pe ON true
		ORDER BY u.created_at DESC`
	);
	sendJson(res, 200, { users: result.rows });
}

export async function handleCreateUser(req: IncomingMessage, res: ServerResponse) {
	const session = requireAuth(req, res, 'manager');
	if (!session) return;
	const body = await readJson<{ name: string; email: string; employee_code: string; password: string; role: 'manager'|'employee' }>(req);
	if (!body?.name || !body?.email || !body?.employee_code || !body?.password || !body?.role) {
		return sendJson(res, 400, { error: 'invalid_body' });
	}
	if (!/^\d{7}$/.test(body.employee_code)) return sendJson(res, 400, { error: 'employee_code_invalid' });
	const bcrypt = await import('bcryptjs');
	const hash = bcrypt.hashSync(body.password, 10);
	try {
		const result = await pool.query(
			`INSERT INTO users (name, email, employee_code, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, employee_code, role`,
			[body.name, body.email, body.employee_code, hash, body.role]
		);
		return sendJson(res, 201, { user: result.rows[0] });
	} catch (e: any) {
		return sendJson(res, 400, { error: 'create_failed', detail: e?.message });
	}
}

export async function handleGetPendingEmail(req: IncomingMessage, res: ServerResponse) {
	const session = requireAuth(req, res);
	if (!session) return;
	const result = await pool.query(
		`SELECT p.id, p.email_new, p.created_at, m.name AS manager_name, m.email AS manager_email
		FROM pending_email_updates p
		JOIN users m ON m.id = p.manager_id
		WHERE p.user_id = $1 AND p.status = 'pending'
		ORDER BY p.created_at DESC
		LIMIT 1`,
		[session.uid]
	);
	return sendJson(res, 200, { request: result.rows[0] || null });
}

export async function handleRespondPendingEmail(req: IncomingMessage, res: ServerResponse) {
	const session = requireAuth(req, res);
	if (!session) return;
	const body = await readJson<{ action?: 'approve' | 'reject' }>(req);
	const action = body?.action;
	if (action !== 'approve' && action !== 'reject') {
		return sendJson(res, 400, { error: 'invalid_action' });
	}
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const pendingRes = await client.query(
			`SELECT id, email_new FROM pending_email_updates
			WHERE user_id = $1 AND status = 'pending'
			ORDER BY created_at DESC
			LIMIT 1 FOR UPDATE`,
			[session.uid]
		);
		const pending = pendingRes.rows[0];
		if (!pending) {
			await client.query('ROLLBACK');
			return sendJson(res, 404, { error: 'no_pending_update' });
		}
		if (action === 'approve') {
			await client.query(`UPDATE users SET email = $1 WHERE id = $2`, [pending.email_new, session.uid]);
		}
		await client.query(
			`UPDATE pending_email_updates SET status = $1, decided_at = NOW() WHERE id = $2`,
			[action === 'approve' ? 'approved' : 'rejected', pending.id]
		);
		await client.query('COMMIT');
		return sendJson(res, 200, { ok: true, status: action === 'approve' ? 'approved' : 'rejected' });
	} catch (e: any) {
		await client.query('ROLLBACK');
		return sendJson(res, 400, { error: 'update_failed', detail: e?.message });
	} finally {
		client.release();
	}
}

export async function handleUpdateUser(req: IncomingMessage, res: ServerResponse, id: number) {
	const session = requireAuth(req, res, 'manager');
	if (!session) return;
	const body = await readJson<{ name?: string; email?: string; password?: string; role?: 'manager'|'employee' }>(req);
	const trimming = {
		name: body?.name?.trim(),
		email: body?.email?.trim(),
		password: body?.password?.trim(),
	};
	const updatingSelf = id === session.uid;
	const fields: string[] = [];
	const values: any[] = [];
	let idx = 1;
	if (trimming.name) {
		fields.push(`name = $${idx++}`);
		values.push(trimming.name);
	}
	let emailDirect = false;
	let emailPendingValue: string | null = null;
	if (trimming.email) {
		if (updatingSelf) {
			fields.push(`email = $${idx++}`);
			values.push(trimming.email);
			emailDirect = true;
		} else {
			emailPendingValue = trimming.email;
		}
	}
	if (body?.role) {
		fields.push(`role = $${idx++}`);
		values.push(body.role);
	}

	let passwordDirect = false;
	let passwordPendingValue: string | null = null;
	if (trimming.password) {
		if (trimming.password.length < 8) {
			return sendJson(res, 400, { error: 'password_too_short', detail: 'Password must be at least 8 characters.' });
		}
		if (updatingSelf) {
			passwordDirect = true;
		} else {
			passwordPendingValue = trimming.password;
		}
	}

	if (fields.length === 0 && !emailPendingValue && !passwordPendingValue && !passwordDirect) {
		return sendJson(res, 400, { error: 'nothing_to_update' });
	}

	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const targetRes = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [id]);
		if (targetRes.rowCount === 0) {
			await client.query('ROLLBACK');
			return sendJson(res, 404, { error: 'not_found' });
		}
		if (fields.length > 0) {
			values.push(id);
			await client.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values);
		}
		if (passwordDirect) {
			const bcrypt = await import('bcryptjs');
			const hash = bcrypt.hashSync(trimming.password!, 10);
			await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, id]);
		}
		if (passwordPendingValue) {
			const bcrypt = await import('bcryptjs');
			const hash = bcrypt.hashSync(passwordPendingValue, 10);
			await client.query(`DELETE FROM pending_password_updates WHERE user_id = $1 AND status = 'pending'`, [id]);
			await client.query(
				`INSERT INTO pending_password_updates (user_id, manager_id, password_plain, password_hash) VALUES ($1,$2,$3,$4)`,
				[id, session.uid, passwordPendingValue, hash]
			);
		}
		if (emailPendingValue) {
			await client.query(`DELETE FROM pending_email_updates WHERE user_id = $1 AND status = 'pending'`, [id]);
			await client.query(
				`INSERT INTO pending_email_updates (user_id, manager_id, email_new) VALUES ($1,$2,$3)`,
				[id, session.uid, emailPendingValue]
			);
		}
		await client.query('COMMIT');
		return sendJson(res, 200, {
			ok: true,
			password_status: passwordPendingValue ? 'pending' : passwordDirect ? 'updated' : null,
			email_status: emailPendingValue ? 'pending' : emailDirect ? 'updated' : null,
		});
	} catch (e: any) {
		await client.query('ROLLBACK');
		return sendJson(res, 400, { error: 'update_failed', detail: e?.message });
	} finally {
		client.release();
	}
}

export async function handleDeleteUser(req: IncomingMessage, res: ServerResponse, id: number) {
	const session = requireAuth(req, res, 'manager');
	if (!session) return;
	await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
	sendJson(res, 200, { ok: true });
}

export async function handleUpdateOwnPassword(req: IncomingMessage, res: ServerResponse) {
	const session = requireAuth(req, res);
	if (!session) return;
	const body = await readJson<{ current_password?: string; new_password?: string }>(req);
	const current = body?.current_password?.trim() || '';
	const next = body?.new_password?.trim() || '';
	if (!current || !next) {
		return sendJson(res, 400, { error: 'missing_fields' });
	}
	if (next.length < 8) {
		return sendJson(res, 400, { error: 'password_too_short', detail: 'Password must be at least 8 characters.' });
	}
	const resUser = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [session.uid]);
	if (resUser.rowCount === 0) {
		return sendJson(res, 404, { error: 'not_found' });
	}
	const bcrypt = await import('bcryptjs');
	const valid = bcrypt.compareSync(current, resUser.rows[0].password_hash);
	if (!valid) {
		return sendJson(res, 400, { error: 'invalid_current_password' });
	}
	const hash = bcrypt.hashSync(next, 10);
	await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, session.uid]);
	sendJson(res, 200, { ok: true });
}

export async function handleGetPendingPassword(req: IncomingMessage, res: ServerResponse) {
	const session = requireAuth(req, res);
	if (!session) return;
	const result = await pool.query(
		`SELECT p.id, p.password_plain, p.created_at, m.name AS manager_name, m.email AS manager_email
		FROM pending_password_updates p
		JOIN users m ON m.id = p.manager_id
		WHERE p.user_id = $1 AND p.status = 'pending'
		ORDER BY p.created_at DESC
		LIMIT 1`,
		[session.uid]
	);
	return sendJson(res, 200, { request: result.rows[0] || null });
}

export async function handleRespondPendingPassword(req: IncomingMessage, res: ServerResponse) {
	const session = requireAuth(req, res);
	if (!session) return;
	const body = await readJson<{ action?: 'approve' | 'reject' }>(req);
	const action = body?.action;
	if (action !== 'approve' && action !== 'reject') {
		return sendJson(res, 400, { error: 'invalid_action' });
	}
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const pendingRes = await client.query(
			`SELECT id, password_hash FROM pending_password_updates
			WHERE user_id = $1 AND status = 'pending'
			ORDER BY created_at DESC
			LIMIT 1 FOR UPDATE`,
			[session.uid]
		);
		const pending = pendingRes.rows[0];
		if (!pending) {
			await client.query('ROLLBACK');
			return sendJson(res, 404, { error: 'no_pending_update' });
		}
		if (action === 'approve') {
			await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [pending.password_hash, session.uid]);
		}
		await client.query(
			`UPDATE pending_password_updates SET status = $1, decided_at = NOW() WHERE id = $2`,
			[action === 'approve' ? 'approved' : 'rejected', pending.id]
		);
		await client.query('COMMIT');
		return sendJson(res, 200, { ok: true, status: action === 'approve' ? 'approved' : 'rejected' });
	} catch (e: any) {
		await client.query('ROLLBACK');
		return sendJson(res, 400, { error: 'update_failed', detail: e?.message });
	} finally {
		client.release();
	}
}


