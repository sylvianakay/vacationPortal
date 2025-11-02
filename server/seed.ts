import { pool, migrate } from './db';
import bcrypt from 'bcryptjs';

async function upsertUser(name: string, email: string, employeeCode: string, role: 'manager'|'employee', password: string) {
    const hash = bcrypt.hashSync(password, 10);
    await pool.query(
        `INSERT INTO users (name, email, employee_code, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name, employee_code=EXCLUDED.employee_code, password_hash=EXCLUDED.password_hash, role=EXCLUDED.role`,
        [name, email, employeeCode, hash, role]
    );
}

export async function seed() {
    await migrate();
    await upsertUser('Maggie Manager', 'maggie.manager@example.com', '1000001', 'manager', 'Password1!');
    await upsertUser('Ethan Employee', 'ethan.employee@example.com', '2000001', 'employee', 'Password1!');
}

// Execute when run directly (tsx/ESM friendly)
seed().then(() => {
    console.log('Seed complete.');
    process.exit(0);
}).catch((e) => {
    console.error(e);
    process.exit(1);
});

