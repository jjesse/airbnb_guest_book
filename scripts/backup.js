const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.join(__dirname, '../backups');

if (!fs.existsSync(BACKUP_DIR)){
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const backup = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.gz`;
    const filepath = path.join(BACKUP_DIR, filename);

    const cmd = `mongodump --uri=${process.env.MONGODB_URI || 'mongodb://localhost:27017/guestbook'} --archive=${filepath} --gzip`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error('Backup failed:', error);
            return;
        }
        console.log(`Backup created successfully: ${filepath}`);
    });
};

if (require.main === module) {
    backup();
}

module.exports = { backup };
