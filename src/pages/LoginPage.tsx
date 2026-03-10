import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = login(email, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <span className="text-2xl font-bold text-white">PH</span>
          </div>
          <h1 className="text-2xl font-bold text-[#171717] mb-2">Product Hub</h1>
          <p className="text-[#5C5C5C]">Please login to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="admin@vakko.com"
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            Login
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-[#F7F7F7] rounded-lg">
          <p className="text-xs text-[#5C5C5C] font-medium mb-2">Demo Accounts:</p>
          <div className="space-y-2 text-xs text-[#5C5C5C]">
            <div>
              <span className="font-medium">Admin:</span> admin@vakko.com / admin123
            </div>
            <div>
              <span className="font-medium">User:</span> user@vakko.com / user123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

