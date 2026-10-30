-- ============================================================
-- Courier Management System — Seed Data
-- Run AFTER schema.sql
-- Passwords are all: password123  (bcrypt hash below)
-- ============================================================

USE courier_db;

-- ── Branches ─────────────────────────────────────────────────
INSERT INTO branches (id, name, code, address, city, state, lat, lng, is_active) VALUES
('branch-1', 'Downtown Hub',     'DTH', '123 Main St',    'Denver',   'CO', 39.7392, -104.9903, 1),
('branch-2', 'Lakewood Center',  'LKW', '456 Colfax Ave', 'Lakewood', 'CO', 39.7047, -105.0814, 1),
('branch-3', 'Aurora Station',   'AUR', '789 Havana St',  'Aurora',   'CO', 39.7294, -104.8319, 1);

-- ── Users (password = password123) ───────────────────────────
-- bcrypt hash for "password123" with 10 rounds
INSERT INTO users (id, name, email, phone, password_hash, role, branch_id, is_active) VALUES
('user-1', 'Daniel Cooper',  'customer@demo.com',       '+1-303-555-0101', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CUSTOMER',          NULL,       1),
('user-2', 'Sarah Chen',     'admin@demo.com',          '+1-555-0102',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN',             NULL,       1),
('user-3', 'Mike Johnson',   'staff@demo.com',          '+1-555-0103',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'BRANCH_STAFF',      'branch-1', 1),
('user-4', 'Jimmy Jordan',   'driver@demo.com',         '+1-555-0104',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'DELIVERY_PARTNER',  NULL,       1),
('user-5', 'Emily Davis',    'emily.customer@demo.com', '+1-555-0105',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CUSTOMER',          NULL,       1),
('user-6', 'Robert Wilson',  'driver2@demo.com',        '+1-555-0106',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'DELIVERY_PARTNER',  NULL,       1),
('user-7', 'Anna Taylor',    'staff2@demo.com',         '+1-555-0107',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'BRANCH_STAFF',      'branch-2', 1),
('user-8', 'James Anderson', 'driver3@demo.com',        '+1-555-0108',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'DELIVERY_PARTNER',  NULL,       1);

-- ── Shipments ────────────────────────────────────────────────
INSERT INTO shipments
  (id, tracking_id, package_name, sender_id, sender_name, sender_address, sender_phone,
   receiver_name, receiver_address, receiver_phone, status,
   branch_id, assigned_partner_id,
   booking_date, expected_delivery_date, delivered_date,
   delivery_otp, otp_attempts, current_lat, current_lng, estimated_revenue)
VALUES
('ship-1', 'V789456AR123', 'Apple 2022 MacBook Pro',
 'user-1', 'Daniel Cooper', '100 Sender St, Denver', '+1-303-555-0101',
 'Alice Smith', '200 Receiver Rd, Denver', '+1-555-0201',
 'OUT_FOR_DELIVERY', 'branch-1', 'user-4',
 DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY), NULL,
 '482916', 0, 39.74, -104.99, 150.00),

('ship-2', 'V789456AR124', 'iPhone 14 Pro Max (purple)',
 'user-5', 'Emily Davis', '300 Sender St, Lakewood', '+1-555-0105',
 'Bob Jones', '400 Receiver Rd, Lakewood', '+1-555-0202',
 'DELIVERED', 'branch-2', 'user-6',
 DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY),
 NULL, 0, NULL, NULL, 85.00),

('ship-3', 'V789456AR125', 'Premium Box Packing',
 'user-1', 'Daniel Cooper', '100 Sender St, Denver', '+1-303-555-0101',
 'Charlie Brown', '500 Receiver Rd, Aurora', '+1-555-0203',
 'IN_TRANSIT', 'branch-3', 'user-8',
 DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), NULL,
 NULL, 0, 39.73, -104.85, 45.00),

('ship-4', 'V789456AR126', 'Samsung Galaxy S24',
 'user-5', 'Emily Davis', '300 Sender St, Lakewood', '+1-555-0105',
 'Diana Prince', '600 Receiver Rd, Denver', '+1-555-0204',
 'BOOKED', 'branch-1', NULL,
 NOW(), DATE_ADD(NOW(), INTERVAL 4 DAY), NULL,
 NULL, 0, NULL, NULL, 120.00),

