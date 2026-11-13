import React from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Mail, Lock, UserCircle, Shield, Building2, Truck, Package, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';
import { clsx } from 'clsx';

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['CUSTOMER', 'ADMIN', 'BRANCH_STAFF', 'DELIVERY_PARTNER'] as const)
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = React.useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      role: 'CUSTOMER',
      email: '',
      password: ''
    }
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password, data.role);
      toast.success('Login successful');
      
      const roleRoutes: Record<UserRole, string> = {
        CUSTOMER: '/customer',
        ADMIN: '/admin',
        BRANCH_STAFF: '/branch',
        DELIVERY_PARTNER: '/delivery'
      };
      
      navigate(roleRoutes[data.role]);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to login');
    }
  };

  const roles: { value: UserRole; label: string; icon: React.ElementType }[] = [
    { value: 'CUSTOMER', label: 'Customer', icon: UserCircle },
    { value: 'ADMIN', label: 'Admin', icon: Shield },
    { value: 'BRANCH_STAFF', label: 'Branch Staff', icon: Building2 },
    { value: 'DELIVERY_PARTNER', label: 'Delivery', icon: Truck },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CourierFlow</h1>
          <p className="text-gray-400 mt-2 text-sm text-center">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {roles.map(({ value, label, icon: Icon }) => (
              <button
                type="button"
                key={value}
                onClick={() => setValue('role', value)}
                className={clsx(
                  "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
                  selectedRole === value
                    ? "bg-orange-500/10 border-orange-500 text-orange-500"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750"
                )}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Email Address"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm font-medium"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800">
          <p className="text-sm font-medium text-gray-400 mb-2">Demo Credentials:</p>
          <div className="space-y-1 text-xs text-gray-500 bg-gray-800/50 p-3 rounded-lg font-mono">
            <p>Customer: customer@demo.com / password123</p>
            <p>Admin: admin@demo.com / password123</p>
            <p>Branch: staff@demo.com / password123</p>
            <p>Delivery: driver@demo.com / password123</p>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-4">
          Don't have an account?{' '}
          <a href="/register" className="text-orange-500 hover:text-orange-400 font-medium">
            Create account
          </a>
        </p>
      </div>
    </div>
  );
};
