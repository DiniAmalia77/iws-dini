import React, { useState, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Droplets, Lock, Mail, User, Phone } from 'lucide-react';

const Login = () => {
  const { login } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      login(response.data.access_token, response.data.user);
      toast.success('Selamat datang kembali!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login gagal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, registerData);
      login(response.data.access_token, response.data.user);
      toast.success('Akun berhasil dibuat!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registrasi gagal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 relative overflow-hidden">
      {/* Animated water drops background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-cyan-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-blue-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-sky-200/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md z-10 water-drop">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-4 shadow-2xl">
            <Droplets className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 mb-2">
            IndoWater Solution
          </h1>
          <p className="text-slate-600">Sistem Manajemen Meter Air Prabayar</p>
        </div>

        <Card className="glass border-0 shadow-2xl" data-testid="login-card">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Selamat Datang</CardTitle>
            <CardDescription className="text-center">Masuk atau daftar untuk melanjutkan</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="login-tab">Masuk</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Daftar</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="contoh@email.com"
                        className="pl-10"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        data-testid="login-email-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        data-testid="login-password-input"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 btn-water"
                    disabled={isLoading}
                    data-testid="login-submit-button"
                  >
                    {isLoading ? 'Memproses...' : 'Masuk'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nama Lengkap</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Nama lengkap"
                        className="pl-10"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        required
                        data-testid="register-name-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="contoh@email.com"
                        className="pl-10"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                        data-testid="register-email-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Nomor Telepon</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="+62812345678"
                        className="pl-10"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        data-testid="register-phone-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                        data-testid="register-password-input"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 btn-water"
                    disabled={isLoading}
                    data-testid="register-submit-button"
                  >
                    {isLoading ? 'Memproses...' : 'Daftar Sekarang'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg space-y-2">
              <p className="text-sm text-center text-slate-600">
                <strong>Demo Accounts:</strong>
              </p>
              <div className="grid grid-cols-1 gap-1 text-xs text-slate-600">
                <p>• Superadmin: superadmin@indowater.com / superadmin123</p>
                <p>• Admin: admin@indowater.com / admin123</p>
                <p>• Manager: manager@indowater.com / manager123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;