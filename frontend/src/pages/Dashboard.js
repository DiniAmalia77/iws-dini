import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Droplets, Plus, MapPin, Activity, CreditCard, LogOut, AlertCircle, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [meters, setMeters] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMeter, setShowAddMeter] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState(null);

  const [newMeter, setNewMeter] = useState({
    meter_number: '',
    location: ''
  });

  const [purchase, setPurchase] = useState({
    amount: '',
    payment_method: 'midtrans'
  });

  const creditOptions = [10000, 20000, 30000, 50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [metersRes, transRes] = await Promise.all([
        axios.get(`${API}/meters`),
        axios.get(`${API}/transactions`)
      ]);
      setMeters(metersRes.data);
      setTransactions(transRes.data);
    } catch (error) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeter = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/meters`, newMeter);
      toast.success('Meter berhasil ditambahkan!');
      setShowAddMeter(false);
      setNewMeter({ meter_number: '', location: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menambahkan meter');
    }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    const amount = parseFloat(purchase.amount);
    
    if (amount < 10000) {
      toast.error('Pembelian minimum adalah Rp 10.000');
      return;
    }

    try {
      const response = await axios.post(`${API}/credit/purchase`, {
        meter_id: selectedMeter.id,
        amount: amount,
        payment_method: purchase.payment_method
      });

      if (response.data.payment_url) {
        window.open(response.data.payment_url, '_blank');
        toast.success('Silakan lanjutkan pembayaran di tab baru');
        setShowPurchase(false);
        setTimeout(fetchData, 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal membuat pembayaran');
    }
  };

  const totalBalance = meters.reduce((sum, meter) => sum + meter.balance, 0);
  const totalSpent = transactions.filter(t => t.status === 'settlement' || t.status === 'capture').reduce((sum, t) => sum + t.amount, 0);

  // Chart data
  const chartData = transactions.slice(-7).map((t, i) => ({
    name: `T${i + 1}`,
    amount: t.amount
  }));

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50" data-testid="customer-dashboard">
      {/* Header */}
      <div className="glass border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">
                  IndoWater
                </h1>
                <p className="text-sm text-slate-600">Selamat datang, {user?.name}</p>
              </div>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              className="border-cyan-200 hover:bg-cyan-50"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass border-0 shadow-lg card-hover fade-in-up" data-testid="total-meters-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Meter</p>
                  <p className="text-3xl font-bold text-cyan-600">{meters.length}</p>
                </div>
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-0 shadow-lg card-hover fade-in-up" style={{ animationDelay: '0.1s' }} data-testid="total-balance-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Saldo Total</p>
                  <p className="text-3xl font-bold text-blue-600">Rp {totalBalance.toLocaleString('id-ID')}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-0 shadow-lg card-hover fade-in-up" style={{ animationDelay: '0.2s' }} data-testid="total-spent-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Pembelian</p>
                  <p className="text-3xl font-bold text-emerald-600">Rp {totalSpent.toLocaleString('id-ID')}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card className="glass border-0 shadow-lg mb-8" data-testid="transaction-chart">
            <CardHeader>
              <CardTitle>Riwayat Transaksi</CardTitle>
              <CardDescription>7 transaksi terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Area type="monotone" dataKey="amount" stroke="#0891b2" fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Meters List */}
        <Card className="glass border-0 shadow-lg" data-testid="meters-list">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Meter Air Saya</CardTitle>
                <CardDescription>Kelola meter air prabayar Anda</CardDescription>
              </div>
              <Dialog open={showAddMeter} onOpenChange={setShowAddMeter}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" data-testid="add-meter-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Meter
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="add-meter-dialog">
                  <DialogHeader>
                    <DialogTitle>Tambah Meter Baru</DialogTitle>
                    <DialogDescription>Daftarkan meter air prabayar Anda</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddMeter}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="meter-number">Nomor Meter</Label>
                        <Input
                          id="meter-number"
                          placeholder="Contoh: 12345678901"
                          value={newMeter.meter_number}
                          onChange={(e) => setNewMeter({ ...newMeter, meter_number: e.target.value })}
                          required
                          data-testid="meter-number-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Lokasi</Label>
                        <Input
                          id="location"
                          placeholder="Contoh: Jl. Merdeka No. 123"
                          value={newMeter.location}
                          onChange={(e) => setNewMeter({ ...newMeter, location: e.target.value })}
                          required
                          data-testid="meter-location-input"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="submit-meter-button">
                        Tambahkan
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {meters.length === 0 ? (
              <div className="text-center py-12">
                <Droplets className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Belum ada meter terdaftar</p>
                <p className="text-sm text-slate-400">Klik tombol "Tambah Meter" untuk memulai</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meters.map((meter, index) => (
                  <Card key={meter.id} className="border-2 border-cyan-100 hover:border-cyan-300 transition-all card-hover" data-testid={`meter-card-${index}`}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-sm text-slate-600">Nomor Meter</p>
                          <p className="text-lg font-bold text-slate-800">{meter.meter_number}</p>
                        </div>
                        <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                          <Droplets className="w-5 h-5 text-cyan-600" />
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-slate-600 mb-4">
                        <MapPin className="w-4 h-4 mr-1" />
                        {meter.location}
                      </div>
                      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-3 mb-4">
                        <p className="text-xs text-slate-600 mb-1">Saldo</p>
                        <p className="text-2xl font-bold text-cyan-600">Rp {meter.balance.toLocaleString('id-ID')}</p>
                        {meter.balance <= 5000 && (
                          <div className="flex items-center text-xs text-orange-600 mt-2">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Saldo rendah!
                          </div>
                        )}
                      </div>
                      <Dialog open={showPurchase && selectedMeter?.id === meter.id} onOpenChange={(open) => {
                        setShowPurchase(open);
                        if (open) setSelectedMeter(meter);
                      }}>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" data-testid={`purchase-credit-button-${index}`}>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Beli Kredit
                          </Button>
                        </DialogTrigger>
                        <DialogContent data-testid="purchase-credit-dialog">
                          <DialogHeader>
                            <DialogTitle>Beli Kredit Air</DialogTitle>
                            <DialogDescription>
                              Meter: {meter.meter_number} • Saldo: Rp {meter.balance.toLocaleString('id-ID')}
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handlePurchase}>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Pilih Nominal</Label>
                                <div className="grid grid-cols-3 gap-2">
                                  {creditOptions.map((amount) => (
                                    <Button
                                      key={amount}
                                      type="button"
                                      variant="outline"
                                      className={`${purchase.amount === amount.toString() ? 'border-cyan-500 bg-cyan-50' : ''}`}
                                      onClick={() => setPurchase({ ...purchase, amount: amount.toString() })}
                                      data-testid={`credit-option-${amount}`}
                                    >
                                      {(amount / 1000)}k
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="custom-amount">Atau masukkan nominal</Label>
                                <Input
                                  id="custom-amount"
                                  type="number"
                                  placeholder="Minimal Rp 10.000"
                                  value={purchase.amount}
                                  onChange={(e) => setPurchase({ ...purchase, amount: e.target.value })}
                                  min="10000"
                                  data-testid="custom-amount-input"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="payment-method">Metode Pembayaran</Label>
                                <Select value={purchase.payment_method} onValueChange={(value) => setPurchase({ ...purchase, payment_method: value })}>
                                  <SelectTrigger data-testid="payment-method-select">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="midtrans">Midtrans (GoPay, QRIS, VA)</SelectItem>
                                    <SelectItem value="xendit">Xendit</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="submit-purchase-button">
                                Lanjutkan Pembayaran
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;