import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Home, Plus, MapPin, CheckCircle, XCircle, Clock, Building2, Factory, Users } from 'lucide-react';

const PropertyManagement = () => {
  const { user } = useContext(AuthContext);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProperty, setShowAddProperty] = useState(false);

  const [newProperty, setNewProperty] = useState({
    name: '',
    property_type: 'residential',
    address: '',
    city: '',
    postal_code: '',
    latitude: '',
    longitude: ''
  });

  const propertyTypes = [
    { value: 'residential', label: 'Residensial', icon: Home },
    { value: 'commercial', label: 'Komersial', icon: Building2 },
    { value: 'industrial', label: 'Industri', icon: Factory },
    { value: 'boarding_house', label: 'Rumah Kos', icon: Users },
    { value: 'rental', label: 'Rumah Sewa', icon: Home },
    { value: 'other', label: 'Lainnya', icon: Building2 }
  ];

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${API}/properties`);
      setProperties(response.data);
    } catch (error) {
      toast.error('Gagal memuat data properti');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/properties`, {
        ...newProperty,
        latitude: newProperty.latitude ? parseFloat(newProperty.latitude) : null,
        longitude: newProperty.longitude ? parseFloat(newProperty.longitude) : null
      });
      toast.success('Properti berhasil didaftarkan! Menunggu verifikasi admin.');
      setShowAddProperty(false);
      setNewProperty({
        name: '',
        property_type: 'residential',
        address: '',
        city: '',
        postal_code: '',
        latitude: '',
        longitude: ''
      });
      fetchProperties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menambahkan properti');
    }
  };

  const handleVerify = async (propertyId, status, note = '') => {
    try {
      await axios.put(`${API}/properties/${propertyId}/verify`, {
        status: status,
        note: note
      });
      toast.success(`Properti ${status === 'approved' ? 'disetujui' : 'ditolak'}!`);
      fetchProperties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal memverifikasi properti');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, text: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, text: 'Disetujui' },
      rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, text: 'Ditolak' }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <Badge className={badge.color}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </Badge>
    );
  };

  const getPropertyIcon = (type) => {
    const typeData = propertyTypes.find(t => t.value === type);
    return typeData ? typeData.icon : Home;
  };

  const isAdmin = ['superadmin', 'admin'].includes(user?.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="water-loading">
          <div className="wave"></div>
          <div className="wave"></div>
          <div className="wave"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="property-management">
      <Card className="glass border-0 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Manajemen Properti</CardTitle>
              <CardDescription>Kelola properti untuk meter air Anda</CardDescription>
            </div>
            {user?.role === 'customer' && (
              <Dialog open={showAddProperty} onOpenChange={setShowAddProperty}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" data-testid="add-property-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Properti
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl" data-testid="add-property-dialog">
                  <DialogHeader>
                    <DialogTitle>Daftarkan Properti Baru</DialogTitle>
                    <DialogDescription>
                      Properti akan diverifikasi oleh admin sebelum dapat digunakan
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddProperty}>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="name">Nama Properti</Label>
                        <Input
                          id="name"
                          placeholder="Contoh: Rumah Utama"
                          value={newProperty.name}
                          onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                          required
                          data-testid="property-name-input"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="property-type">Tipe Properti</Label>
                        <Select value={newProperty.property_type} onValueChange={(value) => setNewProperty({ ...newProperty, property_type: value })}>
                          <SelectTrigger data-testid="property-type-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {propertyTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="address">Alamat Lengkap</Label>
                        <Input
                          id="address"
                          placeholder="Jl. Merdeka No. 123"
                          value={newProperty.address}
                          onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                          required
                          data-testid="property-address-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Kota</Label>
                        <Input
                          id="city"
                          placeholder="Jakarta"
                          value={newProperty.city}
                          onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })}
                          required
                          data-testid="property-city-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postal">Kode Pos (Opsional)</Label>
                        <Input
                          id="postal"
                          placeholder="12345"
                          value={newProperty.postal_code}
                          onChange={(e) => setNewProperty({ ...newProperty, postal_code: e.target.value })}
                          data-testid="property-postal-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="latitude">Latitude (Opsional)</Label>
                        <Input
                          id="latitude"
                          placeholder="-6.200000"
                          type="number"
                          step="any"
                          value={newProperty.latitude}
                          onChange={(e) => setNewProperty({ ...newProperty, latitude: e.target.value })}
                          data-testid="property-latitude-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="longitude">Longitude (Opsional)</Label>
                        <Input
                          id="longitude"
                          placeholder="106.816666"
                          type="number"
                          step="any"
                          value={newProperty.longitude}
                          onChange={(e) => setNewProperty({ ...newProperty, longitude: e.target.value })}
                          data-testid="property-longitude-input"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="submit-property-button">
                        Daftarkan Properti
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <div className="text-center py-12">
              <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Belum ada properti terdaftar</p>
              {user?.role === 'customer' && (
                <p className="text-sm text-slate-400">Klik "Tambah Properti" untuk mendaftarkan properti Anda</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((property, index) => {
                const Icon = getPropertyIcon(property.property_type);
                const typeLabel = propertyTypes.find(t => t.value === property.property_type)?.label || property.property_type;
                
                return (
                  <Card key={property.id} className="border-2 border-cyan-100 hover:border-cyan-300 transition-all card-hover" data-testid={`property-card-${index}`}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{property.name}</p>
                            <p className="text-xs text-slate-500">{typeLabel}</p>
                          </div>
                        </div>
                        {getStatusBadge(property.status)}
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-start text-sm text-slate-600">
                          <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{property.address}, {property.city}</span>
                        </div>
                        {property.postal_code && (
                          <p className="text-xs text-slate-500 ml-6">Kode Pos: {property.postal_code}</p>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 mb-4">
                        <p className="text-xs text-slate-600">Pemilik</p>
                        <p className="text-sm font-medium text-slate-800">{property.owner_name}</p>
                      </div>

                      {property.status === 'rejected' && property.verification_note && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                          <p className="text-xs text-red-600 font-semibold mb-1">Alasan Penolakan:</p>
                          <p className="text-xs text-red-700">{property.verification_note}</p>
                        </div>
                      )}

                      {isAdmin && property.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleVerify(property.id, 'approved')}
                            data-testid={`approve-property-${index}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => {
                              const note = prompt('Alasan penolakan:');
                              if (note) handleVerify(property.id, 'rejected', note);
                            }}
                            data-testid={`reject-property-${index}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Tolak
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyManagement;
