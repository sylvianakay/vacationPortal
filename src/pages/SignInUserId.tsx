import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SignInUserId() {
	const navigate = useNavigate();
	const [userCode, setUserCode] = useState('');
	const [password, setPassword] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			const res = await fetch('http://localhost:3000/api/signin/user-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ user_code: userCode, password }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error || 'Sign in failed');
			}
			const meRes = await fetch('http://localhost:3000/api/me', { credentials: 'include' });
			const me = await meRes.json();
			const role: 'manager' | 'employee' | undefined = me?.user?.role;
			if (role === 'manager') navigate('/app/manager/users');
			else navigate('/app/employee/requests');
		} catch (err: any) {
			setError(err?.message || 'Sign in failed');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<section className="auth">
			<div className="auth__card">
				<div className="auth__grid">
					<form className="auth__form" onSubmit={handleSubmit}>
						<div className="auth__header">
							<h1 className="auth__title">Use your User ID</h1>
							<p className="auth__subtitle">Enter the 7-digit code shared with you</p>
						</div>
						<label className="field">
							<span className="field__label">User ID</span>
							<input
								type="text"
								className="input"
								pattern="\d{7}"
								placeholder="1234567"
								value={userCode}
								onChange={(e) => setUserCode(e.target.value)}
								required
							/>
						</label>
						<label className="field">
							<span className="field__label">Password</span>
							<div className="passwordField">
								<input
									type={showPassword ? 'text' : 'password'}
									className="input"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
								/>
								<button
									type="button"
									className="inputToggle"
									onClick={() => setShowPassword((v) => !v)}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
								>
									{showPassword ? (
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M12 5C7 5 2.73 8.11 1 12.5 2.73 16.89 7 20 12 20c5 0 9.27-3.11 11-7.5C21.27 8.11 17 5 12 5Zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5Zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3Z" fill="currentColor" />
										</svg>
									) : (
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M12 5c-2.04 0-3.97.56-5.64 1.52l1.53 1.53A8.44 8.44 0 0 1 12 7c3.86 0 7.17 2.5 8.47 5.5a9.8 9.8 0 0 1-2.53 3.36l1.41 1.41A11.77 11.77 0 0 0 23 12.5C21.27 8.11 17 5 12 5Zm-9 0.86L4.28 7.14 5 7.86C3.39 9 2.08 10.57 1 12.5 2.73 16.89 7 20 12 20c1.64 0 3.2-.3 4.63-.86l.77.77 1.27-1.27-15-15L3 4.59Zm6.14 6.13 1.61 1.61a2 2 0 0 1-1.61-1.61ZM9 12c0-.34.06-.66.16-.97l1.81 1.81c-.31.1-.63.16-.97.16-1.66 0-3-1.34-3-3 0-.34.06-.66.16-.97l1.81 1.81c-.31.1-.63.16-.97.16Zm2.23 2.23 1.54 1.54A3.97 3.97 0 0 1 12 16c-2.21 0-4-1.79-4-4 0-.23.02-.46.05-.68l1.7 1.7c.1.54.33 1.05.68 1.51Zm1.6-7.11 4.3 4.3a4.98 4.98 0 0 0-4.3-4.3Z" fill="currentColor" />
										</svg>
									)}
								</button>
							</div>
						</label>
						{error ? <div className="auth__error">{error}</div> : null}
						<button className="button button--primary button--block" disabled={submitting}>
							{submitting ? 'Signing in…' : 'Sign in'}
						</button>
						<div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
							<button
								type="button"
								onClick={() => navigate('/signin')}
								style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
							>
								or sign in with email instead
							</button>
						</div>
					</form>
					<div className="auth__image">
						<img
							src="https://images.unsplash.com/photo-1496302662116-35cc4f36df92?q=80&w=1200&auto=format&fit=crop"
							alt="Vibrant abstract"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
