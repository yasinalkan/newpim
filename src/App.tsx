import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { LanguageProvider } from './contexts/LanguageContext';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import MainProductDetailPage from './pages/MainProductDetailPage';
import ProductFormPage from './pages/ProductFormPage';
import CategoriesPage from './pages/CategoriesPage';
import CategoryDetailPage from './pages/CategoryDetailPage';
import AttributesPage from './pages/AttributesPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ChannelsPage from './pages/ChannelsPage';
import ChannelFormPage from './pages/ChannelFormPage';
import CategoryMappingPage from './pages/CategoryMappingPage';
import AttributeMappingPage from './pages/AttributeMappingPage';
import VariantFormPage from './pages/VariantFormPage';
import BulkImportPage from './pages/BulkImportPage';
import BulkActionsPage from './pages/BulkActionsPage';
import Layout from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Login disabled for testing - always allow access
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/new" element={<ProductFormPage />} />
                <Route path="/products/base/:baseSKU" element={<MainProductDetailPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/products/:id/edit" element={<ProductFormPage />} />
                <Route path="/products/:id/variants/new" element={<VariantFormPage />} />
                <Route path="/products/:id/variants/:variantId/edit" element={<VariantFormPage />} />
                <Route path="/products/import" element={<BulkImportPage />} />
                <Route path="/products/bulk-actions" element={<BulkActionsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/categories/:id" element={<CategoryDetailPage />} />
                <Route path="/attributes" element={<AttributesPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/channels" element={<ChannelsPage />} />
                <Route path="/channels/new" element={<ChannelFormPage />} />
                <Route path="/channels/:id/edit" element={<ChannelFormPage />} />
                <Route path="/channels/category-mapping" element={<CategoryMappingPage />} />
                <Route path="/channels/attribute-mapping" element={<AttributeMappingPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <DataProvider>
          <LanguageProvider>
            <AppRoutes />
          </LanguageProvider>
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;

