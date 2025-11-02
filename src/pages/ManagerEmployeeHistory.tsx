'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

type HistoryRequest = {
	id: number;
	date_from: string;
	date_to: string;
	reason?: string;
	status: 'pending' | 'approved' | 'rejected';
	submitted_at: string;
};

type HistoryResponse = {
	user: { id: number; name: string; email: string };
	requests: HistoryRequest[];
};

const formatDate = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export function ManagerEmployeeHistory() {
	const { id } = useParams();
	const [data, setData] = useState<HistoryResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!id) return;
		let cancelled = false;
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`http://localhost:3000/api/users/${id}/requests`, { credentials: 'include' });
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					throw new Error(body?.error || 'Failed to load history');
				}
				const body = (await res.json()) as HistoryResponse;
				if (!cancelled) setData(body);
			} catch (e: any) {
				if (!cancelled) setError(e?.message || 'Failed to load history');
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [id]);

	const stats = useMemo(() => {
		const counts: Record<'pending' | 'approved' | 'rejected', number> = { pending: 0, approved: 0, rejected: 0 };
		for (const req of data?.requests ?? []) {
			counts[req.status] += 1;
		}
		return counts;
	}, [data]);

	type ChartRow = { date: string; approved: number; rejected: number };
	const chartData = useMemo<ChartRow[]>(() => {
		if (!data) return [];
		const bucket = new Map<string, { approved: number; rejected: number }>();
		for (const req of data.requests) {
			if (req.status !== 'approved' && req.status !== 'rejected') continue;
			const submitted = new Date(req.submitted_at);
			if (Number.isNaN(submitted.getTime())) continue;
			const key = submitted.toISOString().slice(0, 10);
			const entry = bucket.get(key) ?? { approved: 0, rejected: 0 };
			entry[req.status] += 1;
			bucket.set(key, entry);
		}
		return Array.from(bucket.entries())
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([date, values]) => ({ date, ...values }));
	}, [data]);

	const hasChartData = chartData.length > 0;

	return (
		<section className="page page--centered" style={{ gap: '1.5rem' }}>
			{loading ? (
				<div>Loading history…</div>
			) : error ? (
				<div className="auth__error">{error}</div>
			) : !data ? (
				<div className="auth__error">Unable to load employee details.</div>
			) : (
				<>
					<div className="surface">
						<div className="surface__body" style={{ gap: '1.25rem' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
								<div>
									<h2 style={{ margin: 0 }}>{data.user.name}</h2>
									<div style={{ color: 'var(--muted)' }}>{data.user.email}</div>
								</div>
							</div>
							<div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
								<div className="surface surface--muted" style={{ padding: '0.75rem' }}>
									<div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)' }}>Pending</div>
									<div style={{ fontSize: 26, fontWeight: 700 }}>{stats.pending}</div>
								</div>
								<div className="surface surface--muted" style={{ padding: '0.75rem' }}>
									<div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)' }}>Approved</div>
									<div style={{ fontSize: 26, fontWeight: 700, color: 'var(--primary)' }}>{stats.approved}</div>
								</div>
								<div className="surface surface--muted" style={{ padding: '0.75rem' }}>
									<div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)' }}>Rejected</div>
									<div style={{ fontSize: 26, fontWeight: 700, color: 'crimson' }}>{stats.rejected}</div>
								</div>
							</div>
							<div className="surface surface--muted" style={{ padding: '1rem' }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
									<div>
										<h3 style={{ margin: 0 }}>Approvals vs rejections</h3>
										<p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>Grouped by submission date</p>
									</div>
									{hasChartData ? (
										<div style={{ fontSize: 12, color: 'var(--muted)' }}>Approved total: {stats.approved} · Rejected total: {stats.rejected}</div>
									) : null}
								</div>
								<div style={{ width: '100%', height: 260 }}>
									{hasChartData ? (
										<ResponsiveContainer width="100%" height="100%">
											<BarChart data={chartData} margin={{ left: 12, right: 12, bottom: 8 }}>
												<CartesianGrid vertical={false} strokeDasharray="3 3" />
												<XAxis
													dataKey="date"
													tickMargin={8}
													tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
												/>
												<Tooltip
													labelFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
													formatter={(val: number | string, key: string) => {
														const label = key === 'approved' ? 'Approved' : 'Rejected';
														return [typeof val === 'number' ? val : Number(val), label];
													}}
												/>
												<Bar dataKey="approved" fill="var(--primary)" radius={[6, 6, 0, 0]} />
												<Bar dataKey="rejected" fill="crimson" radius={[6, 6, 0, 0]} />
											</BarChart>
										</ResponsiveContainer>
									) : (
										<div style={{ color: 'var(--muted)', paddingTop: 16 }}>No approved or rejected requests yet.</div>
									)}
								</div>
							</div>
						</div>
					</div>
					<div className="surface">
						<div className="surface__body">
							<h3 style={{ margin: 0 }}>Request history</h3>
							{data.requests.length === 0 ? (
								<div style={{ color: 'var(--muted)' }}>No requests found for this employee yet.</div>
							) : (
								<ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
									{data.requests.map((req) => (
										<li key={req.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'grid', gap: 6 }}>
											<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
												<strong>{formatDate(req.date_from)} → {formatDate(req.date_to)}</strong>
												<span style={{ fontSize: 12, color: 'var(--muted)' }}>Submitted {new Date(req.submitted_at).toLocaleDateString()}</span>
											</div>
											<div>Status: <em>{req.status}</em></div>
											{req.reason ? <div style={{ color: 'var(--muted)' }}>{req.reason}</div> : null}
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
				</>
			)}
		</section>
	);
}
