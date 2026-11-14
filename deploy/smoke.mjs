// Local demo only. Exercises a real MySQL-backed login and read path.
import assert from 'node:assert/strict';
const base = process.env.CABINET_URL || 'http://localhost:18082';
async function request(path, options = {}) {
  return fetch(base + path, { ...options, signal: AbortSignal.timeout(10000) });
}
assert.equal((await request('/')).status, 200);
assert.equal((await request('/healthz')).status, 200);
assert.equal((await request('/api/users')).status, 401);
const login = await request('/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({email: 'admin@cabinet.fr', password: 'admin123'})
});
assert.equal(login.status, 200);
const { token, user } = await login.json();
assert.equal(user.role, 'admin');
const appointments = await request('/api/appointments', {headers: {Authorization: `Bearer ${token}`}});
assert.equal(appointments.status, 200);
assert.ok(Array.isArray(await appointments.json()));
const testEmail = `test-${Date.now()}@example.invalid`;
const registration = await request('/api/users', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({email: testEmail, password: 'test-password-123',
    firstName: 'Demo', lastName: 'Docker', dateOfBirth: '1990-01-01',
    allergies: ['pollen'], role: 'patient'})
});
assert.equal(registration.status, 201, await registration.text());
const patientLogin = await request('/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({email: testEmail, password: 'test-password-123'})
});
assert.equal(patientLogin.status, 200);
const escalation = await request('/api/users', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({email: `admin-${Date.now()}@example.invalid`, password: 'test-password-123',
    firstName: 'Demo', lastName: 'Docker', role: 'admin'})
});
assert.equal(escalation.status, 403);
console.log('PASS frontend, MySQL, demo login, appointments, patient registration/login, admin registration denied');
