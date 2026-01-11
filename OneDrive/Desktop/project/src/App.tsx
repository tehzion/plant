import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import AuthLayout from './components/layout/AuthLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Organizations from './pages/admin/Organizations';
import Users from './pages/admin/Users';
import Assessments from './pages/admin/Assessments';
import Results from './pages/admin/Results';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';
import UserAssessments from './pages/user/UserAssessments';
import UserResults from './pages/user/UserResults';
import AssessmentBuilder from './pages/admin/AssessmentBuilder';
import AssessmentForm from './pages/user/AssessmentForm';

function App() {
  const { user } = useAuthStore();
  
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          {/* Admin Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/users" element={<Users />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/assessments/builder/:id" element={<AssessmentBuilder />} />
          <Route path="/results" element={<Results />} />
          
          {/* User Routes */}
          <Route path="/my-assessments" element={<UserAssessments />} />
          <Route path="/my-assessments/:id" element={<AssessmentForm />} />
          <Route path="/my-results" element={<UserResults />} />
        </Route>
      </Route>
      
      {/* Redirect to login or dashboard based on auth status */}
      <Route 
        path="/" 
        element={user ? <Navigate to="/dashboard\" replace /> : <Navigate to="/login" replace />} 
      />
      
      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;