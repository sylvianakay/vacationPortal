import http from 'http';
import { URL } from 'url';
import { handleMe, handleSignin, handleSigninUserCode, handleSignout } from './auth';
import { sendJson } from './utils';
import { handleCreateUser, handleDeleteUser, handleGetPendingEmail, handleGetPendingPassword, handleListUsers, handleRespondPendingEmail, handleRespondPendingPassword, handleUpdateOwnPassword, handleUpdateUser } from './users';
import { handleApprove, handleCreateRequest, handleDeleteOwnPending, handleListRequests, handleListUserHistory, handleReject } from './requests';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const server = http.createServer(async (req, res) => {
	const method = req.method || 'GET';
	const url = new URL(req.url || '/', `http://${req.headers.host}`);

	// CORS for local dev/preview
	const origin = req.headers.origin;
	if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') {
		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Vary', 'Origin');
		res.setHeader('Access-Control-Allow-Credentials', 'true');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
	}

	if (method === 'OPTIONS') {
		res.writeHead(204);
		return res.end();
	}

	// Minimal health route
	if (method === 'GET' && url.pathname === '/api/health') {
		return sendJson(res, 200, { ok: true });
	}

	// Auth
	if (method === 'POST' && url.pathname === '/api/signin') return handleSignin()(req, res);
	if (method === 'POST' && url.pathname === '/api/signin/user-code') return handleSigninUserCode()(req, res);
	if (method === 'POST' && url.pathname === '/api/signout') return handleSignout()(req, res);
	if (method === 'GET' && url.pathname === '/api/me') return handleMe()(req, res);
	if (method === 'PATCH' && url.pathname === '/api/me/password') return handleUpdateOwnPassword(req, res);
	if (method === 'GET' && url.pathname === '/api/me/pending-password') return handleGetPendingPassword(req, res);
	if (method === 'POST' && url.pathname === '/api/me/pending-password/respond') return handleRespondPendingPassword(req, res);
	if (method === 'GET' && url.pathname === '/api/me/pending-email') return handleGetPendingEmail(req, res);
	if (method === 'POST' && url.pathname === '/api/me/pending-email/respond') return handleRespondPendingEmail(req, res);

	// Users (manager-only)
	if (url.pathname === '/api/users' && method === 'GET') return handleListUsers(req, res);
	if (url.pathname === '/api/users' && method === 'POST') return handleCreateUser(req, res);
	const userIdMatch = url.pathname.match(/^\/api\/users\/(\d+)$/);
	if (userIdMatch) {
		const id = Number(userIdMatch[1]);
		if (method === 'PUT' || method === 'PATCH') return handleUpdateUser(req, res, id);
		if (method === 'DELETE') return handleDeleteUser(req, res, id);
	}
	const userRequestMatch = url.pathname.match(/^\/api\/users\/(\d+)\/requests$/);
	if (userRequestMatch && method === 'GET') {
		const id = Number(userRequestMatch[1]);
		return handleListUserHistory(req, res, id);
	}

	// Requests
	if (url.pathname === '/api/requests' && method === 'GET') return handleListRequests(req, res);
	if (url.pathname === '/api/requests' && method === 'POST') return handleCreateRequest(req, res);
	const reqId = url.pathname.match(/^\/api\/requests\/(\d+)(?:\/(approve|reject))?$/);
	if (reqId) {
		const id = Number(reqId[1]);
		const action = reqId[2];
		if (action === 'approve' && method === 'POST') return handleApprove(req, res, id);
		if (action === 'reject' && method === 'POST') return handleReject(req, res, id);
		if (!action && method === 'DELETE') return handleDeleteOwnPending(req, res, id);
	}

	res.writeHead(404, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
	console.log(`[server] listening on http://localhost:${PORT}`);
});


