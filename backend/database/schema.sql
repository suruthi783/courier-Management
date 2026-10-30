-- ============================================================
-- Courier Management System — MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS courier_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE courier_db;

-- ── Branches ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id           VARCHAR(36)  NOT NULL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  code         VARCHAR(20)  NOT NULL UNIQUE,
  address      VARCHAR(255) NOT NULL,
  city         VARCHAR(100) NOT NULL,
  state        VARCHAR(100) NOT NULL,
  lat          DECIMAL(10,7) NOT NULL DEFAULT 0,
  lng          DECIMAL(10,7) NOT NULL DEFAULT 0,
  manager_id   VARCHAR(36)  NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(30)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('CUSTOMER','ADMIN','BRANCH_STAFF','DELIVERY_PARTNER') NOT NULL DEFAULT 'CUSTOMER',
  avatar        VARCHAR(500) NULL,
  branch_id     VARCHAR(36)  NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Back-fill branch manager FK now that users table exists
ALTER TABLE branches
  ADD CONSTRAINT fk_branches_manager
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- ── Shipments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
  id                     VARCHAR(36)   NOT NULL PRIMARY KEY,
  tracking_id            VARCHAR(50)   NOT NULL UNIQUE,
  package_name           VARCHAR(200)  NOT NULL,
  package_description    TEXT          NULL,
  package_weight         DECIMAL(8,2)  NULL,
  package_type           VARCHAR(50)   NULL,

  sender_id              VARCHAR(36)   NOT NULL,
  sender_name            VARCHAR(100)  NOT NULL,
  sender_address         VARCHAR(255)  NOT NULL,
  sender_phone           VARCHAR(30)   NOT NULL,

  receiver_id            VARCHAR(36)   NULL,
  receiver_name          VARCHAR(100)  NOT NULL,
  receiver_address       VARCHAR(255)  NOT NULL,
  receiver_phone         VARCHAR(30)   NOT NULL,

  status                 ENUM('BOOKED','PICKED_UP','IN_TRANSIT','AT_BRANCH',
                              'OUT_FOR_DELIVERY','DELIVERED','FAILED_ATTEMPT')
                         NOT NULL DEFAULT 'BOOKED',

  branch_id              VARCHAR(36)   NOT NULL,
  assigned_partner_id    VARCHAR(36)   NULL,

  booking_date           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expected_delivery_date DATETIME      NOT NULL,
  delivered_date         DATETIME      NULL,

  delivery_otp           VARCHAR(10)   NULL,
  otp_attempts           TINYINT       NOT NULL DEFAULT 0,

  current_lat            DECIMAL(10,7) NULL,
  current_lng            DECIMAL(10,7) NULL,

  estimated_revenue      DECIMAL(10,2) NOT NULL DEFAULT 0,

  created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_shipments_sender  FOREIGN KEY (sender_id)           REFERENCES users(id)    ON DELETE RESTRICT,
  CONSTRAINT fk_shipments_branch  FOREIGN KEY (branch_id)           REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_shipments_partner FOREIGN KEY (assigned_partner_id) REFERENCES users(id)    ON DELETE SET NULL
);

-- ── Shipment Timeline ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipment_timeline (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  shipment_id VARCHAR(36)  NOT NULL,
  status      ENUM('BOOKED','PICKED_UP','IN_TRANSIT','AT_BRANCH',
                   'OUT_FOR_DELIVERY','DELIVERED','FAILED_ATTEMPT') NOT NULL,
  timestamp   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  location    VARCHAR(255) NULL,
  note        TEXT         NULL,
  CONSTRAINT fk_timeline_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  type        ENUM('STATUS_UPDATE','DELIVERY_ATTEMPT','OTP','SYSTEM','ASSIGNMENT') NOT NULL,
  title       VARCHAR(200) NOT NULL,
  message     TEXT         NOT NULL,
  shipment_id VARCHAR(36)  NULL,
  tracking_id VARCHAR(50)  NULL,
  is_read     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  CONSTRAINT fk_notif_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL
);

-- ── Audit Logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  action      VARCHAR(100) NOT NULL,
  resource    VARCHAR(50)  NOT NULL,
  resource_id VARCHAR(36)  NOT NULL,
  details     TEXT         NOT NULL,
  ip_address  VARCHAR(45)  NULL,
  timestamp   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_users_role        ON users(role);
CREATE INDEX idx_users_branch      ON users(branch_id);
CREATE INDEX idx_users_email       ON users(email);

CREATE INDEX idx_shipments_status        ON shipments(status);
CREATE INDEX idx_shipments_branch        ON shipments(branch_id);
CREATE INDEX idx_shipments_sender        ON shipments(sender_id);
CREATE INDEX idx_shipments_partner       ON shipments(assigned_partner_id);
CREATE INDEX idx_shipments_tracking      ON shipments(tracking_id);
CREATE INDEX idx_shipments_booking_date  ON shipments(booking_date);

CREATE INDEX idx_timeline_shipment  ON shipment_timeline(shipment_id);
CREATE INDEX idx_timeline_timestamp ON shipment_timeline(timestamp);

CREATE INDEX idx_notif_user    ON notifications(user_id);
CREATE INDEX idx_notif_read    ON notifications(is_read);
CREATE INDEX idx_notif_created ON notifications(created_at);

CREATE INDEX idx_audit_user      ON audit_logs(user_id);
CREATE INDEX idx_audit_resource  ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
