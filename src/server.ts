import express, { Request, Response, NextFunction } from 'express';
import xss from 'xss';
import bcrypt from 'bcryptjs';
import bodyParser from 'body-parser';
import mongoose, { Document, Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { doubleCsrf } from 'csrf-csrf';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import multer from 'multer';

dotenv.config();

// Fail fast if required secrets are missing in production
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('WARNING: JWT_SECRET is not set. Using insecure default — set JWT_SECRET in production.');
}
const JWT_SECRET = jwtSecret || 'insecure-dev-secret-do-not-use-in-production';

const csrfSecret = process.env.CSRF_SECRET;
if (!csrfSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CSRF_SECRET environment variable is required in production');
  }
  console.warn('WARNING: CSRF_SECRET is not set. Using insecure default — set CSRF_SECRET in production.');
}
const CSRF_SECRET = csrfSecret || 'insecure-dev-csrf-secret-do-not-use-in-production';
const isTest = process.env.NODE_ENV === 'test';

// Types
interface IEntry extends Document {
  name: string;
  from: string;
  comments: string;
  date: Date;
  photo?: string;
  checkIn: Date;
  checkOut: Date;
  duration?: number;
  isRepeatGuest: boolean;
}

interface AuthRequest extends Request {
  user?: { username: string };
}

interface MonthOccupancy {
  month: string;
  bookedDays: number;
  daysInMonth: number;
  occupancyRate: number;
}

// MongoDB Setup
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/guestbook';
if (!isTest) {
  mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
}

// Schema Definition
const entrySchema = new Schema<IEntry>({
  name: { type: String, required: true },
  from: { type: String, required: true },
  comments: { type: String, required: true },
  date: { type: Date, default: Date.now },
  photo: { type: String },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  duration: { type: Number },
  isRepeatGuest: { type: Boolean, default: false }
});

// Add pre-save middleware to calculate duration
entrySchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const diffTime = Math.abs(this.checkOut.getTime() - this.checkIn.getTime());
    this.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  next();
});

const Entry = mongoose.model<IEntry>('Entry', entrySchema);

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const normalizeToUtcDate = (date: Date): Date => (
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
);

const getStayDuration = (entry: Pick<IEntry, 'duration' | 'checkIn' | 'checkOut'>): number => {
  if (typeof entry.duration === 'number' && entry.duration > 0) {
    return entry.duration;
  }

  const checkIn = normalizeToUtcDate(new Date(entry.checkIn));
  const checkOut = normalizeToUtcDate(new Date(entry.checkOut));
  const diff = Math.ceil((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);

  return Math.max(diff, 0);
};

const buildOccupancyByMonth = (entries: Pick<IEntry, 'checkIn' | 'checkOut'>[]): MonthOccupancy[] => {
  const monthDayMap = new Map<string, number>();

  entries.forEach((entry) => {
    const checkIn = normalizeToUtcDate(new Date(entry.checkIn));
    const checkOut = normalizeToUtcDate(new Date(entry.checkOut));

    if (checkOut <= checkIn) {
      return;
    }

    let currentMonth = new Date(Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), 1));

    while (currentMonth < checkOut) {
      const nextMonth = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + 1, 1));
      const overlapStart = checkIn > currentMonth ? checkIn : currentMonth;
      const overlapEnd = checkOut < nextMonth ? checkOut : nextMonth;
      const overlapDays = Math.max(
        0,
        Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / MS_PER_DAY)
      );

      if (overlapDays > 0) {
        const monthKey = `${currentMonth.getUTCFullYear()}-${String(currentMonth.getUTCMonth() + 1).padStart(2, '0')}`;
        monthDayMap.set(monthKey, (monthDayMap.get(monthKey) || 0) + overlapDays);
      }

      currentMonth = nextMonth;
    }
  });

  return Array.from(monthDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, bookedDays]) => {
      const [year, monthNumber] = month.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
      const occupancyRate = Number(((bookedDays / daysInMonth) * 100).toFixed(2));

      return { month, bookedDays, daysInMonth, occupancyRate };
    });
};

// Express Setup
const app = express();
const port = process.env.PORT || 3000;

const {
  invalidCsrfTokenError,
  generateCsrfToken,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  getSessionIdentifier: (req: Request) => `${req.ip}:${req.get('user-agent') ?? 'unknown'}`,
  cookieName: '__Host-airbnb-guest-book-csrf',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req: Request) => {
    const headerToken = req.headers['x-csrf-token'];

    if (typeof headerToken === 'string') {
      return headerToken;
    }

    if (Array.isArray(headerToken)) {
      return headerToken[0];
    }

    return typeof req.body?._csrf === 'string' ? req.body._csrf : '';
  }
});

// Middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.use(doubleCsrfProtection);

// Enhanced Input Sanitization
const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // XSS sanitization
        req.body[key] = xss(req.body[key].trim());
        
        // Remove any null bytes
        req.body[key] = req.body[key].replace(/\0/g, '');
        
        // Normalize unicode
        req.body[key] = req.body[key].normalize();
        
        // Remove control characters
        req.body[key] = req.body[key].replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        
        // Size limits
        if (key === 'name' && req.body[key].length > 50) {
          req.body[key] = req.body[key].substring(0, 50);
        }
        if (key === 'comments' && req.body[key].length > 1000) {
          req.body[key] = req.body[key].substring(0, 1000);
        }
      }
    });
  }
  next();
};

app.use(sanitizeInput);

