/**
 * Real API layer — all calls go to the Express backend.
 * This file keeps the same export shape as the old mockApi.ts
 * so every component works without changes.
 */
import api from './api';
import {
  User, Branch, Shipment, Notification,
  DeliveryUpdate, AuditLog, ShipmentStatus, UserRole,
} from '@/types';

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string, _role: UserRole) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data.data as { user: User; token: string };
  },
  verifyToken: async (_token: string) => {
    const res = await api.get('/auth/me');
    return res.data.data as User;
  },
};

// ── Shipments ─────────────────────────────────────────────────
export const shipmentApi = {
  getAll: async (filters?: Record<string, unknown>) => {
    const res = await api.get('/shipments', { params: filters });
    return res.data.data as Shipment[];
  },
  getForCustomer: async (userId: string) => {
    const res = await api.get('/shipments', { params: { senderId: userId } });
    return res.data.data as Shipment[];
  },
  getForBranch: async (branchId: string) => {
    const res = await api.get('/shipments', { params: { branchId } });
    return res.data.data as Shipment[];
  },
  getForPartner: async (partnerId: string) => {
    const res = await api.get('/shipments', { params: { partnerId } });
    return res.data.data as Shipment[];
  },
  getById: async (id: string) => {
    const res = await api.get(`/shipments/${id}`);
    return res.data.data as Shipment;
  },
  getByTrackingId: async (trackingId: string) => {
    const res = await api.get(`/shipments/track/${trackingId}`);
    return res.data.data as Shipment;
  },
  updateStatus: async (id: string, status: ShipmentStatus, note?: string) => {
    const res = await api.patch(`/shipments/${id}/status`, { status, note });
    return res.data.data as Shipment;
  },
  assignPartner: async (id: string, partnerId: string) => {
    const res = await api.patch(`/shipments/${id}/assign-partner`, { partnerId });
    return res.data.data as Shipment;
  },
  create: async (data: Partial<Shipment>) => {
    const res = await api.post('/shipments', data);
    return res.data.data as Shipment;
  },
};

// ── Users ─────────────────────────────────────────────────────
export const userApi = {
  getAll: async () => {
    const res = await api.get('/users');
    return res.data.data as User[];
  },
  getById: async (id: string) => {
    const res = await api.get(`/users/${id}`);
    return res.data.data as User;
  },
  create: async (user: Partial<User> & { password?: string }) => {
    const res = await api.post('/users', user);
    return res.data.data as User;
  },
  update: async (id: string, data: Partial<User>) => {
    const res = await api.put(`/users/${id}`, data);
    return res.data.data as User;
  },
  toggleActive: async (id: string) => {
    const res = await api.patch(`/users/${id}/toggle-active`);
    return res.data.data as User;
  },
  getDeliveryPartners: async (branchId?: string) => {
    const res = await api.get('/users/delivery-partners', { params: branchId ? { branchId } : {} });
    return res.data.data as User[];
  },
};

// ── Branches ──────────────────────────────────────────────────
export const branchApi = {
  getAll: async () => {
    const res = await api.get('/branches');
    return res.data.data as Branch[];
  },
  getById: async (id: string) => {
    const res = await api.get(`/branches/${id}`);
    return res.data.data as Branch;
  },
  create: async (branch: Partial<Branch>) => {
    const res = await api.post('/branches', branch);
    return res.data.data as Branch;
  },
  update: async (id: string, data: Partial<Branch>) => {
    const res = await api.put(`/branches/${id}`, data);
    return res.data.data as Branch;
  },
  toggleActive: async (id: string) => {
    const res = await api.patch(`/branches/${id}/toggle-active`);
    return res.data.data as Branch;
  },
  delete: async (id: string) => {
    await api.delete(`/branches/${id}`);
  },
};

// ── Notifications ─────────────────────────────────────────────
export const notificationApi = {
  getForUser: async (_userId: string) => {
    const res = await api.get('/notifications');
    return res.data.data as Notification[];
  },
  markAsRead: async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
  },
  markAllRead: async (_userId: string) => {
    await api.patch('/notifications/read-all');
  },
};

