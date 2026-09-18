import { pbkdf2Sync, randomBytes } from 'node:crypto';
import readline from 'node:readline/promises';

const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
const hash = (value) => { const salt = randomBytes(16); return `${salt.toString('base64')}:${pbkdf2Sync(value, salt, 310_000, 32, 'sha256').toString('base64')}`; };

console.log('Enter the demo credentials. Inputs are used only to generate salted hashes and are not written to disk.');
const proj1 = await terminal.question('Proj 1 password: ');
const proj2 = await terminal.question('Proj 2 password: ');
const pin = await terminal.question('Admin PIN: ');
terminal.close();

const leads = { 'Proj 1': hash(proj1), 'Proj 2': hash(proj2) };
console.log('\nAdd these as encrypted Vercel Environment Variables:');
console.log(`LEAD_CREDENTIAL_HASHES_JSON=${JSON.stringify(leads)}`);
console.log(`ADMIN_PIN_HASH=${hash(pin)}`);
console.log(`SESSION_SECRET=${randomBytes(48).toString('base64url')}`);
