import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Droplets, Users, Activity, TrendingUp, LogOut, Upload, DollarSign, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import RoleManagement from './RoleManagement';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [dashboard, setDashboard] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [meters, setMeters] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [waterRate, setWaterRate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, custRes, metersRes, transRes, settingsRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard`),
        axios.get(`${API}/admin/customers`),
        axios.get(`${API}/meters`),
        axios.get(`${API}/transactions`),
        axios.get(`${API}/settings`)
      ]);
      setDashboard(dashRes.data);
      setCustomers(custRes.data);
      setMeters(metersRes.data);
      setTransactions(transRes.data);
      setSettings(settingsRes.data);
      setWaterRate(settingsRes.data.water_rate.toString());
    } catch (error) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) {
      toast.error('Pilih file logo terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('file', logoFile);

    try {
      await axios.put(`${API}/settings/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Logo berhasil diupdate!');
      fetchData();
    } catch (error) {
      toast.error('Gagal mengupload logo');
    }
  };

  const handleUpdateRate = async () => {
    try {
      await axios.put(`${API}/settings/rate?water_rate=${parseFloat(waterRate)}`);
      toast.success('Tarif air berhasil diupdate!');
      fetchData();
    } catch (error) {
      toast.error('Gagal mengupdate tarif');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
        <div className="water-loading">
          <div className="wave"></div>
          <div className="wave"></div>
          <div className="wave"></div>
        </div>
      </div>
    );
  }

  // Chart data
  const transactionChartData = transactions.slice(-10).map((t, i) => ({
    name: `T${i + 1}`,
    amount: t.amount
  }));

  const statusData = [
    { name: 'Success', value: transactions.filter(t => t.status === 'settlement' || t.status === 'capture').length },
    { name: 'Pending', value: transactions.filter(t => t.status === 'pending').length },
    { name: 'Failed', value: transactions.filter(t => !['settlement', 'capture', 'pending'].includes(t.status)).length }
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50" data-testid="admin-dashboard">
      {/* Header */}
      <div className="glass border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {settings?.logo_base64 ? (
                <img src={settings.logo_base64} alt="Logo" className="w-12 h-12 rounded-xl shadow-lg object-cover" />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Droplets className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-slate-600">Selamat datang, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-cyan-200 hover:bg-cyan-50" data-testid="settings-button">
                    Pengaturan
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="settings-dialog">
                  <DialogHeader>
                    <DialogTitle>Pengaturan Sistem</DialogTitle>
                    <DialogDescription>Kelola logo dan tarif air</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="logo-upload">Upload Logo</Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files[0])}
                        data-testid="logo-upload-input"
                      />
                      <Button onClick={handleLogoUpload} className="w-full mt-2" data-testid="upload-logo-button">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Logo
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="water-rate">Tarif Air (IDR/m³)</Label>
                      <Input
                        id="water-rate"
                        type="number"
                        value={waterRate}
                        onChange={(e) => setWaterRate(e.target.value)}
                        data-testid="water-rate-input"
                      />
                      <Button onClick={handleUpdateRate} className="w-full mt-2" data-testid="update-rate-button">
                        Update Tarif
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                onClick={logout}
                variant="outline"
                className="border-cyan-200 hover:bg-cyan-50"
                data-testid="admin-logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="glass border-0 shadow-lg card-hover fade-in-up" data-testid="total-customers-stat">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Pelanggan</p>
                  <p className="text-3xl font-bold text-cyan-600">{dashboard?.total_customers || 0}</p>
                </div>
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-0 shadow-lg card-hover fade-in-up" style={{ animationDelay: '0.1s' }} data-testid="total-meters-stat">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Meter</p>
                  <p className="text-3xl font-bold text-blue-600">{dashboard?.total_meters || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-0 shadow-lg card-hover fade-in-up" style={{ animationDelay: '0.2s' }} data-testid="total-transactions-stat">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Transaksi</p>
                  <p className="text-3xl font-bold text-emerald-600">{dashboard?.total_transactions || 0}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-0 shadow-lg card-hover fade-in-up" style={{ animationDelay: '0.3s' }} data-testid="total-revenue-stat">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total User</p>
                  <p className="text-3xl font-bold text-purple-600">{dashboard?.total_users || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-0 shadow-lg card-hover fade-in-up" style={{ animationDelay: '0.4s' }} data-testid="total-revenue-stat">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Pendapatan</p>
                  <p className="text-2xl font-bold text-emerald-600">Rp {(dashboard?.total_revenue || 0).toLocaleString('id-ID')}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="glass border-0 shadow-lg" data-testid="transaction-bar-chart">
            <CardHeader>
              <CardTitle>Transaksi Terbaru</CardTitle>
              <CardDescription>10 transaksi terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={transactionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#0891b2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass border-0 shadow-lg" data-testid="transaction-status-pie">
            <CardHeader>
              <CardTitle>Status Transaksi</CardTitle>
              <CardDescription>Distribusi status pembayaran</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="glass border-0 shadow-lg">
          <CardContent className="pt-6">
            <Tabs defaultValue="customers" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="customers" data-testid="customers-tab">Pelanggan</TabsTrigger>
                <TabsTrigger value="meters" data-testid="meters-tab">Meter</TabsTrigger>
                <TabsTrigger value="transactions" data-testid="transactions-tab">Transaksi</TabsTrigger>
                <TabsTrigger value="roles" data-testid="roles-tab">Role & Akses</TabsTrigger>
              </TabsList>

              <TabsContent value="customers">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Daftar Pelanggan</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="customers-table">
                      <thead className="bg-cyan-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Nama</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Telepon</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Tanggal Daftar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {customers.map((customer) => (
                          <tr key={customer.id} className="hover:bg-cyan-50/50">
                            <td className="px-4 py-3 text-sm text-slate-700">{customer.name}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{customer.email}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{customer.phone || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {new Date(customer.created_at).toLocaleDateString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="meters">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Daftar Meter</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="meters-table">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Nomor Meter</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Pelanggan</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Lokasi</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Saldo</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {meters.map((meter) => (
                          <tr key={meter.id} className="hover:bg-blue-50/50">
                            <td className="px-4 py-3 text-sm font-mono text-slate-700">{meter.meter_number}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{meter.customer_name}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{meter.location}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">Rp {meter.balance.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                meter.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {meter.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="transactions">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Riwayat Transaksi</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="transactions-table">
                      <thead className="bg-emerald-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Order ID</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Jumlah</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Metode</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Waktu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {transactions.slice(-20).reverse().map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-emerald-50/50">
                            <td className="px-4 py-3 text-sm font-mono text-slate-700">{transaction.order_id}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">Rp {transaction.amount.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{transaction.payment_method}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                transaction.status === 'settlement' || transaction.status === 'capture'
                                  ? 'bg-green-100 text-green-800'
                                  : transaction.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {new Date(transaction.transaction_time).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="roles">
                <RoleManagement />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
