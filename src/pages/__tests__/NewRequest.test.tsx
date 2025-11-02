import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NewRequest } from '../NewRequest';

const renderNewRequest = () => {
	return render(
		<MemoryRouter>
			<NewRequest />
		</MemoryRouter>
	);
};

describe('NewRequest', () => {
	beforeEach(() => {
		vi.spyOn(window, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({}),
		} as Response);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('validates missing dates', async () => {
		renderNewRequest();
		fireEvent.click(screen.getByRole('button', { name: /submit request/i }));
		expect(await screen.findByText(/please select both start and end dates/i)).toBeInTheDocument();
	});

	it('requires end date after start date', async () => {
		renderNewRequest();
		const today = new Date().toISOString().slice(0, 10);
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: today } });
		fireEvent.change(screen.getByLabelText(/from/i), { target: { value: tomorrow } });
		fireEvent.click(screen.getByRole('button', { name: /submit request/i }));
		expect(await screen.findByText(/end date cannot be before start date/i)).toBeInTheDocument();
	});

	it('submits valid request', async () => {
		renderNewRequest();
		const today = new Date().toISOString().slice(0, 10);
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		fireEvent.change(screen.getByLabelText(/from/i), { target: { value: today } });
		fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: tomorrow } });
		fireEvent.click(screen.getByRole('button', { name: /submit request/i }));
		await waitFor(() => expect(window.fetch).toHaveBeenCalled());
	});
});
