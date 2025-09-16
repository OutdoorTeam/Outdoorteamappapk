import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { target: 20, duration: '2m' },
        { target: 50, duration: '3m' },
        { target: 0, duration: '1m' }
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001';

export default function () {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, {
    email: __ENV.LOAD_USER_EMAIL,
    password: __ENV.LOAD_USER_PASSWORD,
  });

  check(loginRes, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  if (loginRes.status === 200) {
    const token = loginRes.json('token');
    const meRes = http.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    check(meRes, { 'me 200': (r) => r.status === 200 });
  }

  sleep(1);
}
