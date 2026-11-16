import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Public pages
import Home from '../pages/Home';
import OrderConfirmation from '../pages/OrderConfirmation';
import NotFound from '../pages/NotFound';

// Admin pages & layouts
import Login from '../pages/admin/Login';
import AdminLayout from '../admin/layouts/AdminLayout';
import Dashboard from '../admin/pages/Dashboard';
import Orders from '../admin/pages/Orders';
import Products from '../admin/pages/Products';
import Categories from '../admin/pages/Categories';
import Inventory from '../admin/pages/Inventory';
import Customers from '../admin/pages/Customers';
import Suppliers from '../admin/pages/Suppliers';
import Reports from '../admin/pages/Reports';
import Staff from '../admin/pages/Staff';
import Notifications from '../admin/pages/Notifications';
import ActivityLogs from '../admin/pages/ActivityLogs';
import Settings from '../admin/pages/Settings';
import DeliveryPricing from '../admin/pages/DeliveryPricing';

// Cashier & Point of Sale module
import CashierLayout from '../admin/cashier/layouts/CashierLayout';
import PointOfSale from '../admin/cashier/pages/PointOfSale';
import OrdersPayments from '../admin/cashier/pages/OrdersPayments';
import Transactions from '../admin/cashier/pages/Transactions';
import Receipts from '../admin/cashier/pages/Receipts';

// Route guard
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Customer Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />

      {/* Admin Auth Route */}
      <Route path="/admin/login" element={<Login />} />

      {/* Admin Management Dashboard Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'manager', 'order_manager', 'inventory_manager', 'staff']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="orders"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'manager', 'order_manager', 'staff']}>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="products"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'manager', 'inventory_manager']}>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="categories"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'manager']}>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'manager', 'inventory_manager']}>
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="customers"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'manager', 'order_manager']}>
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="suppliers"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'manager', 'inventory_manager']}>
              <Suppliers />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'manager']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <Staff />
            </ProtectedRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'manager', 'order_manager', 'inventory_manager', 'staff']}>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="activity-logs"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'manager']}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="delivery"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'manager']}>
              <DeliveryPricing />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'manager']}>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Cashier & POS Dedicated Workspace Routes */}
      <Route
        path="/admin/cashier"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'manager', 'cashier']}>
            <CashierLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PointOfSale />} />
        <Route path="pos" element={<PointOfSale />} />
        <Route path="orders" element={<OrdersPayments />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="receipts" element={<Receipts />} />
      </Route>

      {/* 404 & Fallback */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

