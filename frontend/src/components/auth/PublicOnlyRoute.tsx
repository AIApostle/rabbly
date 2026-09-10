import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface PublicOnlyRouteProps {
  children?: React.ReactNode;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#111318] text-[#e2e2e9] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1d2024] border border-[#44474f]/40 flex items-center justify-center text-3xl shadow-xl shadow-[#0842a0]/10 animate-pulse">
            🐰
          </div>
          <div className="flex items-center gap-2 text-sm text-[#a8c7fa] font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : null;
};
