import { IncomingMessage, ServerResponse } from 'http';

export async function readJson<T = any>(req: IncomingMessage): Promise<T> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	const raw = Buffer.concat(chunks).toString('utf8') || '{}';
	return JSON.parse(raw);
}

export function sendJson(res: ServerResponse, status: number, body: unknown) {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(body));
}

export function parseCookies(req: IncomingMessage): Record<string, string> {
	const header = req.headers.cookie;
	if (!header) return {};
	return Object.fromEntries(
		header.split(';').map((p) => {
			const [k, v] = p.trim().split('=');
			return [k, decodeURIComponent(v || '')];
		})
	);
}

export function setCookie(res: ServerResponse, name: string, value: string, options?: { maxAge?: number }) {
	const cookie = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${
		options?.maxAge ? `; Max-Age=${options.maxAge}` : ''
	}`;
	const existing = res.getHeader('Set-Cookie');
	if (Array.isArray(existing)) {
		res.setHeader('Set-Cookie', [...existing, cookie]);
	} else if (typeof existing === 'string' && existing.length > 0) {
		res.setHeader('Set-Cookie', [existing, cookie]);
	} else {
		res.setHeader('Set-Cookie', cookie);
	}
}

export function clearCookie(res: ServerResponse, name: string) {
	const cookie = `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
	res.setHeader('Set-Cookie', cookie);
}


