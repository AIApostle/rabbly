import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { LoginForm } from './LoginForm';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout title="Sign In" activeTab="login">
      <LoginForm
        onSuccess={() => navigate('/session')}
        onSwitchToSignup={() => navigate('/signup')}
        onForgotPassword={() => navigate('/forgot-password')}
      />
    </AuthLayout>
  );
};

export default LoginPage;
