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

  const getAuthToken = async (): Promise<string> => {
    const { csrfToken, cookies } = await getCsrfContext();
    const loginResponse = await request(app)
      .post('/api/login')
      .set('Cookie', cookies)
      .send({
        username: 'host',
        password: 'test-password',
        _csrf: csrfToken
      });

    return loginResponse.body.token;
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

  it('should return analytics dashboard data for authenticated host', async () => {
    entries = [
      {
        name: 'Repeat Guest',
        from: 'Austin',
        comments: 'Great stay',
        checkIn: '2030-01-29',
        checkOut: '2030-02-02',
        duration: 4,
        isRepeatGuest: true,
        date: '2030-02-02'
      },
      {
        name: 'New Guest',
        from: 'Seattle',
        comments: 'Loved it',
        checkIn: '2030-02-10',
        checkOut: '2030-02-13',
        duration: 3,
        isRepeatGuest: false,
        date: '2030-02-13'
      }
    ];

    const token = await getAuthToken();
    const response = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `******;

    expect(response.status).toBe(200);
    expect(response.body.totalStays).toBe(2);
    expect(response.body.totalGuests).toBe(2);
    expect(response.body.totalBookedDays).toBe(7);
    expect(response.body.repeatGuestRate).toBe(50);
    expect(response.body.occupancyByMonth).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ month: '2030-01', bookedDays: 3 }),
        expect.objectContaining({ month: '2030-02', bookedDays: 4 })
      ])
    );
  });

  it('should return entry statistics for authenticated host', async () => {
    entries = [
      {
        name: 'Guest One',
        from: 'Austin',
        comments: 'Great stay',
        checkIn: '2030-03-01',
        checkOut: '2030-03-05',
        duration: 4,
        isRepeatGuest: false,
        date: '2030-03-05'
      },
      {
        name: 'Guest Two',
        from: 'Austin',
        comments: 'Amazing',
        checkIn: '2030-03-10',
        checkOut: '2030-03-12',
        duration: 2,
        isRepeatGuest: true,
        date: '2030-03-12'
      },
      {
        name: 'Guest Three',
        from: 'Denver',
        comments: 'Nice place',
        checkIn: '2030-03-20',
        checkOut: '2030-03-24',
        duration: 4,
        isRepeatGuest: false,
        date: '2030-03-24'
      }
    ];

    const token = await getAuthToken();
    const response = await request(app)
      .get('/api/analytics/statistics')
      .set('Authorization', `******;

    expect(response.status).toBe(200);
    expect(response.body.averageStayDuration).toBe(3.33);
    expect(response.body.totalBookedDays).toBe(10);
    expect(response.body.mostCommonOriginCities[0]).toEqual({ city: 'Austin', count: 2 });
  });

  it('should export entries as CSV for authenticated host', async () => {
    entries = [
      {
        name: 'CSV Guest',
        from: 'Portland',
        comments: 'Great',
        checkIn: '2030-04-01',
        checkOut: '2030-04-03',
        duration: 2,
        isRepeatGuest: false,
        date: '2030-04-03'
      }
    ];

    const token = await getAuthToken();
    const response = await request(app)
      .get('/api/entries/export?format=csv')
      .set('Authorization', `******;

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('name,from,comments,checkIn,checkOut,duration,isRepeatGuest,date');
    expect(response.text).toContain('"CSV Guest"');
  });

  it('should reject export without authentication', async () => {
    const response = await request(app).get('/api/entries/export?format=json');
    expect(response.status).toBe(401);
  });
});
