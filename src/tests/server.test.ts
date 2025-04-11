import request from 'supertest';
import { app } from '../server';

describe('Guest Book API', () => {
  it('should create a new entry', async () => {
    const response = await request(app)
      .post('/submit')
      .send({
        name: 'Test User',
        from: 'Test City',
        comments: 'Test Comment'
      });
    expect(response.status).toBe(302);
  });

  it('should prevent XSS in input', async () => {
    const response = await request(app)
      .post('/submit')
      .send({
        name: '<script>alert("xss")</script>',
        from: 'Test City',
        comments: 'Test Comment'
      });
    const entry = await request(app).get('/api/entries');
    expect(entry.body[0].name).not.toContain('<script>');
  });
});
