import request from 'supertest';
import { app } from '../server';

describe('Guest Book API', () => {
  it('should create a new entry', async () => {
    const response = await request(app)
      .post('/api/entries')
      .send({
        name: 'Test User',
        from: 'Test City',
        comments: 'Test Comment',
        checkIn: '2024-01-01',
        checkOut: '2024-01-05'
      });
    expect(response.status).toBe(201);
  });

  it('should prevent XSS in input', async () => {
    await request(app)
      .post('/api/entries')
      .send({
        name: '<script>alert("xss")</script>',
        from: 'Test City',
        comments: 'Test Comment',
        checkIn: '2024-01-01',
        checkOut: '2024-01-05'
      });
    const entry = await request(app).get('/api/entries');
    expect(entry.body[0].name).not.toContain('<script>');
  });
});