('ship-5', 'V789456AR127', 'Sony WH-1000XM5',
 'user-1', 'Daniel Cooper', '100 Sender St, Denver', '+1-303-555-0101',
 'Eve Adams', '700 Receiver Rd, Lakewood', '+1-555-0205',
 'FAILED_ATTEMPT', 'branch-2', 'user-6',
 DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), NULL,
 NULL, 0, NULL, NULL, 95.00),

('ship-6', 'V789456AR128', 'Generic Package 1',
 'user-1', 'Daniel Cooper', '100 Sender St, Denver', '+1-303-555-0101',
 'Receiver 6', '810 Receiver Rd, CO', '+1-555-0210',
 'DELIVERED', 'branch-1', 'user-4',
 DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY), NOW(),
 NULL, 0, NULL, NULL, 25.00),

('ship-7', 'V789456AR129', 'Generic Package 2',
 'user-1', 'Daniel Cooper', '100 Sender St, Denver', '+1-303-555-0101',
 'Receiver 7', '820 Receiver Rd, CO', '+1-555-0211',
 'IN_TRANSIT', 'branch-2', 'user-8',
 DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), NULL,
 NULL, 0, 39.71, -104.96, 35.00),

('ship-8', 'V789456AR130', 'Generic Package 3',
 'user-1', 'Daniel Cooper', '100 Sender St, Denver', '+1-303-555-0101',
 'Receiver 8', '830 Receiver Rd, CO', '+1-555-0212',
 'IN_TRANSIT', 'branch-3', 'user-4',
 DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY), NULL,
 NULL, 0, 39.72, -104.87, 45.00),

('ship-9', 'V789456AR131', 'Generic Package 4',
 'user-1', 'Daniel Cooper', '100 Sender St, Denver', '+1-303-555-0101',
 'Receiver 9', '840 Receiver Rd, CO', '+1-555-0213',
 'OUT_FOR_DELIVERY', 'branch-1', 'user-8',
 DATE_SUB(NOW(), INTERVAL 4 DAY), NOW(), NULL,
 '654321', 0, 39.75, -104.98, 55.00),

('ship-10','V789456AR132', 'Generic Package 5',
 'user-1', 'Daniel Cooper', '100 Sender St, Denver', '+1-303-555-0101',
 'Receiver 10','850 Receiver Rd, CO', '+1-555-0214',
 'AT_BRANCH', 'branch-2', NULL,
 DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), NULL,
 NULL, 0, NULL, NULL, 65.00);

-- ── Shipment Timeline ────────────────────────────────────────
-- ship-1
INSERT INTO shipment_timeline (id, shipment_id, status, timestamp, location, note) VALUES
('tl-1-1','ship-1','BOOKED',         DATE_SUB(NOW(),INTERVAL 3 DAY), 'Downtown Hub',  'Shipment booked'),
('tl-1-2','ship-1','PICKED_UP',      DATE_SUB(NOW(),INTERVAL 60 HOUR),'Sender Location','Package picked up from sender'),
('tl-1-3','ship-1','IN_TRANSIT',     DATE_SUB(NOW(),INTERVAL 48 HOUR),'En Route',      'In transit to branch'),
('tl-1-4','ship-1','AT_BRANCH',      DATE_SUB(NOW(),INTERVAL 36 HOUR),'Downtown Hub',  'Arrived at branch facility'),
('tl-1-5','ship-1','OUT_FOR_DELIVERY',DATE_SUB(NOW(),INTERVAL 6 HOUR), 'Denver',        'Out for delivery');

