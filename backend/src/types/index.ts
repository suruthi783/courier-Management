// ─── User & Auth ─────────────────────────────────────────────────────────────
export type UserRole = 'CUSTOMER' | 'ADMIN' | 'BRANCH_STAFF' | 'DELIVERY_PARTNER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  branch_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  branchId?: string;
  iat?: number;
  exp?: number;
}

// ─── Shipment ─────────────────────────────────────────────────────────────────
export type ShipmentStatus =
  | 'BOOKED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'AT_BRANCH'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_ATTEMPT';

export interface ShipmentTimeline {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  timestamp: string;
  location?: string;
  note?: string;
}

export interface Shipment {
  id: string;
  tracking_id: string;
  package_name: string;
  package_description?: string;
  package_weight?: number;
  package_type?: string;

  sender_id: string;
  sender_name: string;
  sender_address: string;
  sender_phone: string;

  receiver_id?: string;
  receiver_name: string;
  receiver_address: string;
  receiver_phone: string;

  status: ShipmentStatus;
  timeline?: ShipmentTimeline[];

  branch_id: string;
  branch_name?: string;
  assigned_partner_id?: string;
  assigned_partner_name?: string;

  booking_date: string;
  expected_delivery_date: string;
  delivered_date?: string;

  delivery_otp?: string;
  otp_attempts: number;

  current_lat?: number;
  current_lng?: number;

  estimated_revenue: number;
}

// ─── Branch ───────────────────────────────────────────────────────────────────
export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  manager_id?: string;
  is_active: boolean;
  created_at: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType = 'STATUS_UPDATE' | 'DELIVERY_ATTEMPT' | 'OTP' | 'SYSTEM' | 'ASSIGNMENT';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  shipment_id?: string;
  tracking_id?: string;
  is_read: boolean;
  created_at: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  resource: string;
  resource_id: string;
  details: string;
  ip_address?: string;
  timestamp: string;
}

// ─── Delivery ─────────────────────────────────────────────────────────────────
export type FailedReason =
  | 'CUSTOMER_UNAVAILABLE'
  | 'WRONG_ADDRESS'
  | 'REFUSED'
  | 'DAMAGED_PACKAGE'
  | 'OTHER';

export interface DeliveryUpdate {
  shipmentId: string;
  status: 'DELIVERED' | 'FAILED_ATTEMPT';
  otp?: string;
  failedReason?: FailedReason;
  note?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalShipments: number;
  delivered: number;
  pending: number;
  inTransit: number;
  outForDelivery: number;
  failedAttempts: number;
  activePartners: number;
  totalRevenue: number;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Express augmentation ─────────────────────────────────────────────────────
import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
