import request from 'supertest';
import { app } from '../server';

describe('Guest Book API', () => {
  const getCsrfContext = async () => {
    const response = await request(app).get('/api/csrf-token');

    return {
      csrfToken: response.body.csrfToken,
      cookies: response.headers['set-cookie']
    };
  };

  it('should create a new entry', async () => {
    const { csrfToken, cookies } = await getCsrfContext();

    const response = await request(app)
      .post('/api/entries')
      .set('Cookie', cookies)
      .send({
        name: 'Test User',
        from: 'Test City',
        comments: 'Test Comment',
        checkIn: '2030-01-01',
        checkOut: '2030-01-05',
        _csrf: csrfToken
      });
    expect(response.status).toBe(201);
  });

  it('should prevent XSS in input', async () => {
    const { csrfToken, cookies } = await getCsrfContext();

    await request(app)
      .post('/api/entries')
      .set('Cookie', cookies)
      .send({
        name: '<script>alert("xss")</script>',
        from: 'Test City',
        comments: 'Test Comment',
        checkIn: '2030-01-01',
        checkOut: '2030-01-05',
        _csrf: csrfToken
      });
    const entry = await request(app).get('/api/entries');
    expect(entry.body[0].name).not.toContain('<script>');
  });
});
