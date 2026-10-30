import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// ── DB file lives next to the running process ─────────────────
const DB_PATH = path.join(process.cwd(), 'courier.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

// ── Verify / initialise on startup ───────────────────────────
export async function connectDB(): Promise<void> {
  try {
    const db = getDb();
    // quick smoke-test
    db.prepare('SELECT 1').get();
    console.log('✅  SQLite connected →', DB_PATH);

    // Auto-run schema + seed if DB is brand new
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`)
      .get();

    if (!tables) {
      console.log('🔧  First run — initialising schema and seed data…');
      await initDb();
      console.log('✅  Database ready');
    }
  } catch (err) {
    console.error('❌  SQLite error:', err);
    process.exit(1);
  }
}

// ── Typed helpers (same API as the old mysql2 helpers) ────────
export function query<T = unknown>(sql: string, params: unknown[] = []): T[] {
  const db = getDb();
  return db.prepare(sql).all(...params) as T[];
}

export function queryOne<T = unknown>(sql: string, params: unknown[] = []): T | null {
  const db = getDb();
  return (db.prepare(sql).get(...params) as T) ?? null;
}

export function execute(sql: string, params: unknown[] = []): Database.RunResult {
  const db = getDb();
  return db.prepare(sql).run(...params);
}

// ── Schema + Seed (runs only once on first start) ─────────────
async function initDb(): Promise<void> {
  const db = getDb();

  db.exec(`
    -- ── Branches ──────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS branches (
      id         TEXT    NOT NULL PRIMARY KEY,
      name       TEXT    NOT NULL,
      code       TEXT    NOT NULL UNIQUE,
      address    TEXT    NOT NULL,
      city       TEXT    NOT NULL,
      state      TEXT    NOT NULL,
      lat        REAL    NOT NULL DEFAULT 0,
      lng        REAL    NOT NULL DEFAULT 0,
      manager_id TEXT,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Users ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT    NOT NULL PRIMARY KEY,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      phone         TEXT    NOT NULL,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'CUSTOMER',
      avatar        TEXT,
      branch_id     TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
    );

    -- ── Shipments ──────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS shipments (
      id                     TEXT    NOT NULL PRIMARY KEY,
      tracking_id            TEXT    NOT NULL UNIQUE,
      package_name           TEXT    NOT NULL,
      package_description    TEXT,
      package_weight         REAL,
      package_type           TEXT,
      sender_id              TEXT    NOT NULL,
      sender_name            TEXT    NOT NULL,
      sender_address         TEXT    NOT NULL,
      sender_phone           TEXT    NOT NULL,
      receiver_id            TEXT,
      receiver_name          TEXT    NOT NULL,
      receiver_address       TEXT    NOT NULL,
      receiver_phone         TEXT    NOT NULL,
      status                 TEXT    NOT NULL DEFAULT 'BOOKED',
      branch_id              TEXT    NOT NULL,
      assigned_partner_id    TEXT,
      booking_date           TEXT    NOT NULL DEFAULT (datetime('now')),
      expected_delivery_date TEXT    NOT NULL,
      delivered_date         TEXT,
      delivery_otp           TEXT,
      otp_attempts           INTEGER NOT NULL DEFAULT 0,
      current_lat            REAL,
      current_lng            REAL,
      estimated_revenue      REAL    NOT NULL DEFAULT 0,
      created_at             TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at             TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id)           REFERENCES users(id)    ON DELETE RESTRICT,
      FOREIGN KEY (branch_id)           REFERENCES branches(id) ON DELETE RESTRICT,
      FOREIGN KEY (assigned_partner_id) REFERENCES users(id)    ON DELETE SET NULL
    );

    -- ── Shipment Timeline ──────────────────────────────────────
    CREATE TABLE IF NOT EXISTS shipment_timeline (
      id          TEXT NOT NULL PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      status      TEXT NOT NULL,
      timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
      location    TEXT,
      note        TEXT,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
    );

    -- ── Notifications ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS notifications (
      id          TEXT    NOT NULL PRIMARY KEY,
      user_id     TEXT    NOT NULL,
      type        TEXT    NOT NULL,
      title       TEXT    NOT NULL,
      message     TEXT    NOT NULL,
      shipment_id TEXT,
      tracking_id TEXT,
      is_read     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL
    );

    -- ── Audit Logs ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          TEXT NOT NULL PRIMARY KEY,
      user_id     TEXT NOT NULL,
      action      TEXT NOT NULL,
      resource    TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      details     TEXT NOT NULL,
      ip_address  TEXT,
      timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- ── Indexes ────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_users_role       ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_branch     ON users(branch_id);
    CREATE INDEX IF NOT EXISTS idx_ship_status      ON shipments(status);
    CREATE INDEX IF NOT EXISTS idx_ship_branch      ON shipments(branch_id);
    CREATE INDEX IF NOT EXISTS idx_ship_sender      ON shipments(sender_id);
    CREATE INDEX IF NOT EXISTS idx_ship_partner     ON shipments(assigned_partner_id);
    CREATE INDEX IF NOT EXISTS idx_ship_tracking    ON shipments(tracking_id);
    CREATE INDEX IF NOT EXISTS idx_tl_shipment      ON shipment_timeline(shipment_id);
    CREATE INDEX IF NOT EXISTS idx_notif_user       ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_logs(user_id);
  `);

  // ── Seed data ────────────────────────────────────────────────
  // password hash = bcrypt("password123", 10)
  const HASH = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

  const seedBranches = db.prepare(`
    INSERT OR IGNORE INTO branches (id,name,code,address,city,state,lat,lng,is_active)
    VALUES (?,?,?,?,?,?,?,?,1)
  `);
  const seedUser = db.prepare(`
    INSERT OR IGNORE INTO users (id,name,email,phone,password_hash,role,branch_id,is_active)
    VALUES (?,?,?,?,?,?,?,1)
  `);
  const seedShipment = db.prepare(`
    INSERT OR IGNORE INTO shipments
      (id,tracking_id,package_name,sender_id,sender_name,sender_address,sender_phone,
       receiver_name,receiver_address,receiver_phone,status,branch_id,assigned_partner_id,
       booking_date,expected_delivery_date,delivered_date,delivery_otp,otp_attempts,
       current_lat,current_lng,estimated_revenue)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)
  `);
  const seedTimeline = db.prepare(`
    INSERT OR IGNORE INTO shipment_timeline (id,shipment_id,status,timestamp,location,note)
    VALUES (?,?,?,?,?,?)
  `);
  const seedNotif = db.prepare(`
    INSERT OR IGNORE INTO notifications (id,user_id,type,title,message,shipment_id,tracking_id,is_read)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  const seedAudit = db.prepare(`
    INSERT OR IGNORE INTO audit_logs (id,user_id,action,resource,resource_id,details,timestamp)
    VALUES (?,?,?,?,?,?,?)
  `);

  const now = new Date().toISOString();
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
  const hoursAgo = (n: number) => new Date(Date.now() - n * 3600000).toISOString();

  // Branches
  db.transaction(() => {
    seedBranches.run('branch-1','Downtown Hub','DTH','123 Main St','Denver','CO',39.7392,-104.9903);
    seedBranches.run('branch-2','Lakewood Center','LKW','456 Colfax Ave','Lakewood','CO',39.7047,-105.0814);
    seedBranches.run('branch-3','Aurora Station','AUR','789 Havana St','Aurora','CO',39.7294,-104.8319);

    // Users
    seedUser.run('user-1','Daniel Cooper','customer@demo.com','+1-303-555-0101',HASH,'CUSTOMER',null);
    seedUser.run('user-2','Sarah Chen','admin@demo.com','+1-555-0102',HASH,'ADMIN',null);
    seedUser.run('user-3','Mike Johnson','staff@demo.com','+1-555-0103',HASH,'BRANCH_STAFF','branch-1');
    seedUser.run('user-4','Jimmy Jordan','driver@demo.com','+1-555-0104',HASH,'DELIVERY_PARTNER',null);
    seedUser.run('user-5','Emily Davis','emily.customer@demo.com','+1-555-0105',HASH,'CUSTOMER',null);
    seedUser.run('user-6','Robert Wilson','driver2@demo.com','+1-555-0106',HASH,'DELIVERY_PARTNER',null);
    seedUser.run('user-7','Anna Taylor','staff2@demo.com','+1-555-0107',HASH,'BRANCH_STAFF','branch-2');
    seedUser.run('user-8','James Anderson','driver3@demo.com','+1-555-0108',HASH,'DELIVERY_PARTNER',null);

    // Shipments
    seedShipment.run('ship-1','V789456AR123','Apple 2022 MacBook Pro','user-1','Daniel Cooper','100 Sender St, Denver','+1-303-555-0101','Alice Smith','200 Receiver Rd, Denver','+1-555-0201','OUT_FOR_DELIVERY','branch-1','user-4',daysAgo(3),daysAhead(1),null,'482916',39.74,-104.99,150);
    seedShipment.run('ship-2','V789456AR124','iPhone 14 Pro Max','user-5','Emily Davis','300 Sender St, Lakewood','+1-555-0105','Bob Jones','400 Receiver Rd, Lakewood','+1-555-0202','DELIVERED','branch-2','user-6',daysAgo(5),daysAgo(1),daysAgo(1),null,null,null,85);
    seedShipment.run('ship-3','V789456AR125','Premium Box Packing','user-1','Daniel Cooper','100 Sender St, Denver','+1-303-555-0101','Charlie Brown','500 Receiver Rd, Aurora','+1-555-0203','IN_TRANSIT','branch-3','user-8',daysAgo(2),daysAhead(2),null,null,39.73,-104.85,45);
    seedShipment.run('ship-4','V789456AR126','Samsung Galaxy S24','user-5','Emily Davis','300 Sender St, Lakewood','+1-555-0105','Diana Prince','600 Receiver Rd, Denver','+1-555-0204','BOOKED','branch-1',null,now,daysAhead(4),null,null,null,null,120);
    seedShipment.run('ship-5','V789456AR127','Sony WH-1000XM5','user-1','Daniel Cooper','100 Sender St, Denver','+1-303-555-0101','Eve Adams','700 Receiver Rd, Lakewood','+1-555-0205','FAILED_ATTEMPT','branch-2','user-6',daysAgo(4),daysAgo(1),null,null,null,null,95);
    seedShipment.run('ship-6','V789456AR128','Generic Package 1','user-1','Daniel Cooper','100 Sender St, Denver','+1-303-555-0101','Receiver 6','810 Receiver Rd, CO','+1-555-0210','DELIVERED','branch-1','user-4',daysAgo(1),daysAhead(1),now,null,null,null,25);
    seedShipment.run('ship-7','V789456AR129','Generic Package 2','user-1','Daniel Cooper','100 Sender St, Denver','+1-303-555-0101','Receiver 7','820 Receiver Rd, CO','+1-555-0211','IN_TRANSIT','branch-2','user-8',daysAgo(2),daysAhead(2),null,null,39.71,-104.96,35);
    seedShipment.run('ship-8','V789456AR130','Generic Package 3','user-1','Daniel Cooper','100 Sender St, Denver','+1-303-555-0101','Receiver 8','830 Receiver Rd, CO','+1-555-0212','AT_BRANCH','branch-3','user-4',daysAgo(3),daysAhead(1),null,null,null,null,45);
    seedShipment.run('ship-9','V789456AR131','Generic Package 4','user-1','Daniel Cooper','100 Sender St, Denver','+1-303-555-0101','Receiver 9','840 Receiver Rd, CO','+1-555-0213','OUT_FOR_DELIVERY','branch-1','user-8',daysAgo(4),now,null,'654321',39.75,-104.98,55);
    seedShipment.run('ship-10','V789456AR132','Generic Package 5','user-1','Daniel Cooper','100 Sender St, Denver','+1-303-555-0101','Receiver 10','850 Receiver Rd, CO','+1-555-0214','AT_BRANCH','branch-2',null,daysAgo(2),daysAhead(3),null,null,null,null,65);

    // Timelines
    seedTimeline.run('tl-1-1','ship-1','BOOKED',daysAgo(3),'Downtown Hub','Shipment booked');
    seedTimeline.run('tl-1-2','ship-1','PICKED_UP',hoursAgo(60),'Sender Location','Picked up');
    seedTimeline.run('tl-1-3','ship-1','IN_TRANSIT',hoursAgo(48),'En Route','In transit');
    seedTimeline.run('tl-1-4','ship-1','AT_BRANCH',hoursAgo(36),'Downtown Hub','At branch');
    seedTimeline.run('tl-1-5','ship-1','OUT_FOR_DELIVERY',hoursAgo(6),'Denver','Out for delivery');
    seedTimeline.run('tl-2-1','ship-2','BOOKED',daysAgo(5),'Lakewood Center','Booked');
    seedTimeline.run('tl-2-2','ship-2','PICKED_UP',hoursAgo(108),'Sender Location','Picked up');
    seedTimeline.run('tl-2-3','ship-2','IN_TRANSIT',hoursAgo(96),'En Route','In transit');
    seedTimeline.run('tl-2-4','ship-2','AT_BRANCH',hoursAgo(72),'Lakewood Center','At branch');
    seedTimeline.run('tl-2-5','ship-2','OUT_FOR_DELIVERY',hoursAgo(30),'Lakewood','Out for delivery');
    seedTimeline.run('tl-2-6','ship-2','DELIVERED',daysAgo(1),'Receiver Address','Delivered');
    seedTimeline.run('tl-3-1','ship-3','BOOKED',daysAgo(2),'Aurora Station','Booked');
    seedTimeline.run('tl-3-2','ship-3','PICKED_UP',hoursAgo(44),'Sender Location','Picked up');
    seedTimeline.run('tl-3-3','ship-3','IN_TRANSIT',hoursAgo(36),'En Route','In transit');
    seedTimeline.run('tl-4-1','ship-4','BOOKED',now,'Downtown Hub','Shipment booked');
    seedTimeline.run('tl-5-1','ship-5','BOOKED',daysAgo(4),'Lakewood Center','Booked');
    seedTimeline.run('tl-5-2','ship-5','PICKED_UP',hoursAgo(84),'Sender Location','Picked up');
    seedTimeline.run('tl-5-3','ship-5','IN_TRANSIT',hoursAgo(72),'En Route','In transit');
    seedTimeline.run('tl-5-4','ship-5','AT_BRANCH',hoursAgo(48),'Lakewood Center','At branch');
    seedTimeline.run('tl-5-5','ship-5','OUT_FOR_DELIVERY',hoursAgo(30),'Lakewood','Out for delivery');
    seedTimeline.run('tl-5-6','ship-5','FAILED_ATTEMPT',hoursAgo(6),'Receiver Address','Customer unavailable');
    seedTimeline.run('tl-6-1','ship-6','BOOKED',daysAgo(1),null,'Booked');
    seedTimeline.run('tl-6-2','ship-6','DELIVERED',now,null,'Delivered');
    seedTimeline.run('tl-8-1','ship-8','BOOKED',daysAgo(3),null,'Booked');
    seedTimeline.run('tl-8-2','ship-8','AT_BRANCH',hoursAgo(20),null,'At branch');
    seedTimeline.run('tl-9-1','ship-9','BOOKED',daysAgo(4),null,'Booked');
    seedTimeline.run('tl-9-2','ship-9','OUT_FOR_DELIVERY',hoursAgo(8),null,'Out for delivery');

    // Notifications
    seedNotif.run('notif-1','user-1','STATUS_UPDATE','Package Delivered','Your package V789456AR124 has been delivered.','ship-2','V789456AR124',0);
    seedNotif.run('notif-2','user-1','OTP','Delivery OTP','Your OTP for V789456AR123 is 482916.','ship-1','V789456AR123',0);
    seedNotif.run('notif-3','user-4','ASSIGNMENT','New Delivery Assigned','You have been assigned to deliver V789456AR123.','ship-1','V789456AR123',1);
    seedNotif.run('notif-4','user-1','DELIVERY_ATTEMPT','Delivery Failed','We attempted to deliver V789456AR127 but you were unavailable.','ship-5','V789456AR127',1);
    seedNotif.run('notif-5','user-2','SYSTEM','System Maintenance','Scheduled maintenance window this weekend.',null,null,0);
    seedNotif.run('notif-6','user-4','ASSIGNMENT','New Delivery Assigned','You have been assigned to deliver V789456AR131.','ship-9','V789456AR131',0);

    // Audit logs
    seedAudit.run('audit-1','user-2','STATUS_UPDATE','SHIPMENT','ship-1','Status changed to OUT_FOR_DELIVERY',now);
    seedAudit.run('audit-2','user-3','ASSIGNMENT','SHIPMENT','ship-1','Assigned delivery partner Jimmy Jordan',now);
    seedAudit.run('audit-3','user-2','USER_CREATED','USER','user-5','Created customer Emily Davis',daysAgo(1));
    seedAudit.run('audit-4','user-2','BRANCH_UPDATED','BRANCH','branch-1','Updated Downtown Hub details',daysAgo(2));
    seedAudit.run('audit-5','user-2','STATUS_UPDATE','SHIPMENT','ship-2','Status changed to DELIVERED',daysAgo(1));
  })();
}
