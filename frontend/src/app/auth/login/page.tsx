"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, CheckCircle2, Mail, Lock, Shield, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      const getRoleBasedRedirect = (role: string): string => {
        switch (role) {
          case 'ADMIN':
            return '/admin/dashboard';
          case 'EXPERT_HELPDESK':
            return '/expert/dashboard';
          case 'ZONE_MANAGER':
            return '/zone/dashboard';
          case 'ZONE_USER':
            return '/zone/dashboard';
          case 'SERVICE_PERSON':
            return '/service-person/dashboard';
          case 'EXTERNAL_USER':
            return '/external/tickets';
          default:
            return '/auth/login';
        }
      };
      
      router.replace(getRoleBasedRedirect(user.role));
    }
  }, [isAuthenticated, user, isLoading, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  // Check for session expiration and show notification
  useEffect(() => {
    const sessionExpired = sessionStorage.getItem('sessionExpired');
    const sessionExpiredReason = sessionStorage.getItem('sessionExpiredReason');
    
    if (sessionExpired === 'true') {
      let message = 'Your session has expired. Please login again.';
      
      if (sessionExpiredReason === 'REFRESH_TOKEN_EXPIRED') {
        message = 'Your session has expired due to inactivity. Please login again.';
      } else if (sessionExpiredReason === 'NO_REFRESH_TOKEN') {
        message = 'Your session is no longer valid. Please login again.';
      }
      
      toast({
        title: "Session Expired",
        description: message,
        variant: "destructive",
        duration: 5000,
      });
      
      // Clear the flags
      sessionStorage.removeItem('sessionExpired');
      sessionStorage.removeItem('sessionExpiredReason');
    }
  }, []);

  // Load saved credentials on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedEmail = localStorage.getItem('rememberedEmail');
      const savedPassword = localStorage.getItem('rememberedPassword');
      const wasRemembered = localStorage.getItem('wasRemembered') === 'true';
      
      if (savedEmail && savedPassword && wasRemembered) {
        form.reset({
          email: savedEmail,
          password: savedPassword,
          rememberMe: true,
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [form]);

  const onSubmit = async (values: LoginFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const result = await login(values.email, values.password, values.rememberMe);
      
      if (result.success) {
        if (values.rememberMe) {
          localStorage.setItem('rememberedEmail', values.email);
          localStorage.setItem('rememberedPassword', values.password);
          localStorage.setItem('wasRemembered', 'true');
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
          localStorage.removeItem('wasRemembered');
        }
        
        setLoginSuccess(true);
        
        setTimeout(() => {
          setLoginSuccess(false);
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description:
          error?.response?.data?.message ||
          "Failed to log in. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading screen if user is already authenticated
  if (isAuthenticated && user && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #1a365d 0%, #2d5a87 30%, #507295 50%, #3d7a9e 70%, #2c5282 100%)'
      }}>
        <div className="text-center p-8">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#aac01d]/20 to-[#507295]/20 rounded-3xl blur-xl animate-pulse"></div>
            <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
              <Image
                src="/kardex.png"
                alt="Kardex Logo"
                width={200}
                height={80}
                className="mx-auto"
                priority
              />
            </div>
          </div>
          
          <div className="mb-6 relative">
            <div className="w-20 h-20 mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#aac01d] to-[#507295] rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
              <div className="absolute inset-1 bg-gradient-to-br from-[#1a365d] to-[#2d5a87] rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white animate-pulse" />
              </div>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2">Welcome Back!</h3>
          <p className="text-white/70 text-sm mb-6">
            Redirecting to your dashboard...
          </p>
          
          <div className="w-56 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#aac01d] via-white to-[#aac01d] rounded-full animate-[shimmer_2s_infinite]" 
              style={{
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite linear'
              }}
            ></div>
          </div>
        </div>
        
        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Deep Premium Background */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #1a365d 0%, #2d5a87 25%, #507295 50%, #3d7a9e 75%, #2c5282 100%)'
      }}></div>
      
      {/* Animated Mesh Gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#aac01d]/15 via-transparent to-transparent rounded-full blur-3xl animate-[float_20s_ease-in-out_infinite]"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[#507295]/20 via-transparent to-transparent rounded-full blur-3xl animate-[float_25s_ease-in-out_infinite_reverse]"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-[#aac01d]/10 to-[#507295]/10 rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite]"></div>
      </div>
      
      {/* Floating Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large rotating ring */}
        <div className="absolute top-20 right-20 w-32 h-32 border border-white/10 rounded-full animate-[spin_30s_linear_infinite]"></div>
        <div className="absolute top-24 right-24 w-24 h-24 border border-[#aac01d]/20 rounded-full animate-[spin_20s_linear_infinite_reverse]"></div>
        
        {/* Floating squares */}
        <div className="absolute bottom-1/4 left-1/6 w-4 h-4 bg-white/5 rotate-45 animate-[float_6s_ease-in-out_infinite]"></div>
        <div className="absolute top-1/3 right-1/5 w-6 h-6 border border-[#aac01d]/20 rotate-12 animate-[float_8s_ease-in-out_infinite_1s]"></div>
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-gradient-to-r from-white/30 to-white/10 rounded-full blur-sm animate-[bounce_4s_ease-in-out_infinite]"></div>
        <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-[#aac01d]/40 rounded-full blur-sm animate-[bounce_5s_ease-in-out_infinite_0.5s]"></div>
        <div className="absolute bottom-1/3 left-1/3 w-2.5 h-2.5 bg-white/20 rounded-full blur-sm animate-[bounce_6s_ease-in-out_infinite_1s]"></div>
        <div className="absolute top-1/2 right-1/6 w-1.5 h-1.5 bg-[#aac01d]/30 rounded-full blur-sm animate-[bounce_4.5s_ease-in-out_infinite_1.5s]"></div>
      </div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>
      
      {/* Main Content */}
      <div className="w-full max-w-[420px] relative z-10">
        {/* Glow effect behind card */}
        <div className="absolute -inset-4 bg-gradient-to-r from-[#aac01d]/20 via-white/10 to-[#507295]/20 rounded-[2.5rem] blur-2xl opacity-60"></div>
        
        {/* Main Login Card */}
        <div className="relative bg-white/[0.97] backdrop-blur-2xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-white/50 overflow-hidden">
          {/* Decorative top accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#507295] via-[#aac01d] to-[#507295]"></div>
          
          {/* Header Section */}
          <div className="relative pt-10 pb-6 px-8 text-center">
            {/* Subtle background pattern in header */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, #507295 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}></div>
            
            <div className="relative mb-8">
              <div className="inline-block relative">
                {/* Logo glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-[#aac01d]/10 to-[#507295]/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Image
                  src="/kardex.png"
                  alt="Kardex Logo"
                  width={180}
                  height={72}
                  className="relative drop-shadow-sm transition-transform duration-300 hover:scale-105"
                  priority
                />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#507295] to-[#3d7a9e] bg-clip-text text-transparent mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-500 text-sm">
              Enter your credentials to access your dashboard
            </p>
          </div>

          {/* Form Section */}
          <div className="px-8 pb-8 relative">
            {/* Success Overlay */}
            {loginSuccess && (
              <div className="absolute inset-0 bg-white/[0.98] backdrop-blur-md flex items-center justify-center z-20">
                <div className="text-center p-8">
                  <div className="mb-6 relative">
                    <div className="absolute inset-0 bg-green-400/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-200">
                      <CheckCircle2 className="h-12 w-12 text-white animate-[scale_0.5s_ease-out]" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
                  <p className="text-gray-600 mb-6">Redirecting to your dashboard...</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading Overlay */}
            {(isLoading || isSubmitting) && !loginSuccess && (
              <div className="absolute inset-0 bg-white/[0.98] backdrop-blur-md flex items-center justify-center z-10">
                <div className="text-center p-8">
                  <div className="mb-6 relative">
                    <div className="w-20 h-20 mx-auto relative">
                      <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-transparent border-t-[#507295] border-r-[#aac01d] rounded-full animate-spin"></div>
                      <div className="absolute inset-2 bg-gradient-to-br from-[#507295]/10 to-[#aac01d]/10 rounded-full flex items-center justify-center">
                        <Shield className="h-6 w-6 text-[#507295]" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {isSubmitting ? "Authenticating..." : "Loading..."}
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    {isSubmitting ? "Verifying your credentials" : "Preparing your session"}
                  </p>
                  <div className="w-48 h-1.5 bg-gray-100 rounded-full mx-auto overflow-hidden">
                    <div className="h-full w-1/2 bg-gradient-to-r from-[#507295] to-[#aac01d] rounded-full animate-[loading_1s_ease-in-out_infinite]"></div>
                  </div>
                </div>
              </div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 mb-1.5 block">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <div className={`relative group transition-all duration-300 ${focusedField === 'email' ? 'scale-[1.02]' : ''}`}>
                          <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                            focusedField === 'email' ? 'text-[#507295]' : 'text-gray-400'
                          }`}>
                            <Mail className="h-5 w-5" />
                          </div>
                          <Input
                            {...field}
                            placeholder="you@example.com"
                            type="email"
                            className={`h-13 pl-12 pr-4 border-2 rounded-xl transition-all duration-300 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 ${
                              focusedField === 'email' 
                                ? 'border-[#507295] bg-white shadow-lg shadow-[#507295]/10' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            style={{ height: '52px' }}
                            disabled={isLoading || isSubmitting}
                            onFocus={() => setFocusedField('email')}
                            onBlur={(e) => { field.onBlur(); setFocusedField(null); }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs mt-1.5 ml-1" />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 mb-1.5 block">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className={`relative group transition-all duration-300 ${focusedField === 'password' ? 'scale-[1.02]' : ''}`}>
                          <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                            focusedField === 'password' ? 'text-[#507295]' : 'text-gray-400'
                          }`}>
                            <Lock className="h-5 w-5" />
                          </div>
                          <Input
                            {...field}
                            placeholder="Enter your password"
                            type="password"
                            className={`h-13 pl-12 pr-4 border-2 rounded-xl transition-all duration-300 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 ${
                              focusedField === 'password' 
                                ? 'border-[#507295] bg-white shadow-lg shadow-[#507295]/10' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            style={{ height: '52px' }}
                            disabled={isLoading || isSubmitting}
                            onFocus={() => setFocusedField('password')}
                            onBlur={(e) => { field.onBlur(); setFocusedField(null); }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs mt-1.5 ml-1" />
                    </FormItem>
                  )}
                />

                {/* Remember Me */}
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <label className="relative flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            disabled={isLoading || isSubmitting}
                          />
                          <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                            field.value 
                              ? 'bg-gradient-to-br from-[#507295] to-[#aac01d] border-transparent' 
                              : 'border-gray-300 bg-white group-hover:border-gray-400'
                          }`}>
                            {field.value && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </label>
                      </FormControl>
                      <FormLabel className="text-sm text-gray-600 font-normal cursor-pointer select-none">
                        Keep me signed in
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading || isSubmitting || loginSuccess}
                    className={`w-full h-13 font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group ${
                      loginSuccess 
                        ? "bg-gradient-to-r from-green-500 to-green-600" 
                        : "bg-gradient-to-r from-[#507295] via-[#5a8bab] to-[#aac01d]"
                    } text-white shadow-lg hover:shadow-xl`}
                    style={{ height: '52px', backgroundSize: '200% 100%' }}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    
                    <span className="relative flex items-center justify-center gap-2">
                      {loginSuccess ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 animate-bounce" />
                          <span>Welcome Back!</span>
                        </>
                      ) : isLoading || isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>{isSubmitting ? "Signing In..." : "Loading..."}</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Dashboard</span>
                          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-gradient-to-b from-gray-50/80 to-gray-100/80 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Shield className="h-3.5 w-3.5 text-gray-400" />
              <span>Secured by enterprise-grade encryption</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center mt-8">
          <p className="text-white/60 text-xs font-medium tracking-wide">
            © 2024 Kardex Remstar. All rights reserved.
          </p>
        </div>
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes scale {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
