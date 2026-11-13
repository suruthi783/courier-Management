import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Mail, Lock, User, Phone, Package, Loader2, Shield, Building2, Truck, UserCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';
import { clsx } from 'clsx';

// ── Schemas ───────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role:     z.enum(['CUSTOMER', 'ADMIN', 'BRANCH_STAFF', 'DELIVERY_PARTNER'] as const),
});

const registerSchema = z.object({
  name:            z.string().min(2, 'Name must be at least 2 characters'),
  email:           z.string().email('Valid email required'),
  phone:           z.string().min(7, 'Valid phone required'),
  password:        z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginForm    = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const roles: { value: UserRole; label: string; icon: React.ElementType }[] = [
  { value: 'CUSTOMER',         label: 'Customer',  icon: UserCircle },
  { value: 'ADMIN',            label: 'Admin',      icon: Shield     },
  { value: 'BRANCH_STAFF',     label: 'Branch',     icon: Building2  },
  { value: 'DELIVERY_PARTNER', label: 'Delivery',   icon: Truck      },
];

export const LoginPage: React.FC = () => {
  const { login, register: signup } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab]             = useState<'login' | 'register'>('login');
  const [showPass, setShowPass]   = useState(false);

  // ── Login form ──────────────────────────────────────────────
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: 'CUSTOMER', email: '', password: '' },
  });
  const selectedRole = loginForm.watch('role');

  const onLogin = async (data: LoginForm) => {
    try {
      await login(data.email, data.password, data.role);
      toast.success('Welcome back!');
      const routes: Record<UserRole, string> = {
        CUSTOMER: '/customer', ADMIN: '/admin',
        BRANCH_STAFF: '/branch', DELIVERY_PARTNER: '/delivery',
      };
      navigate(routes[data.role]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Login failed');
    }
  };

  // ── Register form ───────────────────────────────────────────
  const regForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onRegister = async (data: RegisterForm) => {
    try {
      await signup(data.name, data.email, data.phone, data.password);
      toast.success('Account created! Welcome 🎉');
      navigate('/customer');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CourierFlow</h1>
          <p className="text-gray-400 mt-1 text-sm">Courier Management System</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab('login')}
            className={clsx(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
              tab === 'login' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('register')}
            className={clsx(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
              tab === 'register' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
            )}
          >
            Create Account
          </button>
        </div>

        {/* ── LOGIN FORM ── */}
        {tab === 'login' && (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">

            {/* Role selector */}
            <div className="grid grid-cols-4 gap-2">
              {roles.map(({ value, label, icon: Icon }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => loginForm.setValue('role', value)}
                  className={clsx(
                    'flex flex-col items-center justify-center p-2 rounded-xl border transition-all',
                    selectedRole === value
                      ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                  )}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>

            {/* Email */}
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...loginForm.register('email')}
                  type="email"
                  placeholder="Email Address"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...loginForm.register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-14 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs font-medium">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center disabled:opacity-70"
            >
              {loginForm.formState.isSubmitting
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : 'Sign In'
              }
            </button>

            {/* Demo credentials */}
            <div className="pt-2 border-t border-gray-800">
              <p className="text-xs font-medium text-gray-400 mb-2">Demo Credentials:</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { label: 'Customer', email: 'customer@demo.com', role: 'CUSTOMER' as UserRole },
                  { label: 'Admin',    email: 'admin@demo.com',    role: 'ADMIN'    as UserRole },
                  { label: 'Branch',   email: 'staff@demo.com',    role: 'BRANCH_STAFF' as UserRole },
                  { label: 'Driver',   email: 'driver@demo.com',   role: 'DELIVERY_PARTNER' as UserRole },
                ].map(d => (
                  <button
                    key={d.role}
                    type="button"
                    onClick={() => {
                      loginForm.setValue('email', d.email);
                      loginForm.setValue('password', 'password123');
                      loginForm.setValue('role', d.role);
                    }}
                    className="text-left p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-all"
                  >
                    <p className="text-xs font-medium text-orange-400">{d.label}</p>
                    <p className="text-xs text-gray-500 truncate">{d.email}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1 text-center">Click any demo card to auto-fill</p>
            </div>
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {tab === 'register' && (
          <form onSubmit={regForm.handleSubmit(onRegister)} className="space-y-4">

            {/* Name */}
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...regForm.register('name')}
                  type="text"
                  placeholder="Full Name"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              {regForm.formState.errors.name && (
                <p className="text-red-500 text-xs mt-1">{regForm.formState.errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...regForm.register('email')}
                  type="email"
                  placeholder="Email Address"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              {regForm.formState.errors.email && (
                <p className="text-red-500 text-xs mt-1">{regForm.formState.errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...regForm.register('phone')}
                  type="tel"
                  placeholder="Phone Number"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              {regForm.formState.errors.phone && (
                <p className="text-red-500 text-xs mt-1">{regForm.formState.errors.phone.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...regForm.register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-14 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs font-medium">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              {regForm.formState.errors.password && (
                <p className="text-red-500 text-xs mt-1">{regForm.formState.errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...regForm.register('confirmPassword')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              {regForm.formState.errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{regForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={regForm.formState.isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center disabled:opacity-70"
            >
              {regForm.formState.isSubmitting
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : 'Create Account'
              }
            </button>

            <p className="text-center text-xs text-gray-500">
              Account type: <span className="text-orange-400 font-medium">Customer</span>
              {' '}— Contact admin for other roles
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
