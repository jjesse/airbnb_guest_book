const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs');
const { backup } = require('./scripts/backup');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authMiddleware = require('./middleware/auth');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/guestbook');

// Define Entry Schema
const EntrySchema = new mongoose.Schema({
    name: String,
    from: String,
    comments: String,
    date: { type: Date, default: Date.now },
    photo: String
});

const Entry = mongoose.model('Entry', EntrySchema);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(cookieParser());
app.use(limiter);
app.use(csrf({ cookie: true }));

// Configure multer for photo uploads
const storage = multer.diskStorage({
    destination: 'public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/submit', async (req, res) => {
    const entry = new Entry({
        name: req.body.name,
        from: req.body.from,
        comments: req.body.comments
    });
    await entry.save();
    await sendNotification(entry);
    res.redirect('/entries');
});

app.get('/entries', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'entries.html'));
});

app.get('/api/entries', async (req, res) => {
    const entries = await Entry.find().sort('-date');
    res.json(entries);
});

app.post('/api/backup', async (req, res) => {
    try {
        backup();
        res.json({ message: 'Backup initiated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Backup failed' });
    }
});

app.post('/api/restore/:filename', async (req, res) => {
    try {
        const filepath = path.join(__dirname, 'backups', req.params.filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Backup file not found' });
        }

        const cmd = `mongorestore --uri=${process.env.MONGODB_URI || 'mongodb://localhost:27017/guestbook'} --archive=${filepath} --gzip`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: 'Restore failed' });
            }
            res.json({ message: 'Restore completed successfully' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Restore failed' });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    // Demo credentials - should be in env variables
    if (username === 'host' && await bcrypt.compare(password, process.env.HOST_PASSWORD)) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });
        res.json({ message: 'Logged in successfully' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Protected delete route
app.delete('/api/entries/:id', authMiddleware, async (req, res) => {
    try {
        await Entry.findByIdAndDelete(req.params.id);
        res.json({ message: 'Entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

// Add CSRF token route
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Enhanced search and filter endpoint
app.get('/api/entries/search', async (req, res) => {
    const { query, startDate, endDate } = req.query;
    let filter = {};
    
    if (query) {
        filter.$or = [
            { name: new RegExp(query, 'i') },
            { from: new RegExp(query, 'i') },
            { comments: new RegExp(query, 'i') }
        ];
    }
    
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    const entries = await Entry.find(filter).sort('-date');
    res.json(entries);
});

// Photo upload route
app.post('/api/entries/:id/photo', upload.single('photo'), async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id);
        entry.photo = `/uploads/${req.file.filename}`;
        await entry.save();
        res.json({ message: 'Photo uploaded successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

// Email notification function
const sendNotification = async (entry) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.HOST_EMAIL,
        subject: 'New Guest Book Entry',
        text: `New entry from ${entry.name} from ${entry.from}: ${entry.comments}`
    });
};

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
