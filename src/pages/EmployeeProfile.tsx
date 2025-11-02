import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type SessionUser = {
	id: number;
	name: string;
	email: string;
	employee_code: string;
	role: 'employee';
};

type PendingPassword = {
	id: number;
	password_plain: string;
	created_at: string;
	manager_name: string;
	manager_email: string;
};

type PendingEmail = {
	id: number;
	email_new: string;
	created_at: string;
	manager_name: string;
	manager_email: string;
};

export function EmployeeProfile() {
	const [user, setUser] = useState<SessionUser | null>(null);
	const [pendingPassword, setPendingPassword] = useState<PendingPassword | null>(null);
	const [pendingEmail, setPendingEmail] = useState<PendingEmail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [responding, setResponding] = useState<'password' | 'email' | null>(null);
	const [changingPassword, setChangingPassword] = useState(false);
	const [passwordForm, setPasswordForm] = useState({ current: '', next: '' });
	const navigate = useNavigate();

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const [meRes, pendingPasswordRes, pendingEmailRes] = await Promise.all([
					fetch('http://localhost:3000/api/me', { credentials: 'include' }),
					fetch('http://localhost:3000/api/me/pending-password', { credentials: 'include' }),
					fetch('http://localhost:3000/api/me/pending-email', { credentials: 'include' }),
				]);
				if (!meRes.ok) throw new Error('Failed to load profile');
				const meData = await meRes.json();
				if (!cancelled) {
					if (meData?.user && meData.user.role === 'employee') {
						setUser(meData.user);
					} else {
						navigate('/signin', { replace: true });
						return;
					}
					if (pendingPasswordRes.ok) {
						const pendingPasswordData = await pendingPasswordRes.json();
						setPendingPassword(pendingPasswordData?.request ?? null);
					} else {
						setPendingPassword(null);
					}
					if (pendingEmailRes.ok) {
						const pendingEmailData = await pendingEmailRes.json();
						setPendingEmail(pendingEmailData?.request ?? null);
					} else {
						setPendingEmail(null);
					}
				}
			} catch (e: any) {
				if (!cancelled) setError(e?.message || 'Failed to load profile');
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [navigate]);

	async function respondPassword(action: 'approve' | 'reject') {
		setError(null);
		setMessage(null);
		setResponding('password');
		try {
			const res = await fetch('http://localhost:3000/api/me/pending-password/respond', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ action }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data?.detail || data?.error || 'Unable to update');
			}
			setMessage(action === 'approve' ? 'Password update approved.' : 'Password update rejected.');
			setPendingPassword(null);
			await refresh();
		} catch (e: any) {
			setError(e?.message || 'Unable to update');
		} finally {
			setResponding(null);
		}
	}

	async function respondEmail(action: 'approve' | 'reject') {
		setError(null);
		setMessage(null);
		setResponding('email');
		try {
			const res = await fetch('http://localhost:3000/api/me/pending-email/respond', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ action }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data?.detail || data?.error || 'Unable to update');
			}
			setMessage(action === 'approve' ? 'Email update approved.' : 'Email update rejected.');
			setPendingEmail(null);
			await refresh();
		} catch (e: any) {
			setError(e?.message || 'Unable to update');
		} finally {
			setResponding(null);
		}
	}

	async function refresh() {
		try {
			const meRes = await fetch('http://localhost:3000/api/me', { credentials: 'include' });
			if (meRes.ok) {
				const meData = await meRes.json();
				if (meData?.user && meData.user.role === 'employee') {
					setUser(meData.user);
				}
			}
			const passRes = await fetch('http://localhost:3000/api/me/pending-password', { credentials: 'include' });
			if (passRes.ok) {
				const passData = await passRes.json();
				setPendingPassword(passData?.request ?? null);
			}
			const emailRes = await fetch('http://localhost:3000/api/me/pending-email', { credentials: 'include' });
			if (emailRes.ok) {
				const emailData = await emailRes.json();
				setPendingEmail(emailData?.request ?? null);
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function changePassword(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setMessage(null);
		if (!passwordForm.current || !passwordForm.next) {
			setError('Please enter both your current and new password.');
			return;
		}
		setChangingPassword(true);
		try {
			const res = await fetch('http://localhost:3000/api/me/password', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ current_password: passwordForm.current, new_password: passwordForm.next }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data?.detail || data?.error || 'Unable to update password');
			}
			setMessage('Password updated successfully.');
			setPasswordForm({ current: '', next: '' });
		} catch (e: any) {
			setError(e?.message || 'Unable to update password');
		} finally {
			setChangingPassword(false);
		}
	}

	return (
		<section className="page page--centered">
			<div style={{ display: 'grid', gap: '0.35rem' }}>
				<h2 style={{ margin: 0 }}>Employee • My profile</h2>
				<p style={{ margin: 0, color: 'var(--muted)' }}>Review your details, respond to manager requests, and keep your credentials secure.</p>
			</div>
			{error ? <div className="auth__error">{error}</div> : null}
			{message ? <div className="auth__success">{message}</div> : null}
			{loading ? (
				<div>Loading…</div>
			) : user ? (
				<div style={{ display: 'grid', gap: '1.75rem' }}>
					<div className="surface surface--muted" style={{ width: '100%' }}>
						<div className="surface__body" style={{ display: 'grid', gap: 12 }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
								<div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--sidebar-primary)', color: 'var(--sidebar-primary-foreground)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
									{user.name.slice(0, 1).toUpperCase()}
								</div>
								<div>
									<div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user.name}</div>
									<div style={{ color: 'var(--muted)', fontSize: 13 }}>{user.email}</div>
								</div>
							</div>
							<div style={{ color: 'var(--muted)', fontSize: 13 }}>Employee code: {user.employee_code}</div>
						</div>
					</div>
					<div className="surface" style={{ width: '100%' }}>
						<div className="surface__body" style={{ display: 'grid', gap: 12 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
								<h3 style={{ margin: 0 }}>Manager requests</h3>
								<span style={{ fontSize: 12, color: 'var(--muted)' }}>Approve or reject updates proposed by your manager.</span>
							</div>
							<div style={{ display: 'grid', gap: 12 }}>
								<div className="surface surface--muted" style={{ padding: 12 }}>
									<strong>Pending password</strong>
									{pendingPassword ? (
										<div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
											<div style={{ fontSize: 13, color: 'var(--muted)' }}>
												Requested by {pendingPassword.manager_name} ({pendingPassword.manager_email}) on {new Date(pendingPassword.created_at).toLocaleString()}.
											</div>
											<div style={{ fontSize: 14 }}>Proposed password: <code>{pendingPassword.password_plain}</code></div>
											<div style={{ display: 'flex', gap: 8 }}>
												<button className="button" disabled={responding === 'password'} onClick={() => respondPassword('reject')}>
													{responding === 'password' ? 'Working…' : 'Reject'}
												</button>
												<button className="button button--dark" disabled={responding === 'password'} onClick={() => respondPassword('approve')}>
													{responding === 'password' ? 'Working…' : 'Approve'}
												</button>
											</div>
										</div>
									) : (
										<div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>No pending password changes.</div>
									)}
								</div>
								<div className="surface surface--muted" style={{ padding: 12 }}>
									<strong>Pending email</strong>
									{pendingEmail ? (
										<div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
											<div style={{ fontSize: 13, color: 'var(--muted)' }}>
												Requested by {pendingEmail.manager_name} ({pendingEmail.manager_email}) on {new Date(pendingEmail.created_at).toLocaleString()}.
											</div>
											<div style={{ fontSize: 14 }}>Proposed email: <code>{pendingEmail.email_new}</code></div>
											<div style={{ display: 'flex', gap: 8 }}>
												<button className="button" disabled={responding === 'email'} onClick={() => respondEmail('reject')}>
													{responding === 'email' ? 'Working…' : 'Reject'}
												</button>
												<button className="button button--dark" disabled={responding === 'email'} onClick={() => respondEmail('approve')}>
													{responding === 'email' ? 'Working…' : 'Approve'}
												</button>
											</div>
										</div>
									) : (
										<div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>No pending email changes.</div>
									)}
								</div>
							</div>
						</div>
					</div>
					<div className="surface">
						<div className="surface__body" style={{ gap: 12 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
								<h3 style={{ margin: 0 }}>Change your password</h3>
								<span style={{ fontSize: 12, color: 'var(--muted)' }}>Use at least 8 characters and keep it unique.</span>
							</div>
							<form onSubmit={changePassword} style={{ display: 'grid', gap: 12 }}>
								<label className="field">
									<span className="field__label">Current password</span>
									<input className="input" type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} required />
								</label>
								<label className="field">
									<span className="field__label">New password</span>
									<input className="input" type="password" value={passwordForm.next} onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })} required />
								</label>
								<button className="button button--dark" disabled={changingPassword}>{changingPassword ? 'Saving…' : 'Update password'}</button>
							</form>
						</div>
					</div>
				</div>
			) : (
				<div>No profile found.</div>
			)}
		</section>
	);
}
