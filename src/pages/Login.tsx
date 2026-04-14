import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SparklesIcon } from '@heroicons/react/24/solid';

export default function Login() {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error signing in', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#fc8019]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#fc8019]/5 rounded-full blur-[120px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#fc8019] to-[#ff9800] flex items-center justify-center font-display font-bold text-white text-3xl shadow-[0_4px_20px_rgba(252,128,25,0.4)]">
            T
          </div>
        </div>
        <h2 className="text-center text-4xl font-display font-bold text-gray-900 tracking-tight mb-2">
          TastyTrail
        </h2>
        <p className="text-center text-gray-500 text-lg">
          Discover restaurants & get food delivered fast
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in delay-150">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] px-4 py-8 sm:px-10 flex flex-col items-center">
          
          <SparklesIcon className="w-12 h-12 text-[#fc8019] mb-6 animate-pulse" />
          
          <p className="text-gray-700 text-center mb-8 font-medium">
            Join thousands of foodies discovering new flavors. Order fresh, hot food instantly.
          </p>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl shadow-sm bg-white text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors hover:scale-[1.02] active:scale-95"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google logo" />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