// File upload storage configuration
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/uploads'),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File upload validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error('Invalid file type'), false);
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

const runBackup = (): void => {
  const backupDir = path.join(__dirname, '../backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.gz`;
  const filepath = path.join(backupDir, filename);

  execFile('mongodump', [`--uri=${mongoUri}`, `--archive=${filepath}`, '--gzip'], (error) => {
    if (error) {
      console.error('Backup failed:', error);
    } else {
      console.log(`Backup created successfully: ${filepath}`);
    }
  });
};

// Auth Middleware
const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded as { username: string };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Error Handler
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (err === invalidCsrfTokenError || err.message === invalidCsrfTokenError.message) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Routes
app.post('/api/entries', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, from, comments, photo, checkIn, checkOut, isRepeatGuest } = req.body;
    const entry = new Entry({ name, from, comments, photo, checkIn, checkOut, isRepeatGuest });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

app.get('/api/entries', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = await Entry.find().sort('-date');
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

app.get('/api/entries/export', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const entries = await Entry.find().sort('-date');
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const escapeCsv = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const headers = ['name', 'from', 'comments', 'checkIn', 'checkOut', 'duration', 'isRepeatGuest', 'date'];
      const rows = entries.map((entry) => [
        entry.name,
        entry.from,
        entry.comments,
        entry.checkIn ? new Date(entry.checkIn).toISOString().slice(0, 10) : '',
        entry.checkOut ? new Date(entry.checkOut).toISOString().slice(0, 10) : '',
        getStayDuration(entry),
        entry.isRepeatGuest,
        entry.date ? new Date(entry.date).toISOString() : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="guest-entries-${timestamp}.csv"`);
      res.send(csvContent);
      return;
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="guest-entries-${timestamp}.json"`);
      res.send(JSON.stringify(entries, null, 2));
      return;
    }

    res.status(400).json({ error: 'Invalid format. Use format=csv or format=json' });
  } catch (err) {
    next(err);
  }
});

// Search must be registered before the /:id routes to avoid being shadowed
app.get('/api/entries/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, startDate, endDate } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};

    if (query) {
      // Escape regex special characters to prevent regex injection
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter['$or'] = [
        { name: new RegExp(escapedQuery, 'i') },
        { from: new RegExp(escapedQuery, 'i') },
        { comments: new RegExp(escapedQuery, 'i') }
      ];
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter['$gte'] = new Date(startDate);
      if (endDate) dateFilter['$lte'] = new Date(endDate);
      filter['date'] = dateFilter;
    }

    const entries = await Entry.find(filter).sort('-date');
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/entries/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Entry.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.post('/api/entries/:id/photo', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    entry.photo = `/uploads/${req.file.filename}`;
    await entry.save();
    res.json({ message: 'Photo uploaded successfully' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (!process.env.HOST_PASSWORD) {
    res.status(500).json({ error: 'Host password not configured' });
    return;
  }

  if (username === 'host' && await bcrypt.compare(password, process.env.HOST_PASSWORD)) {
    const token = jwt.sign(
      { username }, 
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/csrf-token', (req: Request, res: Response) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
});

app.post('/api/backup', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    runBackup();
    res.json({ message: 'Backup initiated successfully' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/restore/:filename', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Sanitize filename: allow only alphanumeric, hyphens, underscores, and dots
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!filename || filename !== req.params.filename) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    const filepath = path.join(__dirname, '../backups', filename);
    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'Backup file not found' });
      return;
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/guestbook';

    // Use execFile to avoid shell injection — arguments are passed directly to the process
    execFile('mongorestore', [`--uri=${mongoUri}`, `--archive=${filepath}`, '--gzip'], (error) => {
      if (error) {
        next(error);
      } else {
        res.json({ message: 'Restore completed successfully' });
      }
    });

    app.get('/api/analytics/dashboard', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const entries = await Entry.find().sort('-date');
        const totalStays = entries.length;
        const totalGuests = totalStays;
        const repeatGuests = entries.filter((entry) => entry.isRepeatGuest).length;
        const repeatGuestRate = totalStays > 0 ? Number(((repeatGuests / totalStays) * 100).toFixed(2)) : 0;
        const totalBookedDays = entries.reduce((sum, entry) => sum + getStayDuration(entry), 0);
        const occupancyByMonth = buildOccupancyByMonth(entries);

        res.json({
          totalStays,
          totalGuests,
          repeatGuestRate,
          totalBookedDays,
          occupancyByMonth
        });
      } catch (err) {
        next(err);
      }
    });

    app.get('/api/analytics/statistics', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const entries = await Entry.find().sort('-date');
        const totalEntries = entries.length;
        const totalBookedDays = entries.reduce((sum, entry) => sum + getStayDuration(entry), 0);
        const averageStayDuration = totalEntries > 0 ? Number((totalBookedDays / totalEntries).toFixed(2)) : 0;

        const cityCounts = new Map<string, number>();
        entries.forEach((entry) => {
          const normalizedCity = entry.from.trim();
          if (!normalizedCity) {
            return;
          }
          cityCounts.set(normalizedCity, (cityCounts.get(normalizedCity) || 0) + 1);
        });

        const mostCommonOriginCities = Array.from(cityCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([city, count]) => ({ city, count }));

        res.json({
          averageStayDuration,
          totalBookedDays,
          mostCommonOriginCities
        });
      } catch (err) {
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
});

// Error handling middleware
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export { app, Entry };