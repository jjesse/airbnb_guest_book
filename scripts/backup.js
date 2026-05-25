"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backup = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const BACKUP_DIR = path_1.default.join(__dirname, '../backups');
if (!fs_1.default.existsSync(BACKUP_DIR)) {
    fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
}
const backup = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.gz`;
    const filepath = path_1.default.join(BACKUP_DIR, filename);
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/guestbook';
    // Use execFile to avoid shell injection — arguments are passed directly to the process
    (0, child_process_1.execFile)('mongodump', [`--uri=${mongoUri}`, `--archive=${filepath}`, '--gzip'], (error) => {
        if (error) {
            console.error('Backup failed:', error);
            return;
        }
        console.log(`Backup created successfully: ${filepath}`);
    });
};
exports.backup = backup;
if (require.main === module) {
    (0, exports.backup)();
}
