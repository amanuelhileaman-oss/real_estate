import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

export default function GoogleAuthButton({ role = 'CUSTOMER', additionalData = {}, text = 'continue_with' }) {
  const { loginWithGoogle } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    try {
      setIsLoading(true);
      const payload = {
        credential: credentialResponse.credential,
        role,
        ...additionalData
      };
      
      const user = await loginWithGoogle(payload);
      addToast('success', 'Google Sign-In Successful', `Welcome, ${user.first_name}!`);
      
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (user.role === 'AGENT') {
        navigate('/portal/agent/dashboard');
      } else {
        navigate('/portal/customer/overview');
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Authentication Failed', err.message || 'Could not sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    addToast('error', 'Google Sign-In Failed', 'The Google popup was closed or an error occurred.');
  };

  return (
    <div className="w-full flex justify-center relative my-2">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        theme={document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline'}
        size="large"
        width="100%"
        text={text}
        shape="rectangular"
      />
    </div>
  );
}
