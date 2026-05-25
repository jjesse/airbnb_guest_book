"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entry = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const xss_1 = __importDefault(require("xss"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const body_parser_1 = __importDefault(require("body-parser"));
const mongoose_1 = __importStar(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const csrf_csrf_1 = require("csrf-csrf");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const multer_1 = __importDefault(require("multer"));
dotenv_1.default.config();
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
// MongoDB Setup
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/guestbook';
if (!isTest) {
    mongoose_1.default.connect(mongoUri)
        .then(() => console.log('Connected to MongoDB'))
        .catch((err) => console.error('MongoDB connection error:', err));
}
// Schema Definition
const entrySchema = new mongoose_1.Schema({
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
entrySchema.pre('save', function (next) {
    if (this.checkIn && this.checkOut) {
        const diffTime = Math.abs(this.checkOut.getTime() - this.checkIn.getTime());
        this.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    next();
});
const Entry = mongoose_1.default.model('Entry', entrySchema);
exports.Entry = Entry;
// Express Setup
const app = (0, express_1.default)();
exports.app = app;
const port = process.env.PORT || 3000;
const { invalidCsrfTokenError, generateCsrfToken, doubleCsrfProtection } = (0, csrf_csrf_1.doubleCsrf)({
    getSecret: () => CSRF_SECRET,
    getSessionIdentifier: (req) => { var _a; return `${req.ip}:${(_a = req.get('user-agent')) !== null && _a !== void 0 ? _a : 'unknown'}`; },
    cookieName: '__Host-airbnb-guest-book-csrf',
    cookieOptions: {
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req) => {
        var _a;
        const headerToken = req.headers['x-csrf-token'];
        if (typeof headerToken === 'string') {
            return headerToken;
        }
        if (Array.isArray(headerToken)) {
            return headerToken[0];
        }
        return typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a._csrf) === 'string' ? req.body._csrf : '';
    }
});
// Middleware
app.use((0, cookie_parser_1.default)());
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use((0, helmet_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);
app.use(doubleCsrfProtection);
// Enhanced Input Sanitization
const sanitizeInput = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                // XSS sanitization
                req.body[key] = (0, xss_1.default)(req.body[key].trim());
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
const storage = multer_1.default.diskStorage({
    destination: path_1.default.join(__dirname, '../public/uploads'),
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
// File upload validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
        cb(new Error('Invalid file type'), false);
        return;
    }
    cb(null, true);
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});
const runBackup = () => {
    const backupDir = path_1.default.join(__dirname, '../backups');
    if (!fs_1.default.existsSync(backupDir)) {
        fs_1.default.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.gz`;
    const filepath = path_1.default.join(backupDir, filename);
    (0, child_process_1.execFile)('mongodump', [`--uri=${mongoUri}`, `--archive=${filepath}`, '--gzip'], (error) => {
        if (error) {
            console.error('Backup failed:', error);
        }
        else {
            console.log(`Backup created successfully: ${filepath}`);
        }
    });
};
// Auth Middleware
const authMiddleware = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
// Error Handler
const errorHandler = (err, req, res, next) => {
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
app.post('/api/entries', async (req, res, next) => {
    try {
        const { name, from, comments, photo, checkIn, checkOut, isRepeatGuest } = req.body;
        const entry = new Entry({ name, from, comments, photo, checkIn, checkOut, isRepeatGuest });
        await entry.save();
        res.status(201).json(entry);
    }
    catch (err) {
        next(err);
    }
});
app.get('/api/entries', async (req, res, next) => {
    try {
        const entries = await Entry.find().sort('-date');
        res.json(entries);
    }
    catch (err) {
        next(err);
    }
});
// Search must be registered before the /:id routes to avoid being shadowed
app.get('/api/entries/search', async (req, res, next) => {
    try {
        const { query, startDate, endDate } = req.query;
        const filter = {};
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
            const dateFilter = {};
            if (startDate)
                dateFilter['$gte'] = new Date(startDate);
            if (endDate)
                dateFilter['$lte'] = new Date(endDate);
            filter['date'] = dateFilter;
        }
        const entries = await Entry.find(filter).sort('-date');
        res.json(entries);
    }
    catch (err) {
        next(err);
    }
});
app.delete('/api/entries/:id', authMiddleware, async (req, res, next) => {
    try {
        await Entry.findByIdAndDelete(req.params.id);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
app.post('/api/entries/:id/photo', upload.single('photo'), async (req, res, next) => {
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
    }
    catch (err) {
        next(err);
    }
});
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!process.env.HOST_PASSWORD) {
        res.status(500).json({ error: 'Host password not configured' });
        return;
    }
    if (username === 'host' && await bcryptjs_1.default.compare(password, process.env.HOST_PASSWORD)) {
        const token = jsonwebtoken_1.default.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    }
    else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: generateCsrfToken(req, res) });
});
app.post('/api/backup', authMiddleware, async (req, res, next) => {
    try {
        runBackup();
        res.json({ message: 'Backup initiated successfully' });
    }
    catch (err) {
        next(err);
    }
});
app.post('/api/restore/:filename', authMiddleware, async (req, res, next) => {
    try {
        // Sanitize filename: allow only alphanumeric, hyphens, underscores, and dots
        const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
        if (!filename || filename !== req.params.filename) {
            res.status(400).json({ error: 'Invalid filename' });
            return;
        }
        const filepath = path_1.default.join(__dirname, '../backups', filename);
        if (!fs_1.default.existsSync(filepath)) {
            res.status(404).json({ error: 'Backup file not found' });
            return;
        }
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/guestbook';
        // Use execFile to avoid shell injection — arguments are passed directly to the process
        (0, child_process_1.execFile)('mongorestore', [`--uri=${mongoUri}`, `--archive=${filepath}`, '--gzip'], (error) => {
            if (error) {
                next(error);
            }
            else {
                res.json({ message: 'Restore completed successfully' });
            }
        });
    }
    catch (err) {
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
