# Vacation Portal

Streamlined vacation management platform. Managers administer accounts and requests, while employees submit and track their vacations entirely online.

---

## Table of Contents
- [Developer Assignment Purpose](#developer-assignment-purpose)
- [Key Features](#key-features)
- [Technologies Used](#technologies-used)
- [Database Design](#database-design)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Running the Stack](#running-the-stack)
- [Testing](#testing)
- [Seed Accounts](#seed-accounts)
- [Security Practices](#security-practices)
- [Future Enhancements](#future-enhancements)

---

## Developer Assignment Purpose
The fictional brief describes a company whose rapid growth has outpaced paper-based vacation processes. The portal must let employees submit requests online and allow managers to approve or reject them. The scenarios provided in the brief include:

- Managers signing in, viewing, creating, updating (including passwords), and deleting users
- Managers reviewing submitted vacation requests and approving or rejecting them
- Employees signing in, viewing all of their requests, creating new requests with date ranges and reasons, and withdrawing pending ones

This solution fulfils those scenarios end to end and documents everything required for another engineer to review the work quickly.

---

## Key Features
- **Manager Journey**
  - Dashboard listing all users with status of pending updates
  - Create, edit (including pending email/password approvals), and delete users
  - Review vacation requests and approve or reject submissions
- **Employee Journey**
  - Dashboard listing personal requests with statuses and metadata
  - Submit new vacation requests with validation on date ranges and reasons
  - Withdraw pending requests and respond to manager-initiated account changes
- **Authentication**
  - Email/password sign-in backed by JWT stored in an HttpOnly cookie
  - Passwords hashed with `bcryptjs`; pending password approvals store hashes only
- **Security & Validation**
  - Server-side input validation for users and requests
  - Role-based access controls on protected routes
  - Sensitive configuration managed via environment variables

---

## Technologies Used
- **Frontend**: React 18 + Vite + TypeScript, React Router for flow orchestration, custom CSS design system in `src/styles.css`
- **Backend**: Node.js (native `http` module) with modular handlers, JWT authentication, PostgreSQL access through `pg`
- **Database**: PostgreSQL schema created via `server/db.ts` migrations, includes users, requests, and pending update tables
- **Tooling**: Vitest + React Testing Library for unit/UI tests, ESLint + Prettier for static analysis, `tsx` for TypeScript execution on the server

Project layout:
```text
server/          # auth, user, and request handlers plus database utilities
src/             # React app (pages, components, styles)
dist/            # Production build output (generated)
vacation_portal.db # SQLite fallback (optional, not default)
```

---

## Database Design
- **users** — core entity storing profile data (`name`, `email`, `employee_code`, `role`) with `bcrypt` password hashes. `employee_code` is unique and constrained to 7 digits to meet the brief.
- **vacation_requests** — captures employee submissions with foreign key to `users.id`, start/end dates, optional reason, status enum (`pending`, `approved`, `rejected`), timestamps for auditing, and manager responder metadata.
- **pending_password_updates** & **pending_email_updates** — queue tables tracking manager-initiated changes that require employee/manager approval. Each row references both the target user and the manager who initiated the change, with `created_at`/`decided_at` columns for flow history.

The schema enforces referential integrity between managers, employees, and their requests, while the pending tables model the approval workflow described in the assignment. Indexes on foreign keys and status columns (via migrations) support the UI’s filtered queries without resorting to joins over unstructured data.

---

## Setup Instructions
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create PostgreSQL database** (optional if using an existing instance)
   ```bash
   createdb vacation_portal
   ```
3. **Configure environment variables** in `.env`
   ```bash
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/vacation_portal
   JWT_SECRET=replace-with-strong-secret
   ```

---

## Running the Stack
- **Apply migrations and seed demo data**
  ```bash
  npm run db:seed
  ```
  Executes schema creation and inserts a sample manager and employee.

- **Start backend server**
  ```bash
  npm run server:dev
  ```
  Runs the HTTP server on `http://localhost:3000` using native Node APIs.

- **Start frontend dev server**
  ```bash
  npm run dev
  ```
  Launches Vite on `http://localhost:5173` with HMR.

- **Build production assets**
  ```bash
  npm run build
  ```

- **Preview production bundle**
  ```bash
  npm run preview
  ```

---

## Testing
- **Run full test suite** (covers server handlers, React screens, and utility helpers)
  ```bash
  npm run test
  ```

- **Coverage report**
  ```bash
  npm run test:coverage
  ```

---

## Seed Accounts
After `npm run db:seed`, sign in with:
- **Manager**: `maggie.manager@example.com` / `Password1!`
- **Employee**: `ethan.employee@example.com` / `Password1!`

---

## Security Practices
- Passwords stored as `bcrypt` hashes only; pending updates never persist plaintext
- JWT secret required via environment configuration
- Input validation guards common injection and malformed payloads
- Pending email updates tracked separately to prevent unauthorized changes

---

## Future Enhancements
- Expand automated tests (integration/e2e coverage)
- Add email notifications for approvals and rejections
- Harden rate limiting and monitoring for authentication endpoints
- Containerize stack for reproducible deployments (Docker Compose)

---

## Assignment Reference
The original brief (summarized) requested:
- Managers can sign in, manage users (create/update/delete), and approve/reject vacation requests
- Employees can sign in, submit, view, and withdraw pending vacation requests
- Authentication via username/password (no third-party auth)
- Relational database backing with seed data
- Clear documentation for setup and evaluation

This implementation delivers the above while emphasizing code quality, database design, secure handling of sensitive data, and a maintainable developer experience.

