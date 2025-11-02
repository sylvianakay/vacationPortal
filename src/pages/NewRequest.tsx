import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function NewRequest() {
	const today = new Date().toISOString().slice(0, 10);
	const [from, setFrom] = useState('');
	const [to, setTo] = useState('');
	const [reason, setReason] = useState('');
	const [msg, setMsg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const navigate = useNavigate();

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setMsg(null);
		setError(null);
		if (!from || !to) {
			setError('Please select both start and end dates.');
			return;
		}
		const fromDate = new Date(from);
		const toDate = new Date(to);
		const minStart = new Date(today);
		if (fromDate < minStart) {
			setError('Start date cannot be in the past.');
			return;
		}
		if (toDate < fromDate) {
			setError('End date cannot be before start date.');
			return;
		}
		const maxRangeDays = 30;
		const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
		if (diffDays > maxRangeDays) {
			setError(`Requests cannot exceed ${maxRangeDays} days.`);
			return;
		}
		setSubmitting(true);
		try {
			const res = await fetch('http://localhost:3000/api/requests', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ date_from: from, date_to: to, reason }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error || 'Submit failed');
			}
			setMsg('Request submitted successfully.');
			setFrom('');
			setTo('');
			setReason('');
			setTimeout(() => navigate('/app/employee/requests'), 800);
		} catch (err: any) {
			setError(err?.message || 'Submit failed');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<section className="page page--centered">
			<div style={{ display: 'grid', gap: '0.35rem' }}>
				<h2 style={{ margin: 0 }}>Employee • New Request</h2>
				<p style={{ margin: 0, color: 'var(--muted)' }}>Pick your vacation window and let your manager know why you need time off.</p>
			</div>
			<div className="surface">
				<form className="surface__body" onSubmit={submit} noValidate style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
					<label className="field">
						<span className="field__label">From</span>
						<input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required min={today} max={to || undefined} />
					</label>
					<label className="field">
						<span className="field__label">To</span>
						<input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} required min={from || today} />
					</label>
					<label className="field">
						<span className="field__label">Reason</span>
						<textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" rows={4} />
					</label>
					<div style={{ display: 'flex', justifyContent: 'flex-start' }}>
						<button className="button button--dark" style={{ minWidth: 220 }} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit request'}</button>
					</div>
					{error ? <div className="auth__error">{error}</div> : null}
					{msg ? <div className="auth__success">{msg}</div> : null}
				</form>
			</div>
		</section>
	);
}


