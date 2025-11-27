import sqlite3 from "sqlite3";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { BinaryAsset } from "../schema.js";

export class SQLiteDB {
    private db: sqlite3.Database | null = null;
    private dbPath: string;
    private assetsPath: string;

    constructor(dbPath: string, assetsPath: string) {
        this.dbPath = dbPath;
        this.assetsPath = assetsPath;
    }

    async initialize(): Promise<void> {
        // Ensure directories exist
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        if (!fs.existsSync(this.assetsPath)) {
            fs.mkdirSync(this.assetsPath, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    private async createTables(): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        const createBinaryAssetsTable = `
            CREATE TABLE IF NOT EXISTS binary_assets (
                identifier TEXT PRIMARY KEY,
                file_path TEXT NOT NULL,
                type TEXT NOT NULL,
                source_ticket_uid TEXT NOT NULL,
                file_name TEXT,
                size INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createTicketsTable = `
            CREATE TABLE IF NOT EXISTS tickets (
                uid TEXT PRIMARY KEY,
                mask TEXT NOT NULL,
                subject TEXT NOT NULL,
                importance INTEGER,
                group_id INTEGER,
                bucket_id INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createMessagesTable = `
            CREATE TABLE IF NOT EXISTS messages (
                uid TEXT PRIMARY KEY,
                ticket_id TEXT NOT NULL,
                is_outgoing INTEGER,
                response_time INTEGER,
                hash_header_message_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(uid)
            )
        `;

        return new Promise((resolve, reject) => {
            this.db!.serialize(() => {
                this.db!.run(createBinaryAssetsTable);
                this.db!.run(createTicketsTable);
                this.db!.run(createMessagesTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    async saveBinaryAsset(asset: BinaryAsset): Promise<string> {
        if (!this.db) throw new Error("Database not initialized");

        // Save binary file to disk
        const fileName = asset.fileName || `${asset.identifier}.bin`;
        const filePath = path.join(this.assetsPath, fileName);
        fs.writeFileSync(filePath, asset.buffer);

        // Save metadata to database
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO binary_assets 
                (identifier, file_path, type, source_ticket_uid, file_name, size)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            this.db!.run(
                sql,
                [asset.identifier, filePath, asset.type, asset.sourceTicketUid, fileName, asset.buffer.length],
                (err) => {
                    if (err) reject(err);
                    else resolve(filePath);
                }
            );
        });
    }

    async getBinaryAsset(identifier: string): Promise<BinaryAsset | null> {
        if (!this.db) throw new Error("Database not initialized");

        return new Promise((resolve, reject) => {
            const sql = "SELECT * FROM binary_assets WHERE identifier = ?";
            this.db!.get(sql, [identifier], (err, row: any) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve(null);
                } else {
                    const buffer = fs.readFileSync(row.file_path);
                    resolve({
                        identifier: row.identifier,
                        buffer,
                        type: row.type,
                        sourceTicketUid: row.source_ticket_uid,
                        fileName: row.file_name,
                    });
                }
            });
        });
    }

    async saveTicketMetadata(ticket: any): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO tickets 
                (uid, mask, subject, importance, group_id, bucket_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            this.db!.run(
                sql,
                [ticket.uid, ticket.mask, ticket.subject, ticket.importance, ticket.group_id, ticket.bucket_id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async saveMessageMetadata(message: any): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO messages 
                (uid, ticket_id, is_outgoing, response_time, hash_header_message_id)
                VALUES (?, ?, ?, ?, ?)
            `;
            this.db!.run(
                sql,
                [
                    message.uid,
                    message.ticket_id,
                    message.is_outgoing,
                    message.response_time,
                    message.hash_header_message_id,
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async searchTicketsByKeyword(keyword: string): Promise<any[]> {
        if (!this.db) throw new Error("Database not initialized");

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM tickets 
                WHERE subject LIKE ? OR mask LIKE ?
                ORDER BY importance DESC
                LIMIT 10
            `;
            const pattern = `%${keyword}%`;
            this.db!.all(sql, [pattern, pattern], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async close(): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            this.db!.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}
