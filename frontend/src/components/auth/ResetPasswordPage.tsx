import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { ResetPasswordForm } from './ResetPasswordForm';
import { setAuthToken } from '../../services/authService';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  useEffect(() => {
    // Ingest recovery access token if user arrived via Supabase reset link in email
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const token = params.get('access_token');
      if (token) {
        setAuthToken(token);
      }
    }
  }, []);

  return (
    <AuthLayout title="Reset Password">
      <ResetPasswordForm
        email={email}
        onSuccess={() => navigate('/login')}
        onBackToLogin={() => navigate('/login')}
      />
    </AuthLayout>
  );
};

export default ResetPasswordPage;
