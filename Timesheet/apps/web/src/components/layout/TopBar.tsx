import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useAuthStore } from '../../lib/stores/auth.store';
import { apiClient } from '../../lib/api/client';

export function TopBar() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      logout();
      window.location.href = '/login';
    }
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-surface-card border-b border-surface-border flex-shrink-0">
      <div className="text-sm text-gray-400">
        {new Date().toLocaleDateString('vi-VN', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-400 hover:text-white hover:bg-surface-hover rounded-lg transition-colors">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand-500 rounded-full" />
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-surface-hover rounded-lg transition-colors"
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