// ── Delivery ──────────────────────────────────────────────────
export const deliveryApi = {
  verifyOtp: async (shipmentId: string, otp: string): Promise<boolean> => {
    const res = await api.post('/delivery/verify-otp', { shipmentId, otp });
    return res.data.success as boolean;
  },
  updateDelivery: async (update: DeliveryUpdate) => {
    const res = await api.post('/delivery/update', update);
    return res.data.data as Shipment;
  },
  getMyDeliveries: async () => {
    const res = await api.get('/delivery/my-shipments');
    return res.data.data as Shipment[];
  },
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  getStats: async (branchId?: string) => {
    const res = await api.get('/dashboard/stats', { params: branchId ? { branchId } : {} });
    return res.data.data;
  },
  getChartData: async (branchId?: string) => {
    const [trendsRes, statusRes] = await Promise.all([
      api.get('/dashboard/trends', { params: branchId ? { branchId } : {} }),
      api.get('/dashboard/status-breakdown', { params: branchId ? { branchId } : {} }),
    ]);
    return {
      daily: trendsRes.data.data,
      statusBreakdown: statusRes.data.data,
    };
  },
  getBranchRevenue: async () => {
    const res = await api.get('/dashboard/branch-revenue');
    return res.data.data;
  },
  getTopPartners: async () => {
    const res = await api.get('/dashboard/top-partners');
    return res.data.data;
  },
  getLivePartners: async (branchId?: string) => {
    const res = await api.get('/dashboard/live-partners', { params: branchId ? { branchId } : {} });
    return res.data.data;
  },
};

// ── Audit ─────────────────────────────────────────────────────
export const auditApi = {
  getAll: async (filters?: Record<string, unknown>) => {
    const res = await api.get('/audit-logs', { params: filters });
    return res.data.data as AuditLog[];
  },
};

// ── Convenience namespace (keeps all component imports working) ─
export const mockApi = {
  // Shipments
  getShipments:            shipmentApi.getAll,
  getShipmentById:         shipmentApi.getById,
  getShipmentByTrackingId: shipmentApi.getByTrackingId,
  getShipmentsForCustomer: shipmentApi.getForCustomer,
  getShipmentsForBranch:   shipmentApi.getForBranch,
  getShipmentsForPartner:  shipmentApi.getForPartner,
  updateShipmentStatus:    shipmentApi.updateStatus,
  assignPartner:           shipmentApi.assignPartner,
  createShipment:          shipmentApi.create,
  // Users
  getUsers:            userApi.getAll,
  getUserById:         userApi.getById,
  createUser:          userApi.create,
  updateUser:          userApi.update,
  toggleUserActive:    userApi.toggleActive,
  getDeliveryPartners: userApi.getDeliveryPartners,
  // Branches
  getBranches:       branchApi.getAll,
  getBranchById:     branchApi.getById,
  createBranch:      branchApi.create,
  updateBranch:      branchApi.update,
  toggleBranchActive: branchApi.toggleActive,
  deleteBranch:      branchApi.delete,
  // Notifications
  getNotifications:        notificationApi.getForUser,
  markNotificationRead:    notificationApi.markAsRead,
  markAllNotificationsRead: notificationApi.markAllRead,
  // Delivery
  verifyOtp:      deliveryApi.verifyOtp,
  updateDelivery: deliveryApi.updateDelivery,
  // Dashboard
  getDashboardStats: dashboardApi.getStats,
  getBranchStats:    dashboardApi.getStats,
  getChartData:      dashboardApi.getChartData,
  getBranchCharts:   dashboardApi.getChartData,
  getBranchRevenue:  dashboardApi.getBranchRevenue,
  getTopPartners:    dashboardApi.getTopPartners,
  getLivePartners:   dashboardApi.getLivePartners,
  // Audit
  getAuditLogs: auditApi.getAll,
};
