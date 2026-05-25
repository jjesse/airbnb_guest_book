import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import request from 'supertest';

jest.setTimeout(30000);

describe('Guest Book API', () => {
  let app: Express;
  let Entry: {
    prototype: {
      save: () => Promise<unknown>;
    };
    find: (filter?: unknown) => {
      sort: (sortValue: string) => Promise<unknown[]>;
    };
  };
  let entries: Array<Record<string, unknown>> = [];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.CSRF_SECRET = 'test-csrf-secret';
    process.env.HOST_PASSWORD = await bcrypt.hash('test-password', 10);
    process.env.MONGODB_URI = 'mongodb://example.invalid/test';

    const serverModule = await import('../server');
    app = serverModule.app;
    Entry = serverModule.Entry;
  });

  beforeEach(() => {
    entries = [];

    jest.spyOn(Entry.prototype, 'save').mockImplementation(async function mockSave(this: { toObject: () => Record<string, unknown> }) {
      const savedEntry = this.toObject();
      entries.push(savedEntry);
      return this;
    });

    jest.spyOn(Entry, 'find').mockImplementation(() => ({
      sort: jest.fn().mockResolvedValue([...entries].reverse())
    }) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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
