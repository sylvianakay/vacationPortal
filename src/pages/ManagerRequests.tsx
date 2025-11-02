import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Req = { id: number; user_id: number; date_from: string; date_to: string; reason?: string; status: 'pending'|'approved'|'rejected'; submitted_at: string; name: string; email: string };

const formatDate = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export function ManagerRequests() {
	const [items, setItems] = useState<Req[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [actingId, setActingId] = useState<number | null>(null);
	const navigate = useNavigate();

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('http://localhost:3000/api/requests', { credentials: 'include' });
			if (!res.ok) throw new Error('Failed to load');
			const data = await res.json();
			setItems(data.requests || []);
		} catch (e: any) {
			setError(e?.message || 'Error');
		} finally { setLoading(false); }
	}

	useEffect(() => { load(); }, []);

	async function act(id: number, action: 'approve'|'reject') {
		setError(null);
		setActingId(id);
		try {
			const res = await fetch(`http://localhost:3000/api/requests/${id}/${action}`, { method: 'POST', credentials: 'include' });
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error || 'Action failed');
			}
			await load();
		} catch (e: any) {
			setError(e?.message || 'Action failed');
		} finally {
			setActingId(null);
		}
	}

	const hasRequests = useMemo(() => items.length > 0, [items]);

	return (
		<section>
			<h2>Manager • Requests</h2>
			<p>Approve or reject vacation requests.</p>
			{error ? <div className="auth__error">{error}</div> : null}
			{loading ? <div>Loading…</div> : !hasRequests ? (
				<div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
					No vacation requests yet. New submissions will appear here for review.
				</div>
			) : (
				<ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
					{items.map((r) => (
						<li key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'grid', gap: 10 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<strong>{r.name}</strong>
								<span style={{ color: 'var(--muted)' }}>{r.email}</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
								<span>{formatDate(r.date_from)} → {formatDate(r.date_to)}</span>
								<span style={{ fontSize: 12, color: 'var(--muted)' }}>Submitted {new Date(r.submitted_at).toLocaleDateString()}</span>
							</div>
							<div>Status: <em>{r.status}</em></div>
							{r.reason ? <div style={{ color: 'var(--muted)' }}>{r.reason}</div> : null}
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
								<button className="button" onClick={() => navigate(`/app/manager/employee/${r.user_id}/history`)}>
									View history
								</button>
								{r.status === 'pending' ? (
									<>
										<button className="button button--primary" disabled={actingId === r.id} onClick={() => act(r.id, 'approve')}>
											{actingId === r.id ? 'Approving…' : 'Approve'}
										</button>
										<button className="button" disabled={actingId === r.id} onClick={() => act(r.id, 'reject')}>
											{actingId === r.id ? 'Rejecting…' : 'Reject'}
										</button>
									</>
								) : null}
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}


