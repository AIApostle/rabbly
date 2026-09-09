import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout title="Password Recovery">
      <ForgotPasswordForm
        onSubmitEmail={(email) => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
        onBackToLogin={() => navigate('/login')}
      />
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
