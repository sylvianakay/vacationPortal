import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type User = {
	id: number;
	name: string;
	email: string;
	employee_code: string;
	role: 'manager'|'employee';
	pending_password_status?: 'pending'|'approved'|'rejected' | null;
	pending_password_created_at?: string | null;
	pending_password_decided_at?: string | null;
	pending_email_status?: 'pending'|'approved'|'rejected' | null;
	pending_email_created_at?: string | null;
	pending_email_decided_at?: string | null;
	pending_email_new?: string | null;
};
type SessionUser = { id: number; name: string; email: string; employee_code: string; role: 'manager' };
type PendingPassword = { id: number; password_plain: string; created_at: string; manager_name: string; manager_email: string } | null;
type PendingEmail = { id: number; email_new: string; created_at: string; manager_name: string; manager_email: string } | null;

export function ManagerUsers() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState({ name: '', email: '', employee_code: '', password: '', role: 'employee' as 'manager'|'employee' });
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editForm, setEditForm] = useState<{ name: string; email: string; password: string }>({ name: '', email: '', password: '' });
	const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [pendingPassword, setPendingPassword] = useState<PendingPassword>(null);
	const [pendingEmail, setPendingEmail] = useState<PendingEmail>(null);
	const [responding, setResponding] = useState<'password' | 'email' | null>(null);
	const [passwordForm, setPasswordForm] = useState({ current: '', next: '' });
	const [changingPassword, setChangingPassword] = useState(false);
	const [searchParams] = useSearchParams();

	const currentView = useMemo(() => {
		const view = searchParams.get('view');
		return view === 'directory' || view === 'create' || view === 'profile' ? view : null;
	}, [searchParams]);
	const isProfileView = currentView === 'profile';
	const heading = isProfileView ? 'Manager • My profile' : 'Manager • Users';
	const subheading = isProfileView ? 'Review your details, respond to manager requests, and keep your credentials secure.' : 'Keep your team up to date: browse the directory, add new teammates, or refine your profile details.';
	const sectionClass = isProfileView ? 'page page--centered' : 'page';

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const [usersRes, meRes] = await Promise.all([
				fetch('http://localhost:3000/api/users', { credentials: 'include' }),
				fetch('http://localhost:3000/api/me', { credentials: 'include' }),
			]);
			if (!usersRes.ok) throw new Error('Failed to load users');
			const data = await usersRes.json();
			setUsers(data.users || []);
			if (meRes.ok) {
				const meData = await meRes.json();
				setSessionUser(meData?.user ?? null);
				await loadPendingInfo();
			} else {
				setSessionUser(null);
				setPendingEmail(null);
				setPendingPassword(null);
			}
		} catch (e: any) {
			setError(e?.message || 'Error');
		} finally {
			setLoading(false);
		}
	}

	async function changeOwnPassword(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setNotice(null);
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
			setNotice('Password updated successfully.');
			setPasswordForm({ current: '', next: '' });
		} catch (e: any) {
			setError(e?.message || 'Unable to update password');
		} finally {
			setChangingPassword(false);
		}
	}

	useEffect(() => { load(); }, []);

	async function loadPendingInfo() {
		try {
			const [passRes, emailRes] = await Promise.all([
				fetch('http://localhost:3000/api/me/pending-password', { credentials: 'include' }),
				fetch('http://localhost:3000/api/me/pending-email', { credentials: 'include' }),
			]);
			if (passRes.ok) {
				const passData = await passRes.json().catch(() => ({}));
				setPendingPassword(passData?.request ?? null);
			}
			if (emailRes.ok) {
				const emailData = await emailRes.json().catch(() => ({}));
				setPendingEmail(emailData?.request ?? null);
			}
		} catch (e: any) {
			setError((prev) => (prev ?? e?.message) || 'Unable to load pending updates');
		}
	}

	async function createUser(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			const res = await fetch('http://localhost:3000/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(form),
			});
			if (!res.ok) throw new Error('Create failed');
			setForm({ name: '', email: '', employee_code: '', password: '', role: 'employee' });
			await load();
		} catch (e: any) {
			setError(e?.message || 'Create failed');
		}
	}

	async function deleteUser(id: number) {
		if (!confirm('Delete this user?')) return;
		await fetch(`http://localhost:3000/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
		await load();
	}

	function startEdit(u: User) {
		setEditingId(u.id);
		setEditForm({ name: u.name, email: u.email, password: '' });
	}

	async function saveEdit(e: React.FormEvent) {
		e.preventDefault();
		if (editingId == null) return;
		setError(null);
		const target = users.find((u) => u.id === editingId);
		if (!target) {
			setError('User not found.');
			return;
		}
		const body: Record<string, any> = {};
		if (editForm.name !== target.name) body.name = editForm.name;
		if (editForm.email !== target.email) body.email = editForm.email;
		if (editForm.password) body.password = editForm.password;
		if (Object.keys(body).length === 0) {
			setNotice('No changes to save.');
			return;
		}
		const res = await fetch(`http://localhost:3000/api/users/${editingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(body),
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			setError(data?.detail || 'Update failed');
			return;
		}
		const notices: string[] = [];
		if (data?.password_status === 'pending') {
			notices.push('Password update sent for approval.');
		} else if (data?.password_status === 'updated') {
			notices.push('Password updated.');
		}
		if (data?.email_status === 'pending') {
			notices.push('Email update sent for approval.');
		} else if (data?.email_status === 'updated') {
			notices.push('Email updated.');
		}
		setNotice(notices.join(' ') || 'User updated.');
		setEditingId(null);
		setEditForm({ name: '', email: '', password: '' });
		await load();
	}

	async function respondPending(type: 'password' | 'email', action: 'approve' | 'reject') {
		setError(null);
		setNotice(null);
		setResponding(type);
		try {
			const res = await fetch(`http://localhost:3000/api/me/pending-${type}/respond`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ action }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data?.detail || data?.error || 'Unable to update request');
			}
			setNotice(action === 'approve' ? `${type === 'password' ? 'Password' : 'Email'} update approved.` : `${type === 'password' ? 'Password' : 'Email'} update rejected.`);
			await loadPendingInfo();
			if (type === 'email' && action === 'approve') {
				await load();
			}
		} catch (e: any) {
			setError(e?.message || 'Unable to update request');
		} finally {
			setResponding(null);
		}
	}

	return (
		<section className={sectionClass}>
			<div style={{ display: 'grid', gap: '0.35rem' }}>
				<h2 style={{ margin: 0 }}>{heading}</h2>
				<p style={{ margin: 0, color: 'var(--muted)' }}>{subheading}</p>
			</div>
			{error ? <div className="auth__error">{error}</div> : null}
			{notice && currentView !== 'create' ? <div className="auth__success">{notice}</div> : null}
			{loading ? <div>Loading…</div> : (
				<div style={{ display: 'grid', gap: 16 }}>
					{currentView == null ? (
						<div style={{ color: 'var(--muted)' }}>Select an option from the sidebar to continue.</div>
					) : null}
					{currentView === 'profile' && sessionUser ? (
						<div style={{ display: 'grid', gap: '1.75rem', width: '100%' }}>
							<div className="surface surface--muted" style={{ width: '100%' }}>
								<div className="surface__body" style={{ display: 'grid', gap: 12 }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
										<div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--sidebar-primary)', color: 'var(--sidebar-primary-foreground)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
											{sessionUser.name.slice(0, 1).toUpperCase()}
										</div>
										<div>
											<div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{sessionUser.name}</div>
											<div style={{ color: 'var(--muted)', fontSize: 13 }}>{sessionUser.email}</div>
										</div>
									</div>
									<div style={{ color: 'var(--muted)', fontSize: 13 }}>Employee code: {sessionUser.employee_code}</div>
								</div>
							</div>
							<div className="surface" style={{ width: '100%' }}>
								<div className="surface__body" style={{ gap: 12 }}>
									<div>
										<h3 style={{ margin: 0 }}>Manager requests</h3>
										<span style={{ fontSize: 12, color: 'var(--muted)' }}>Approve or reject updates proposed by your manager.</span>
									</div>
									<div className="surface surface--muted" style={{ padding: 12 }}>
										<strong>Pending password</strong>
										{pendingPassword ? (
											<div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
												<div style={{ fontSize: 13, color: 'var(--muted)' }}>
													Requested by {pendingPassword.manager_name} ({pendingPassword.manager_email}) on {new Date(pendingPassword.created_at).toLocaleString()}.
												</div>
												<div style={{ fontSize: 14 }}>Proposed password: <code>{pendingPassword.password_plain}</code></div>
												<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
													<button className="button" disabled={responding === 'password'} onClick={() => respondPending('password', 'reject')}>
														{responding === 'password' ? 'Working…' : 'Reject'}
													</button>
													<button className="button button--dark" disabled={responding === 'password'} onClick={() => respondPending('password', 'approve')}>
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
												<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
													<button className="button" disabled={responding === 'email'} onClick={() => respondPending('email', 'reject')}>
														{responding === 'email' ? 'Working…' : 'Reject'}
													</button>
													<button className="button button--dark" disabled={responding === 'email'} onClick={() => respondPending('email', 'approve')}>
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
							<div className="surface" style={{ width: '100%' }}>
								<div className="surface__body" style={{ gap: 12 }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
										<h3 style={{ margin: 0 }}>Change your password</h3>
										<span style={{ fontSize: 12, color: 'var(--muted)' }}>Use at least 8 characters and keep it unique.</span>
									</div>
									<form onSubmit={changeOwnPassword} style={{ display: 'grid', gap: 12 }}>
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
					) : null}
					{currentView === 'directory' ? (
						<ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
							{users.filter((u) => (sessionUser ? u.id !== sessionUser.id : true)).map((u) => (
								<li key={u.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
										<div>
											<div style={{ fontWeight: 700 }}>{u.name}</div>
											<div style={{ color: 'var(--muted)', fontSize: 13 }}>{u.email} · {u.employee_code} · {u.role}</div>
										</div>
										<div style={{ display: 'flex', gap: 8 }}>
											<button className="button" onClick={() => startEdit(u)}>Edit</button>
											<button className="button" onClick={() => deleteUser(u.id)}>Delete</button>
										</div>
									</div>
									{u.pending_password_status === 'pending' ? (
										<div style={{ fontSize: 12, color: 'var(--muted)' }}>Password update pending approval.</div>
									) : null}
									{u.pending_password_status === 'rejected' ? (
										<div style={{ fontSize: 12, color: 'var(--muted)' }}>Latest password update was rejected by the user.</div>
									) : null}
									{u.pending_email_status === 'pending' ? (
										<div style={{ fontSize: 12, color: 'var(--muted)' }}>Email update to {u.pending_email_new} pending approval.</div>
									) : null}
									{u.pending_email_status === 'rejected' ? (
										<div style={{ fontSize: 12, color: 'var(--muted)' }}>Latest email update was rejected by the user.</div>
									) : null}
									{editingId === u.id ? (
										<form onSubmit={saveEdit} style={{ display: 'grid', gap: 8 }}>
											<label className="field">
												<span className="field__label">Name</span>
												<input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
											</label>
											<label className="field">
												<span className="field__label">Email</span>
												<input className="input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
											</label>
											<label className="field">
												<span className="field__label">New password (optional)</span>
												<input className="input" type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
											</label>
											<div style={{ display: 'flex', gap: 8 }}>
												<button className="button button--dark">Save</button>
												<button type="button" className="button" onClick={() => { setEditingId(null); setEditForm({ name: '', email: '', password: '' }); }}>Cancel</button>
											</div>
										</form>
									) : null}
								</li>
							))}
						</ul>
					) : null}
					{currentView === 'create' ? (
						<div className="surface" style={{ width: '100%' }}>
						<form className="surface__body" onSubmit={createUser} style={{ gap: 12, maxWidth: 960, width: '100%' }}>
								<h3 style={{ margin: 0 }}>Create user</h3>
								<label className="field">
									<span className="field__label">Name</span>
									<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
								</label>
								<label className="field">
									<span className="field__label">Email</span>
									<input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
								</label>
								<label className="field">
									<span className="field__label">User ID (7 digits)</span>
									<input className="input" pattern="\d{7}" value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} required />
								</label>
								<label className="field">
									<span className="field__label">Password</span>
									<input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
								</label>
								<label className="field">
									<span className="field__label">Role</span>
									<select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
										<option value="employee">employee</option>
										<option value="manager">manager</option>
									</select>
								</label>
								<div style={{ display: 'flex', justifyContent: 'flex-start' }}>
									<button className="button button--dark" style={{ minWidth: 200 }}>Create</button>
								</div>
							</form>
						</div>
					) : null}
				</div>
			)}
		</section>
	);
}

