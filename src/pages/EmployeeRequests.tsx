import { useEffect, useState } from 'react';

type Req = { id: number; date_from: string; date_to: string; reason?: string; status: 'pending'|'approved'|'rejected'; submitted_at: string };

const formatDate = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export function EmployeeRequests() {
	const [items, setItems] = useState<Req[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [actingId, setActingId] = useState<number | null>(null);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('http://localhost:3000/api/requests?mine=true', { credentials: 'include' });
			if (!res.ok) throw new Error('Failed to load');
			const data = await res.json();
			setItems(data.requests || []);
		} catch (e: any) { setError(e?.message || 'Error'); }
		finally { setLoading(false); }
	}

	useEffect(() => { load(); }, []);

	async function cancel(id: number) {
		setError(null);
		setActingId(id);
		try {
			const res = await fetch(`http://localhost:3000/api/requests/${id}`, { method: 'DELETE', credentials: 'include' });
			if (!res.ok) throw new Error('Delete failed');
			await load();
		} catch (e: any) {
			setError(e?.message || 'Delete failed');
		} finally {
			setActingId(null);
		}
	}

	return (
		<section>
			<h2>Employee • Requests</h2>
			{error ? <div className="auth__error">{error}</div> : null}
			{loading ? <div>Loading…</div> : items.length === 0 ? (
				<div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
					You have not submitted any vacation requests yet.
				</div>
			) : (
				<ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
					{items.map((r) => (
						<li key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'grid', gap: 6 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
								<strong>{formatDate(r.date_from)} → {formatDate(r.date_to)}</strong>
								<span style={{ fontSize: 12, color: 'var(--muted)' }}>Submitted {new Date(r.submitted_at).toLocaleString()}</span>
							</div>
							<div>Status: <em>{r.status}</em></div>
							{r.reason ? <div style={{ color: 'var(--muted)' }}>{r.reason}</div> : null}
							{r.status === 'pending' ? (
								<button className="button" disabled={actingId === r.id} onClick={() => cancel(r.id)}>
									{actingId === r.id ? 'Deleting…' : 'Delete' }
								</button>
							) : null}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}


