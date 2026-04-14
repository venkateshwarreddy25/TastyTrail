import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LocationProvider } from './contexts/LocationContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import Kitchen from './pages/Kitchen';
import Orders from './pages/Orders';
import OrderHistory from './pages/OrderHistory';
import OrderTracking from './pages/OrderTracking';
import Reports from './pages/Reports';
import Feedback from './pages/Feedback';
import AIPrediction from './pages/AIPrediction';
import ItemDetail from './pages/ItemDetail';
import Favourites from './pages/Favourites';
import Profile from './pages/Profile';

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </main>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <PayPalScriptProvider options={{ clientId: "test", currency: "USD" }}>
        <LocationProvider>
          <CartProvider>
          <Router>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#ffffff', color: '#111827', border: '1px solid #fed7aa', boxShadow: '0 10px 25px rgba(252,128,25,0.15)', fontWeight: 600, padding: '12px 16px', borderRadius: '12px' },
                success: { iconTheme: { primary: '#fc8019', secondary: '#fff' } }
              }}
            />
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/dashboard" element={
                <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
              } />
              <Route path="/menu" element={
                <ProtectedRoute><Layout><Menu /></Layout></ProtectedRoute>
              } />
              <Route path="/item/:itemId" element={
                <ProtectedRoute><ItemDetail /></ProtectedRoute>
              } />
              <Route path="/kitchen" element={
                <ProtectedRoute allowedRoles={['restaurant_staff', 'restaurant_admin']}><Layout><Kitchen /></Layout></ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute allowedRoles={['customer', 'restaurant_admin']}><Layout><Orders /></Layout></ProtectedRoute>
              } />
              <Route path="/order-history" element={
                <ProtectedRoute allowedRoles={['customer']}><Layout><OrderHistory /></Layout></ProtectedRoute>
              } />
              <Route path="/order-tracking/:orderId" element={
                <ProtectedRoute><OrderTracking /></ProtectedRoute>
              } />
              <Route path="/favourites" element={
                <ProtectedRoute allowedRoles={['customer']}><Layout><Favourites /></Layout></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute allowedRoles={['restaurant_admin']}><Layout><Reports /></Layout></ProtectedRoute>
              } />
              <Route path="/feedback" element={
                <ProtectedRoute><Layout><Feedback /></Layout></ProtectedRoute>
              } />
              <Route path="/ai-prediction" element={
                <ProtectedRoute allowedRoles={['restaurant_staff', 'restaurant_admin']}><Layout><AIPrediction /></Layout></ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
          </CartProvider>
        </LocationProvider>
      </PayPalScriptProvider>
    </AuthProvider>
  );
}

export default App;
