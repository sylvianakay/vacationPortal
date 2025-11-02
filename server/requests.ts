import type { IncomingMessage, ServerResponse } from 'http';
import { pool } from './db';
import { requireAuth, getSession } from './auth';
import { readJson, sendJson } from './utils';

export async function handleCreateRequest(req: IncomingMessage, res: ServerResponse) {
	const session = requireAuth(req, res, 'employee');
	if (!session) return;
	const body = await readJson<{ date_from: string; date_to: string; reason?: string }>(req);
	if (!body?.date_from || !body?.date_to) return sendJson(res, 400, { error: 'invalid_body' });
	const from = new Date(body.date_from);
	const to = new Date(body.date_to);
	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return sendJson(res, 400, { error: 'invalid_dates' });
	if (to < from) return sendJson(res, 400, { error: 'date_range' });
	const reason = body.reason?.trim() ? body.reason.trim() : null;
	await pool.query(
		`INSERT INTO requests (user_id, date_from, date_to, reason) VALUES ($1,$2,$3,$4)`,
		[session.uid, body.date_from, body.date_to, reason]
	);
	sendJson(res, 201, { ok: true });
}

export async function handleListRequests(req: IncomingMessage, res: ServerResponse) {
	const session = requireAuth(req, res); // either role
	if (!session) return;
	const url = new URL(req.url || '/', `http://${req.headers.host}`);
	const mine = url.searchParams.get('mine') === 'true';
	if (mine) {
		const result = await pool.query(
			`SELECT id, date_from, date_to, reason, status, submitted_at FROM requests WHERE user_id = $1 ORDER BY submitted_at DESC`,
			[session.uid]
		);
		return sendJson(res, 200, { requests: result.rows });
	}
	// manager listing all
	const m = requireAuth(req, res, 'manager');
	if (!m) return;
	const result = await pool.query(
		`SELECT r.id, r.date_from, r.date_to, r.reason, r.status, r.submitted_at, u.id AS user_id, u.name, u.email
		 FROM requests r JOIN users u ON u.id = r.user_id ORDER BY r.submitted_at DESC`
	);
	sendJson(res, 200, { requests: result.rows });
}

export async function handleListUserHistory(req: IncomingMessage, res: ServerResponse, userId: number) {
	const m = requireAuth(req, res, 'manager');
	if (!m) return;
	const userRes = await pool.query(`SELECT id, name, email FROM users WHERE id = $1`, [userId]);
	if (userRes.rowCount === 0) {
		return sendJson(res, 404, { error: 'user_not_found' });
	}
	const requestsRes = await pool.query(
		`SELECT id, date_from, date_to, reason, status, submitted_at
		 FROM requests WHERE user_id = $1 ORDER BY submitted_at DESC`,
		[userId]
	);
	sendJson(res, 200, { user: userRes.rows[0], requests: requestsRes.rows });
}

export async function handleApprove(req: IncomingMessage, res: ServerResponse, id: number) {
	const m = requireAuth(req, res, 'manager');
	if (!m) return;
	const result = await pool.query(
		`UPDATE requests SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING id, status`,
		[id]
	);
	if (result.rowCount === 0) return sendJson(res, 404, { error: 'not_found_or_not_pending' });
	sendJson(res, 200, { ok: true });
}

export async function handleReject(req: IncomingMessage, res: ServerResponse, id: number) {
	const m = requireAuth(req, res, 'manager');
	if (!m) return;
	const result = await pool.query(
		`UPDATE requests SET status = 'rejected' WHERE id = $1 AND status = 'pending' RETURNING id, status`,
		[id]
	);
	if (result.rowCount === 0) return sendJson(res, 404, { error: 'not_found_or_not_pending' });
	sendJson(res, 200, { ok: true });
}

export async function handleDeleteOwnPending(req: IncomingMessage, res: ServerResponse, id: number) {
	const session = requireAuth(req, res, 'employee');
	if (!session) return;
	await pool.query(`DELETE FROM requests WHERE id = $1 AND user_id = $2 AND status = 'pending'`, [id, session.uid]);
	sendJson(res, 200, { ok: true });
}


