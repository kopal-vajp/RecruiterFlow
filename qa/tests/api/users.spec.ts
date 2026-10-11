import { test, expect } from '@playwright/test';
import process from 'node:process';

test.describe('ReqRes API Tests', () => {
  const baseURL = 'https://reqres.in/api';
  
  // Fetch API key, skip tests dynamically if missing to prevent crashing
  const apiKey = process.env.REQRES_API_KEY;

  test.skip(!apiKey, 'REQRES_API_KEY not found in .env');

  test('get a user verifies status and data.email', async ({ request }) => {
    const response = await request.get(`${baseURL}/users/2`, {
      headers: { 'x-api-key': apiKey as string }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('email');
    expect(body.data.email).toBe('janet.weaver@reqres.in');
  });

  test('create a user verifies status and created name', async ({ request }) => {
    const response = await request.post(`${baseURL}/users`, {
      headers: { 'x-api-key': apiKey as string },
      data: {
        name: 'morpheus',
        job: 'leader'
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.name).toBe('morpheus');
  });

  test('bonus: get a non-existent user returns 404', async ({ request }) => {
    const response = await request.get(`${baseURL}/users/23`, {
      headers: { 'x-api-key': apiKey as string }
    });
    
    expect(response.status()).toBe(404);
  });
});
