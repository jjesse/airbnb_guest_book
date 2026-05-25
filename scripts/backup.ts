import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

const BACKUP_DIR = path.join(__dirname, '../backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export const backup = (): void => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/guestbook';

  // Use execFile to avoid shell injection — arguments are passed directly to the process
  execFile('mongodump', [`--uri=${mongoUri}`, `--archive=${filepath}`, '--gzip'], (error) => {
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
