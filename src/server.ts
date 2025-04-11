import express, { Request, Response, NextFunction } from 'express';
import xss from 'xss';
import bodyParser from 'body-parser';
import mongoose, { Document, Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import csrf from 'csurf';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import multer from 'multer';

dotenv.config();

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

// MongoDB Setup
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/guestbook';
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

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

// Express Setup
const app = express();
const port = process.env.PORT || 3000;

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

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

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

// Auth Middleware
const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded as { username: string };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Error Handler
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
};

// Enhanced error handling
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(error.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Routes
app.post('/api/entries', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, from, comments, photo } = req.body;
    const entry = new Entry({ name, from, comments, photo });
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

app.delete('/api/entries/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Entry.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.post('/api/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (!process.env.HOST_PASSWORD) {
    res.status(500).json({ error: 'Host password not configured' });
    return;
  }

  if (username === 'host' && password === process.env.HOST_PASSWORD) {
    const token = jwt.sign(
      { username }, 
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export { app };