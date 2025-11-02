import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

type SessionUser = {
	id: number;
	name: string;
	email: string;
	employee_code: string;
	role: 'manager' | 'employee';
};

export function Layout() {
	const [openGeneral, setOpenGeneral] = useState(true);
	const [openManager, setOpenManager] = useState(true);
	const [openEmployee, setOpenEmployee] = useState(true);
	const [user, setUser] = useState<SessionUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const location = useLocation();
	const managerView = location.pathname === '/app/manager/users'
		? new URLSearchParams(location.search).get('view')
		: null;

	useEffect(() => {
		let cancelled = false;
		async function loadSession() {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch('http://localhost:3000/api/me', { credentials: 'include' });
				if (!res.ok) throw new Error('Failed to load session');
				const data = await res.json();
				if (!cancelled) setUser(data?.user ?? null);
			} catch (e: any) {
				if (!cancelled) {
					setUser(null);
					setError(e?.message || 'Unable to load session');
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		loadSession();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (loading) return;
		if (!user) {
			navigate('/signin', { replace: true });
			return;
		}
		if (user.role === 'manager' && location.pathname.startsWith('/app/employee')) {
			navigate('/app/manager/users', { replace: true });
		} else if (user.role === 'employee' && location.pathname.startsWith('/app/manager')) {
			navigate('/app/employee/requests', { replace: true });
		}
	}, [user, loading, location.pathname, navigate]);

	async function handleSignOut() {
		await fetch('http://localhost:3000/api/signout', {
			method: 'POST',
			credentials: 'include',
		});
		setUser(null);
		navigate('/signin', { replace: true });
	}

	if (loading) {
		return (
			<div className="layout layout--center">
				<div>Loading session…</div>
			</div>
		);
	}

	return (
		<div className="layout">
			<aside className="layout__sidebar">
				<div className="layout__brand">
					<span className="layout__logo" aria-hidden>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
						</svg>
					</span>
					<span>Vacation Portal</span>
				</div>
				<nav className="layout__nav">
					<div className="nav__group">
						<button className="nav__groupHeader" onClick={() => setOpenGeneral((v) => !v)}>
							<span>General</span>
							<svg className={`chev ${openGeneral ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M8.12 9.29L12 13.17l3.88-3.88L17.29 10.7 12 16l-5.29-5.29 1.41-1.42z" fill="currentColor"/>
							</svg>
						</button>
						{openGeneral && (
						<ul className="nav__menu">
							{user ? (
								<li>
									<button className="button" onClick={handleSignOut}>
										Sign out
									</button>
								</li>
							) : (
								<li>
									<NavLink to="/signin" className={({ isActive }) => (isActive ? 'active' : undefined)}>
										<span className="nav__icon" aria-hidden>
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M10 17l5-5-5-5v3H3v4h7v3z" fill="currentColor"/>
											</svg>
										</span>
										Sign in
									</NavLink>
								</li>
							)}
						</ul>
						)}
					</div>
					{user?.role === 'manager' ? (
					<div className="nav__group">
						<button className="nav__groupHeader" onClick={() => setOpenManager((v) => !v)}>
							<span>Manager</span>
							<svg className={`chev ${openManager ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M8.12 9.29L12 13.17l3.88-3.88L17.29 10.7 12 16l-5.29-5.29 1.41-1.42z" fill="currentColor"/>
							</svg>
						</button>
						{openManager && (
						<ul className="nav__menu">
							<li>
								<NavLink
									to={{ pathname: '/app/manager/users', search: '?view=directory' }}
									className={() => (location.pathname === '/app/manager/users' && managerView === 'directory' ? 'active' : undefined)}
								>
									<span className="nav__icon" aria-hidden>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V20h6v-3.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
									</svg>
								</span>
								Team directory
							</NavLink>
							</li>
							<li>
								<NavLink
									to={{ pathname: '/app/manager/users', search: '?view=create' }}
									className={() => (location.pathname === '/app/manager/users' && managerView === 'create' ? 'active' : undefined)}
								>
									<span className="nav__icon" aria-hidden>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
									</svg>
								</span>
								Create user
							</NavLink>
							</li>
							<li>
								<NavLink
									to={{ pathname: '/app/manager/users', search: '?view=profile' }}
									className={() => (location.pathname === '/app/manager/users' && managerView === 'profile' ? 'active' : undefined)}
								>
									<span className="nav__icon" aria-hidden>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
									</svg>
								</span>
								My profile
							</NavLink>
						</li>
						<li>
							<NavLink to="/app/manager/requests" className={({ isActive }) => (isActive ? 'active' : undefined)}>
								<span className="nav__icon" aria-hidden>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M19 3H5c-1.1 0-2 .9-2 2v14l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="currentColor"/>
										</svg>
									</span>
									Requests
								</NavLink>
							</li>
						</ul>
						)}
						</div>
					) : null}
					{user?.role === 'employee' ? (
					<div className="nav__group">
						<button className="nav__groupHeader" onClick={() => setOpenEmployee((v) => !v)}>
							<span>Employee</span>
							<svg className={`chev ${openEmployee ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M8.12 9.29L12 13.17l3.88-3.88L17.29 10.7 12 16l-5.29-5.29 1.41-1.42z" fill="currentColor"/>
							</svg>
						</button>
						{openEmployee && (
						<ul className="nav__menu">
							<li>
								<NavLink to="/app/employee/requests" className={({ isActive }) => (isActive ? 'active' : undefined)}>
									<span className="nav__icon" aria-hidden>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h12v2H3v-2z" fill="currentColor"/>
										</svg>
									</span>
									My Requests
								</NavLink>
							</li>
							<li>
								<NavLink to="/app/employee/profile" className={({ isActive }) => (isActive ? 'active' : undefined)}>
									<span className="nav__icon" aria-hidden>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
										</svg>
									</span>
									My profile
								</NavLink>
							</li>
							<li>
								<NavLink to="/app/employee/requests/new" className={({ isActive }) => (isActive ? 'active' : undefined)}>
									<span className="nav__icon" aria-hidden>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
										</svg>
									</span>
									New Request
								</NavLink>
							</li>
						</ul>
						)}
						</div>
					) : null}
				</nav>
				<div className="layout__footer">Epignosis Assessment</div>
			</aside>
			<div className="layout__content">
				<main className="app__main">
					{error ? <div className="auth__error">{error}</div> : null}
					<Outlet />
				</main>
			</div>
		</div>
	);
}