-- ship-2
INSERT INTO shipment_timeline (id, shipment_id, status, timestamp, location, note) VALUES
('tl-2-1','ship-2','BOOKED',         DATE_SUB(NOW(),INTERVAL 5 DAY), 'Lakewood Center','Shipment booked'),
('tl-2-2','ship-2','PICKED_UP',      DATE_SUB(NOW(),INTERVAL 108 HOUR),'Sender Location','Picked up'),
('tl-2-3','ship-2','IN_TRANSIT',     DATE_SUB(NOW(),INTERVAL 96 HOUR), 'En Route',      'In transit'),
('tl-2-4','ship-2','AT_BRANCH',      DATE_SUB(NOW(),INTERVAL 72 HOUR), 'Lakewood Center','At branch'),
('tl-2-5','ship-2','OUT_FOR_DELIVERY',DATE_SUB(NOW(),INTERVAL 30 HOUR),'Lakewood',      'Out for delivery'),
('tl-2-6','ship-2','DELIVERED',       DATE_SUB(NOW(),INTERVAL 1 DAY),  'Receiver Address','Delivered successfully');

-- ship-3
INSERT INTO shipment_timeline (id, shipment_id, status, timestamp, location, note) VALUES
('tl-3-1','ship-3','BOOKED',    DATE_SUB(NOW(),INTERVAL 2 DAY),  'Aurora Station','Shipment booked'),
('tl-3-2','ship-3','PICKED_UP', DATE_SUB(NOW(),INTERVAL 44 HOUR),'Sender Location','Picked up'),
('tl-3-3','ship-3','IN_TRANSIT',DATE_SUB(NOW(),INTERVAL 36 HOUR),'En Route',      'In transit');

-- ship-4
INSERT INTO shipment_timeline (id, shipment_id, status, timestamp, location, note) VALUES
('tl-4-1','ship-4','BOOKED', NOW(), 'Downtown Hub', 'Shipment booked');

-- ship-5
INSERT INTO shipment_timeline (id, shipment_id, status, timestamp, location, note) VALUES
('tl-5-1','ship-5','BOOKED',          DATE_SUB(NOW(),INTERVAL 4 DAY), 'Lakewood Center','Booked'),
('tl-5-2','ship-5','PICKED_UP',       DATE_SUB(NOW(),INTERVAL 84 HOUR),'Sender Location','Picked up'),
('tl-5-3','ship-5','IN_TRANSIT',      DATE_SUB(NOW(),INTERVAL 72 HOUR),'En Route',       'In transit'),
('tl-5-4','ship-5','AT_BRANCH',       DATE_SUB(NOW(),INTERVAL 48 HOUR),'Lakewood Center','At branch'),
('tl-5-5','ship-5','OUT_FOR_DELIVERY',DATE_SUB(NOW(),INTERVAL 30 HOUR),'Lakewood',       'Out for delivery'),
('tl-5-6','ship-5','FAILED_ATTEMPT',  DATE_SUB(NOW(),INTERVAL 6 HOUR), 'Receiver Address','Customer unavailable');

-- ship-6 through ship-10 basic timelines
INSERT INTO shipment_timeline (id, shipment_id, status, timestamp, note) VALUES
('tl-6-1','ship-6','BOOKED',    DATE_SUB(NOW(),INTERVAL 1 DAY), 'Booked'),
('tl-6-2','ship-6','PICKED_UP', DATE_SUB(NOW(),INTERVAL 20 HOUR),'Picked up'),
('tl-6-3','ship-6','IN_TRANSIT',DATE_SUB(NOW(),INTERVAL 16 HOUR),'In transit'),
('tl-6-4','ship-6','DELIVERED', NOW(),                           'Delivered'),
('tl-7-1','ship-7','BOOKED',    DATE_SUB(NOW(),INTERVAL 2 DAY), 'Booked'),
('tl-7-2','ship-7','PICKED_UP', DATE_SUB(NOW(),INTERVAL 44 HOUR),'Picked up'),
('tl-7-3','ship-7','IN_TRANSIT',DATE_SUB(NOW(),INTERVAL 36 HOUR),'In transit'),
('tl-8-1','ship-8','BOOKED',    DATE_SUB(NOW(),INTERVAL 3 DAY), 'Booked'),
('tl-8-2','ship-8','PICKED_UP', DATE_SUB(NOW(),INTERVAL 60 HOUR),'Picked up'),
('tl-8-3','ship-8','IN_TRANSIT',DATE_SUB(NOW(),INTERVAL 48 HOUR),'In transit'),
('tl-9-1','ship-9','BOOKED',    DATE_SUB(NOW(),INTERVAL 4 DAY), 'Booked'),
('tl-9-2','ship-9','PICKED_UP', DATE_SUB(NOW(),INTERVAL 84 HOUR),'Picked up'),
('tl-9-3','ship-9','IN_TRANSIT',DATE_SUB(NOW(),INTERVAL 72 HOUR),'In transit'),
('tl-9-4','ship-9','AT_BRANCH', DATE_SUB(NOW(),INTERVAL 48 HOUR),'At branch'),
('tl-9-5','ship-9','OUT_FOR_DELIVERY',DATE_SUB(NOW(),INTERVAL 8 HOUR),'Out for delivery'),
('tl-10-1','ship-10','BOOKED',   DATE_SUB(NOW(),INTERVAL 2 DAY), 'Booked'),
('tl-10-2','ship-10','PICKED_UP',DATE_SUB(NOW(),INTERVAL 44 HOUR),'Picked up'),
('tl-10-3','ship-10','IN_TRANSIT',DATE_SUB(NOW(),INTERVAL 36 HOUR),'In transit'),
('tl-10-4','ship-10','AT_BRANCH',DATE_SUB(NOW(),INTERVAL 20 HOUR),'At branch');

