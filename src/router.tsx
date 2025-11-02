import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SignIn } from './pages/SignIn';
import { SignInUserId } from './pages/SignInUserId';
import { ManagerUsers } from './pages/ManagerUsers';
import { ManagerRequests } from './pages/ManagerRequests';
import { ManagerEmployeeHistory } from './pages/ManagerEmployeeHistory';
import { EmployeeRequests } from './pages/EmployeeRequests';
import { EmployeeProfile } from './pages/EmployeeProfile';
import { NewRequest } from './pages/NewRequest';
import { Layout } from './components/Layout';

export const router = createBrowserRouter([
	{ path: '/', element: <Navigate to="/signin" replace /> },
	{ path: '/signin', element: <SignIn /> },
	{ path: '/signin/user-id', element: <SignInUserId /> },
	{
		path: '/app',
		element: <Layout />,
		children: [
			{ path: 'manager/users', element: <ManagerUsers /> },
			{ path: 'manager/requests', element: <ManagerRequests /> },
			{ path: 'manager/employee/:id/history', element: <ManagerEmployeeHistory /> },
			{ path: 'employee/requests', element: <EmployeeRequests /> },
			{ path: 'employee/profile', element: <EmployeeProfile /> },
			{ path: 'employee/requests/new', element: <NewRequest /> },
		],
	},
]);


