import React, { useState } from 'react';
import { Users, UserPlus, Shield, ShieldAlert, CheckCircle2, XCircle, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CountryCode, UserRole } from '../../types';

export const UsersView: React.FC = () => {
  const { currentUser, isMaster, usersList, createUser, toggleUserStatus, deleteUser } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('analyst');
  const [newRegion, setNewRegion] = useState<CountryCode>('GT');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isMaster) {
    return (
      <div className="card-intelfon p-12 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-800">Acceso Denegado</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          La administración y gestión de usuarios está restringida exclusivamente para el{' '}
          <strong>Usuario Master (intelfon)</strong>. Tu cuenta actual no cuenta con privilegios suficientes.
        </p>
      </div>
    );
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFeedback({ type: 'error', text: 'Todos los campos son obligatorios.' });
      return;
    }

    const username = newEmail.split('@')[0].toLowerCase();
    const res = createUser({
      username,
      name: newName.trim(),
      email: newEmail.trim(),
      password: newPassword.trim(),
      role: newRole,
      region: newRegion
    });

    if (res.success) {
      setFeedback({ type: 'success', text: `Usuario ${newName} registrado exitosamente.` });
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setShowAddModal(false);
    } else {
      setFeedback({ type: 'error', text: res.message || 'Error registrando usuario.' });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Gestión y Control de Usuarios
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
              Solo Master Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Control centralizado de cuentas autorizadas, masters regionales y analistas de RED INTELFON.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddModal(true);
            setFeedback(null);
          }}
          className="btn-intelfon-primary text-xs self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Add User Modal / Inline Form */}
      {showAddModal && (
        <div className="card-intelfon p-6 space-y-4 border-2 border-red-200 bg-red-50/10">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-red-600" />
              <span>Registrar Nuevo Analista / Operador</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Ana Morales"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                placeholder="amorales@intelfon.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-1">
                Rol
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
              >
                <option value="analyst">Analista Financiero</option>
                <option value="admin">Administrador Regional</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-1">
                Región Asignada
              </label>
              <select
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value as CountryCode)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
              >
                <option value="GT">🇬🇹 Guatemala (GT)</option>
                <option value="SV">🇸🇻 El Salvador (SV)</option>
                <option value="GLOBAL">🌎 Regional (Global)</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-5 flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn-intelfon-secondary text-xs"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-intelfon-primary text-xs">
                Guardar y Activar Usuario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="card-intelfon overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-intelfon">
            <thead>
              <tr>
                <th>Usuario / Analista</th>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th>Región Operativa</th>
                <th>Fecha de Alta</th>
                <th className="text-center">Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((user) => {
                const isMasterUser = user.username === 'intelfon';
                return (
                  <tr key={user.username} className="hover:bg-slate-50 transition-colors">
                    <td className="font-bold text-slate-900">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span>{user.name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            @{user.username}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-slate-600">
                      {user.email}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          user.role === 'master'
                            ? 'bg-red-100 text-red-800'
                            : user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {user.role === 'master'
                          ? 'Master Admin'
                          : user.role === 'admin'
                          ? 'Admin Regional'
                          : 'Analista'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-slate-700">
                        {user.region === 'GT'
                          ? '🇬🇹 Guatemala'
                          : user.region === 'SV'
                          ? '🇸🇻 El Salvador'
                          : '🌎 Regional'}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-slate-400">
                      {user.createdAt || '2026-01-01'}
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        disabled={isMasterUser}
                        onClick={() => toggleUserStatus(user.username)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={isMasterUser ? 'Cuenta protegida' : 'Click para alternar estado'}
                      >
                        {user.active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1 text-slate-400" />
                            Inactivo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="text-right">
                      {!isMasterUser && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar usuario ${user.name}?`)) {
                              deleteUser(user.username);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
