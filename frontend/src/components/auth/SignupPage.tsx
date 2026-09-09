import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { SignupForm } from './SignupForm';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout title="Create Account" activeTab="signup">
      <SignupForm
        onSuccess={() => navigate('/session')}
        onSwitchToLogin={() => navigate('/login')}
      />
    </AuthLayout>
  );
};

export default SignupPage;
