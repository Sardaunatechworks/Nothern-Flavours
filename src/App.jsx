import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BasketProvider } from './context/BasketContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BasketProvider>
          <AppRoutes />
        </BasketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
