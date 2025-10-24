import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, UserCog, AlertCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react';

const RoleManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [myPermissions, setMyPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes, permRes] = await Promise.all([
        axios.get(`${API}/admin/customers`),
        axios.get(`${API}/roles/available`),
        axios.get(`${API}/permissions/me`)
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setMyPermissions(permRes.data.permissions);
    } catch (error) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!newRole) {
      toast.error('Pilih role terlebih dahulu');
      return;
    }

    try {
      await axios.put(`${API}/users/${selectedUser.id}/role`, {
        user_id: selectedUser.id,
        new_role: newRole
      });
      toast.success('Role berhasil diupdate!');
      setShowRoleDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal mengupdate role');
    }
  };

  const handleToggleStatus = async (user, newStatus) => {
    try {
      await axios.put(`${API}/users/${user.id}/status`, {
        user_id: user.id,
        is_active: newStatus
      });
      toast.success(`User ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}!`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal mengubah status');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Yakin ingin menghapus user ${user.name}?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/users/${user.id}`);
      toast.success('User berhasil dihapus!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menghapus user');
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      superadmin: 'bg-purple-100 text-purple-800 border-purple-200',
      admin: 'bg-blue-100 text-blue-800 border-blue-200',
      manager: 'bg-green-100 text-green-800 border-green-200',
      customer: 'bg-slate-100 text-slate-800 border-slate-200'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const canManageRoles = myPermissions.includes('manage_roles');
  const canEditUser = myPermissions.includes('edit_user');
  const canDeleteUser = myPermissions.includes('delete_user');

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
    <div className="space-y-6" data-testid="role-management">
      {/* Permissions Info */}
      <Card className="glass border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-cyan-600" />
            <CardTitle>Hak Akses Saya</CardTitle>
          </div>
          <CardDescription>Permissions yang Anda miliki</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {myPermissions.map((permission) => (
              <Badge key={permission} variant="outline" className="border-cyan-200 bg-cyan-50">
                {permission.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Roles */}
      <Card className="glass border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <UserCog className="w-5 h-5 text-blue-600" />
            <CardTitle>Daftar Role & Permissions</CardTitle>
          </div>
          <CardDescription>Role yang tersedia dalam sistem</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((role) => (
              <Card key={role.role} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getRoleBadgeColor(role.role)}>
                      {role.role.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {role.permissions.length} permissions
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-3">{role.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedUser({ role: role.role, permissions: role.permissions });
                      setShowPermissionsDialog(true);
                    }}
                    data-testid={`view-permissions-${role.role}`}
                  >
                    Lihat Permissions
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users Management */}
      <Card className="glass border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Manajemen User</CardTitle>
          <CardDescription>Kelola role dan status user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="users-role-table">
              <thead className="bg-cyan-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-cyan-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {user.is_active ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-sm text-slate-600">
                          {user.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {canManageRoles && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role);
                              setShowRoleDialog(true);
                            }}
                            data-testid={`change-role-${user.id}`}
                          >
                            <UserCog className="w-4 h-4 mr-1" />
                            Ubah Role
                          </Button>
                        )}
                        {canEditUser && (
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={(checked) => handleToggleStatus(user, checked)}
                            data-testid={`toggle-status-${user.id}`}
                          />
                        )}
                        {canDeleteUser && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            data-testid={`delete-user-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent data-testid="change-role-dialog">
          <DialogHeader>
            <DialogTitle>Ubah Role User</DialogTitle>
            <DialogDescription>
              Ubah role untuk: {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role Saat Ini</Label>
              <Badge className={getRoleBadgeColor(selectedUser?.role)}>
                {selectedUser?.role}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role Baru</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="new-role" data-testid="new-role-select">
                  <SelectValue placeholder="Pilih role baru" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.role} value={role.role}>
                      {role.role.toUpperCase()} - {role.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Perhatian</p>
                  <p>Mengubah role akan mengubah hak akses user dalam sistem.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateRole} className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="confirm-role-change">
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent data-testid="view-permissions-dialog">
          <DialogHeader>
            <DialogTitle>Permissions untuk {selectedUser?.role?.toUpperCase()}</DialogTitle>
            <DialogDescription>
              Daftar lengkap permissions yang dimiliki role ini
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-1 gap-2">
              {selectedUser?.permissions?.map((permission) => (
                <div key={permission} className="flex items-center space-x-2 p-2 bg-cyan-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm text-slate-700">{permission.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagement;
