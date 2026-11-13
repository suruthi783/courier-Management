import { createBrowserRouter, Navigate } from 'react-router';
import React, { Suspense } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/components/auth/LoginPage';
import { RegisterPage } from '@/components/auth/RegisterPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const lazyImport = (importPromise: Promise<any>) => 
  React.lazy(() => importPromise.then((m: any) => ({ default: m.default || Object.values(m)[0] })));

// Layouts
const CustomerLayout = lazyImport(import('@/layouts/CustomerLayout'));
const AdminLayout = lazyImport(import('@/layouts/AdminLayout'));
const BranchLayout = lazyImport(import('@/layouts/BranchLayout'));
const DeliveryLayout = lazyImport(import('@/layouts/DeliveryLayout'));

// Customer Pages
const CustomerDashboard = lazyImport(import('@/features/customer/CustomerDashboard'));
const MyShipments = lazyImport(import('@/features/customer/MyShipments'));
const ShipmentDetail = lazyImport(import('@/features/customer/ShipmentDetail'));
const LiveTrackingPage = lazyImport(import('@/features/customer/LiveTrackingPage'));
const NotificationHistory = lazyImport(import('@/features/customer/NotificationHistory'));

// Admin Pages
const AdminDashboard = lazyImport(import('@/features/admin/AdminDashboard'));
const AllShipments = lazyImport(import('@/features/admin/AllShipments'));
const UserManagement = lazyImport(import('@/features/admin/UserManagement'));
const BranchManagement = lazyImport(import('@/features/admin/BranchManagement'));
const GlobalTracking = lazyImport(import('@/features/admin/GlobalTracking'));
const AuditLog = lazyImport(import('@/features/admin/AuditLog'));

// Shared Pages
const ProfilePage = lazyImport(import('@/components/shared/ProfilePage'));

// Branch Pages
const BranchDashboard = lazyImport(import('@/features/branch/BranchDashboard'));
const BranchShipments = lazyImport(import('@/features/branch/BranchShipments'));
const BranchTracking = lazyImport(import('@/features/branch/BranchTracking'));

// Delivery Partner Pages
const DeliveryDashboard = lazyImport(import('@/features/delivery/DeliveryDashboard'));
const DeliveryStatusUpdate = lazyImport(import('@/features/delivery/DeliveryStatusUpdate'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    path: '/404',
    element: <NotFoundPage />,
  },
  
  // Customer Routes
  {
    path: '/customer',
    element: <ProtectedRoute allowedRoles={['CUSTOMER']} />,
    children: [
      {
        element: <Suspense fallback={<LoadingFallback />}><CustomerLayout /></Suspense>,
        children: [
          { index: true, element: <Suspense fallback={<LoadingFallback />}><CustomerDashboard /></Suspense> },
          { path: 'shipments', element: <Suspense fallback={<LoadingFallback />}><MyShipments /></Suspense> },
          { path: 'shipments/:id', element: <Suspense fallback={<LoadingFallback />}><ShipmentDetail /></Suspense> },
          { path: 'tracking/:trackingId', element: <Suspense fallback={<LoadingFallback />}><LiveTrackingPage /></Suspense> },
          { path: 'notifications', element: <Suspense fallback={<LoadingFallback />}><NotificationHistory /></Suspense> },
          { path: 'profile', element: <Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense> },
        ]
      }
    ]
  },

  // Admin Routes
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['ADMIN']} />,
    children: [
      {
        element: <Suspense fallback={<LoadingFallback />}><AdminLayout /></Suspense>,
        children: [
          { index: true, element: <Suspense fallback={<LoadingFallback />}><AdminDashboard /></Suspense> },
          { path: 'shipments', element: <Suspense fallback={<LoadingFallback />}><AllShipments /></Suspense> },
          { path: 'shipments/:id', element: <Suspense fallback={<LoadingFallback />}><ShipmentDetail /></Suspense> },
          { path: 'users', element: <Suspense fallback={<LoadingFallback />}><UserManagement /></Suspense> },
          { path: 'branches', element: <Suspense fallback={<LoadingFallback />}><BranchManagement /></Suspense> },
          { path: 'tracking', element: <Suspense fallback={<LoadingFallback />}><GlobalTracking /></Suspense> },
          { path: 'audit', element: <Suspense fallback={<LoadingFallback />}><AuditLog /></Suspense> },
          { path: 'notifications', element: <Suspense fallback={<LoadingFallback />}><NotificationHistory /></Suspense> },
          { path: 'profile', element: <Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense> },
        ]
      }
    ]
  },

  // Branch Routes
  {
    path: '/branch',
    element: <ProtectedRoute allowedRoles={['BRANCH_STAFF']} />,
    children: [
      {
        element: <Suspense fallback={<LoadingFallback />}><BranchLayout /></Suspense>,
        children: [
          { index: true, element: <Suspense fallback={<LoadingFallback />}><BranchDashboard /></Suspense> },
          { path: 'shipments', element: <Suspense fallback={<LoadingFallback />}><BranchShipments /></Suspense> },
          { path: 'shipments/:id', element: <Suspense fallback={<LoadingFallback />}><ShipmentDetail /></Suspense> },
          { path: 'tracking', element: <Suspense fallback={<LoadingFallback />}><BranchTracking /></Suspense> },
          { path: 'notifications', element: <Suspense fallback={<LoadingFallback />}><NotificationHistory /></Suspense> },
          { path: 'profile', element: <Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense> },
        ]
      }
    ]
  },

  // Delivery Partner Routes
  {
    path: '/delivery',
    element: <ProtectedRoute allowedRoles={['DELIVERY_PARTNER']} />,
    children: [
      {
        element: <Suspense fallback={<LoadingFallback />}><DeliveryLayout /></Suspense>,
        children: [
          { index: true, element: <Suspense fallback={<LoadingFallback />}><DeliveryDashboard /></Suspense> },
          { path: 'shipments/:id', element: <Suspense fallback={<LoadingFallback />}><ShipmentDetail /></Suspense> },
          { path: 'update/:id', element: <Suspense fallback={<LoadingFallback />}><DeliveryStatusUpdate /></Suspense> },
          { path: 'notifications', element: <Suspense fallback={<LoadingFallback />}><NotificationHistory /></Suspense> },
          { path: 'profile', element: <Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense> },
        ]
      }
    ]
  },

  // Catch-all
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  }
]);
