import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

export default function GoogleAuthButton({ role = 'CUSTOMER', additionalData = {}, text = 'Sign in with Google' }) {
  const { loginWithGoogle } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        const payload = {
          credential: tokenResponse.access_token, // backend now supports access_token!
          role,
          ...additionalData
        };
        
        const user = await loginWithGoogle(payload);
        addToast(`Welcome, ${user.first_name}!`, 'success');
        
        if (user.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (user.role === 'AGENT') {
          navigate('/portal/agent/dashboard');
        } else {
          navigate('/portal/customer/overview');
        }
      } catch (err) {
        console.error(err);
        addToast(err.message || 'Could not sign in with Google', 'error');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      addToast('The Google popup was closed or an error occurred.', 'error');
    }
  });

  return (
    <div className="w-full flex justify-center relative my-2">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 rounded-lg">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <button
        type="button"
        onClick={() => login()}
        className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold py-2.5 px-4 rounded-lg shadow-sm"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
          <path d="M1 1h22v22H1z" fill="none" />
        </svg>
        {text}
      </button>
    </div>
  );
}