-- ── Notifications ────────────────────────────────────────────
INSERT INTO notifications (id, user_id, type, title, message, shipment_id, tracking_id, is_read) VALUES
('notif-1','user-1','STATUS_UPDATE', 'Package Delivered',    'Your package V789456AR124 has been delivered.',                           'ship-2','V789456AR124', 0),
('notif-2','user-1','OTP',           'Delivery OTP',         'Your OTP for V789456AR123 is 482916.',                                    'ship-1','V789456AR123', 0),
('notif-3','user-4','ASSIGNMENT',    'New Delivery Assigned','You have been assigned to deliver V789456AR123.',                         'ship-1','V789456AR123', 1),
('notif-4','user-1','DELIVERY_ATTEMPT','Delivery Failed',    'We attempted to deliver V789456AR127 but you were unavailable.',          'ship-5','V789456AR127', 1),
('notif-5','user-1','SYSTEM',        'System Maintenance',   'Scheduled maintenance on Oct 5, 2026 from 2:00 AM - 4:00 AM.',           NULL,  NULL,            0),
('notif-6','user-2','SYSTEM',        'New Shipment Booked',  'Shipment V789456AR126 has been booked and requires processing.',          'ship-4','V789456AR126', 0),
('notif-7','user-6','ASSIGNMENT',    'New Delivery Assigned','You have been assigned to deliver V789456AR127.',                         'ship-5','V789456AR127', 1),
('notif-8','user-4','ASSIGNMENT',    'New Delivery Assigned','You have been assigned to deliver V789456AR131.',                         'ship-9','V789456AR131', 0);

-- ── Audit Logs ───────────────────────────────────────────────
INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, timestamp) VALUES
('audit-1','user-2','STATUS_UPDATE', 'SHIPMENT','ship-1', 'Status changed to OUT_FOR_DELIVERY',    NOW()),
('audit-2','user-3','ASSIGNMENT',    'SHIPMENT','ship-1', 'Assigned delivery partner Jimmy Jordan', NOW()),
('audit-3','user-2','USER_CREATED',  'USER',    'user-5', 'Created customer Emily Davis',           DATE_SUB(NOW(),INTERVAL 1 DAY)),
('audit-4','user-2','BRANCH_UPDATED','BRANCH',  'branch-1','Updated Downtown Hub details',          DATE_SUB(NOW(),INTERVAL 2 DAY)),
('audit-5','user-2','STATUS_UPDATE', 'SHIPMENT','ship-2', 'Status changed to DELIVERED',            DATE_SUB(NOW(),INTERVAL 1 DAY)),
('audit-6','user-3','STATUS_UPDATE', 'SHIPMENT','ship-3', 'Status changed to IN_TRANSIT',           DATE_SUB(NOW(),INTERVAL 2 DAY)),
('audit-7','user-2','USER_UPDATED',  'USER',    'user-4', 'Updated delivery partner profile',       DATE_SUB(NOW(),INTERVAL 3 DAY)),
('audit-8','user-2','SHIPMENT_CREATED','SHIPMENT','ship-4','New shipment booked by Emily Davis',    NOW());
