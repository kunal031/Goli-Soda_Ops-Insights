import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  Home as HomeIcon,
  LayoutDashboard,
  Package,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  LogOut,
  User,
  Droplets,
  Bell,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  Check,
  CheckCheck,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Wallet,
  ShoppingCart,
  BarChart3,
  Boxes,
  Clock,
  Sparkles,
  Plus,
  BoxSelect,
  ListX,
  FileSpreadsheet,
  FileText,
  Download,
  Search,
  Menu,
  Lightbulb
} from 'lucide-react';

// Analytics / Insights components
import InsightsMetricCards    from './InsightsMetricCards';
import InsightsRevenueTrends  from './InsightsRevenueTrends';
import InsightsStockMovement  from './InsightsStockMovement';
import InsightsTopSKUs        from './InsightsTopSKUs';
import InsightsExpenseRevenue from './InsightsExpenseRevenue';

// ==========================================
// 1. AUTH CONTEXT
// ==========================================
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('goliops_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('goliops_token') || null;
  });

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }

    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('goliops_user', JSON.stringify(data.user));
    localStorage.setItem('goliops_token', data.token);
    return data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('goliops_user');
    localStorage.removeItem('goliops_token');
  }, []);

  const apiFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (res.status === 401 || res.status === 403) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('goliops_user');
      localStorage.removeItem('goliops_token');
      throw new Error('Session expired. Please log in again.');
    }

    return res;
  }, [token]);

  const updateProfile = useCallback((newUser, newToken) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('goliops_user', JSON.stringify(newUser));
    localStorage.setItem('goliops_token', newToken);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, apiFetch, updateProfile, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// ==========================================
// 2. UI COMPONENTS
// ==========================================

export function KPICard({ icon: Icon, label, value, subtitle, accentColor = '#06b6d4', delay = 0 }) {
  return (
    <div
      className="glass-card kpi-card animate-fade-in"
      style={{
        padding: '24px',
        animationDelay: `${delay}s`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#64748b',
              marginBottom: 8,
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#f8fafc',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {value}
          </p>
          {subtitle && (
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: 6 }}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${accentColor}18`,
          }}
        >
          <Icon size={22} color={accentColor} />
        </div>
      </div>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc' }}>
            {title}
          </h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function NotificationPanel() {
  const { apiFetch } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function fetchNotifications() {
      setLoading(true);
      try {
        const [lowRes, txnRes] = await Promise.all([
          apiFetch('/api/inventory/low-stock'),
          apiFetch('/api/inventory/transactions'),
        ]);
        const lowStock = await lowRes.json();
        const transactions = await txnRes.json();

        const items = [];

        lowStock.forEach((item) => {
          items.push({
            id: `low-${item.id}`,
            type: 'alert',
            icon: AlertTriangle,
            iconColor: '#f87171',
            iconBg: 'rgba(239, 68, 68, 0.12)',
            title: `Low Stock: ${item.name}`,
            subtitle: `${item.variant} · Only ${item.stock} units left`,
            time: 'Action needed',
            read: false,
          });
        });

        transactions.slice(0, 5).forEach((txn) => {
          const isIn = txn.type === 'IN';
          items.push({
            id: `txn-${txn.id}`,
            type: 'transaction',
            icon: isIn ? ArrowDownToLine : ArrowUpFromLine,
            iconColor: isIn ? '#22d3ee' : '#0891b2',
            iconBg: isIn ? 'rgba(6, 182, 212, 0.12)' : 'rgba(14, 116, 144, 0.12)',
            title: `Stock ${txn.type}: ${txn.quantity} units`,
            subtitle: txn.note || txn.productId,
            time: txn.date,
            read: true,
          });
        });

        if (!cancelled) setNotifications(items);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNotifications();
    return () => { cancelled = true; };
  }, [open, apiFetch]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        id="notification-bell-btn"
        className="btn btn-ghost"
        style={{ position: 'relative', padding: 8 }}
        title="Notifications"
        onClick={() => setOpen(!open)}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.625rem',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1,
              padding: '0 3px',
              boxShadow: '0 0 0 2px var(--surface-800)',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="animate-scale-in notif-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 380,
            maxHeight: 480,
            background: 'var(--surface-800)',
            border: '1px solid var(--surface-600)',
            borderRadius: 16,
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(6, 182, 212, 0.06)',
            overflow: 'hidden',
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px 12px',
              borderBottom: '1px solid var(--surface-700)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                Notifications
              </h4>
              {unreadCount > 0 && (
                <span
                  className="badge badge-danger"
                  style={{ fontSize: '0.6875rem', padding: '1px 7px' }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {unreadCount > 0 && (
                <button
                  className="btn btn-ghost"
                  onClick={markAllRead}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
                style={{ padding: '4px 6px' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 400 }}>
            {loading ? (
              <div style={{ padding: 20 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{ height: 56, borderRadius: 10, marginBottom: 8 }}
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div
                className="empty-state"
                style={{ padding: '36px 20px' }}
              >
                <Bell size={32} color="#334155" style={{ marginBottom: 10 }} />
                <p style={{ fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                  No notifications
                </p>
                <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 4 }}>
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div style={{ padding: '8px 8px' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      background: n.read ? 'transparent' : 'rgba(6, 182, 212, 0.04)',
                      borderLeft: n.read
                        ? '3px solid transparent'
                        : '3px solid var(--brand-500)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(148, 163, 184, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = n.read
                        ? 'transparent'
                        : 'rgba(6, 182, 212, 0.04)';
                    }}
                    onClick={() => {
                      setNotifications((prev) =>
                        prev.map((item) =>
                          item.id === n.id ? { ...item, read: true } : item
                        )
                      );
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: n.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <n.icon size={16} color={n.iconColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: n.read ? 500 : 600,
                          color: n.read ? '#cbd5e1' : '#f8fafc',
                          lineHeight: 1.3,
                        }}
                      >
                        {n.title}
                      </p>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.subtitle}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        color: '#475569',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        marginTop: 3,
                      }}
                    >
                      {n.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EditProfileModal({ isOpen, onClose }) {
  const { user, apiFetch, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(user?.name || '');
      setUsername(user?.username || '');
      setCurrentPassword('');
      setNewPassword('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (newPassword && !currentPassword) {
      setError('Current password is required to change password.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          username,
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile.');
      }

      const data = await res.json();
      updateProfile(data.user, data.token);
      setSuccess('Profile updated successfully!');
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User Profile">
      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            fontSize: '0.8125rem',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            color: '#4ade80',
            fontSize: '0.8125rem',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label" htmlFor="profile-name">
            Full Name
          </label>
          <input
            id="profile-name"
            className="form-input"
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label" htmlFor="profile-username">
            Username
          </label>
          <input
            id="profile-username"
            className="form-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div style={{ borderTop: '1px solid var(--surface-700)', margin: '20px 0 16px 0', paddingTop: '16px' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--brand-400)', marginBottom: 12 }}>
            Change Password (Optional)
          </p>
          
          <div style={{ marginBottom: 12 }}>
            <label className="form-label" htmlFor="profile-current-password">
              Current Password
            </label>
            <input
              id="profile-current-password"
              className="form-input"
              type="password"
              placeholder="Required to change password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div style={{ marginBottom: 4 }}>
            <label className="form-label" htmlFor="profile-new-password">
              New Password
            </label>
            <input
              id="profile-new-password"
              className="form-input"
              type="password"
              placeholder="Leave blank to keep current password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/finance', label: 'Finance', icon: IndianRupee },
  { to: '/profit-loss', label: 'P&L Report', icon: TrendingUp },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/insight', label: 'Analytics', icon: Lightbulb}

];

const PAGE_TITLES = {
  '/': 'Operations Hub',
  '/dashboard': 'Dashboard Overview',
  '/inventory': 'Stock Inventory',
  '/finance': 'Expense & Sales Tracking',
  '/profit-loss': 'Profit & Loss Report',
  '/profile': 'Profile & User Management',
  '/insight': 'Business Analytics'
};

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'GoliOps';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
              }}
            >
              <Droplets size={22} color="#fff" />
            </div>
            <div>
              <h1
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 800,
                  color: '#f8fafc',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                GoliOps
              </h1>
              <p
                style={{
                  fontSize: '0.6875rem',
                  color: '#64748b',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                }}
              >
                UDAY FOOD &amp; BEVERAGES
              </p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              style={{ position: 'relative' }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div
          style={{
            padding: '16px 14px',
            borderTop: '1px solid var(--surface-700)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'linear-gradient(135deg, var(--surface-600), var(--surface-700))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={16} color="#94a3b8" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Admin'}
              </p>
              <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                {user?.role || 'Admin'}
              </p>
            </div>
            <button
              id="edit-profile-sidebar-btn"
              className="btn btn-ghost"
              style={{ padding: 6, minWidth: 0, color: 'var(--brand-400)' }}
              title="Profile & User Settings"
              onClick={() => navigate('/profile')}
            >
              <User size={14} />
            </button>
          </div>
          <button className="btn btn-ghost" onClick={logout} style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburger — only visible on mobile via CSS */}
            <button
              id="mobile-menu-btn"
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#f8fafc',
              }}
            >
              {pageTitle}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationPanel />
            <div
              className="top-header-date"
              style={{
                fontSize: '0.8125rem',
                color: '#94a3b8',
                fontWeight: 500,
              }}
            >
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


// ==========================================
// 3. PAGES
// ==========================================

export function Profile() {
  const { user, apiFetch, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('my-profile'); // 'my-profile' | 'user-accounts'
  
  // Core Profile state
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Dynamic Details state
  const [details, setDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [newDetailLabel, setNewDetailLabel] = useState('');
  const [newDetailValue, setNewDetailValue] = useState('');
  const [detailError, setDetailError] = useState('');
  const [detailSuccess, setDetailSuccess] = useState('');
  const [editingDetailId, setEditingDetailId] = useState(null);
  const [editingDetailValue, setEditingDetailValue] = useState('');

  // User Accounts state (Admin/Manager only)
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null for create, user object for edit
  const [userFormUsername, setUserFormUsername] = useState('');
  const [userFormName, setUserFormName] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormRole, setUserFormRole] = useState('Manager');
  const [userFormError, setUserFormError] = useState('');
  const [userFormSuccess, setUserFormSuccess] = useState('');
  const [userFormSubmitting, setUserFormSubmitting] = useState(false);

  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';
  const isAdmin = user?.role === 'Admin';

  // Fetch dynamic details
  const fetchDetails = useCallback(async () => {
    setDetailsLoading(true);
    try {
      const res = await apiFetch('/api/auth/profile/details');
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setDetailsLoading(false);
    }
  }, [apiFetch]);

  // Fetch all users (Admin/Manager only)
  const fetchUsers = useCallback(async () => {
    if (!isAdminOrManager) return;
    setUsersLoading(true);
    try {
      const res = await apiFetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to load users list:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [apiFetch, isAdminOrManager]);

  useEffect(() => {
    fetchDetails();
    if (isAdminOrManager) {
      fetchUsers();
    }
  }, [fetchDetails, fetchUsers, isAdminOrManager]);

  // Handle core profile submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSubmitting(true);

    if (newPassword && !currentPassword) {
      setProfileError('Current password is required to change password.');
      setProfileSubmitting(false);
      return;
    }

    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, username, currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile.');
      }

      const data = await res.json();
      updateProfile(data.user, data.token);
      setProfileSuccess('Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Handle add/update dynamic detail
  const handleAddDetail = async (e) => {
    e.preventDefault();
    setDetailError('');
    setDetailSuccess('');
    if (!newDetailLabel.trim() || !newDetailValue.trim()) {
      setDetailError('Label and value are required.');
      return;
    }

    try {
      const res = await apiFetch('/api/auth/profile/details', {
        method: 'POST',
        body: JSON.stringify({ label: newDetailLabel.trim(), value: newDetailValue.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save detail.');
      }

      setNewDetailLabel('');
      setNewDetailValue('');
      setDetailSuccess('Detail added successfully!');
      fetchDetails();
    } catch (err) {
      setDetailError(err.message);
    }
  };

  // Handle edit inline dynamic detail
  const handleSaveInlineDetail = async (label, value) => {
    try {
      const res = await apiFetch('/api/auth/profile/details', {
        method: 'POST',
        body: JSON.stringify({ label, value }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update detail.');
      }
      setEditingDetailId(null);
      fetchDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle delete dynamic detail
  const handleDeleteDetail = async (id) => {
    if (!confirm('Are you sure you want to delete this detail?')) return;
    try {
      const res = await apiFetch(`/api/auth/profile/details/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete detail.');
      }
      fetchDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle create/edit user submit (Admin only)
  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    setUserFormError('');
    setUserFormSuccess('');
    setUserFormSubmitting(true);

    if (!editingUser && !userFormPassword) {
      setUserFormError('Password is required for new users.');
      setUserFormSubmitting(false);
      return;
    }

    const payload = {
      username: userFormUsername,
      name: userFormName,
      role: userFormRole,
    };
    if (userFormPassword) {
      payload.password = userFormPassword;
    }

    try {
      const url = editingUser ? `/api/auth/users/${editingUser.id}` : '/api/auth/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save user.');
      }

      setUserFormSuccess(editingUser ? 'User updated successfully!' : 'User created successfully!');
      setTimeout(() => {
        setUserModalOpen(false);
        fetchUsers();
      }, 1000);
    } catch (err) {
      setUserFormError(err.message);
    } finally {
      setUserFormSubmitting(false);
    }
  };

  // Open user creation modal
  const openCreateUserModal = () => {
    setEditingUser(null);
    setUserFormUsername('');
    setUserFormName('');
    setUserFormPassword('');
    setUserFormRole('Manager');
    setUserFormError('');
    setUserFormSuccess('');
    setUserModalOpen(true);
  };

  // Open user edit modal
  const openEditUserModal = (editUser) => {
    setEditingUser(editUser);
    setUserFormUsername(editUser.username);
    setUserFormName(editUser.name);
    setUserFormPassword('');
    setUserFormRole(editUser.role);
    setUserFormError('');
    setUserFormSuccess('');
    setUserModalOpen(true);
  };

  // Handle delete user (Admin only)
  const handleDeleteUser = async (deleteUserId) => {
    if (!confirm('Are you sure you want to delete this user profile? This action is permanent.')) return;
    try {
      const res = await apiFetch(`/api/auth/users/${deleteUserId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user.');
      }
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {isAdminOrManager && (
        <div style={{ maxWidth: 400, margin: '0 auto 8px auto', width: '100%' }}>
          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === 'my-profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-profile')}
            >
              My Profile
            </button>
            <button
              className={`tab-btn ${activeTab === 'user-accounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('user-accounts')}
            >
              User Accounts
            </button>
          </div>
        </div>
      )}

      {activeTab === 'my-profile' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
          
          {/* CORE DETAILS EDIT */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="var(--brand-400)" /> Core Profile Details
            </h3>

            {profileError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.8125rem', marginBottom: 16, textAlign: 'center' }}>
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#4ade80', fontSize: '0.8125rem', marginBottom: 16, textAlign: 'center' }}>
                {profileSuccess}
              </div>
            )}

            <form onSubmit={handleProfileSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="core-name">Full Name</label>
                <input
                  id="core-name"
                  className="form-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="core-username">Username</label>
                <input
                  id="core-username"
                  className="form-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Role</label>
                <input
                  className="form-input"
                  type="text"
                  value={user?.role || ''}
                  disabled
                  style={{ background: 'var(--surface-800)', cursor: 'not-allowed', color: 'var(--surface-400)' }}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--surface-700)', margin: '24px 0 16px 0', paddingTop: '16px' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--brand-400)', marginBottom: 12 }}>
                  Change Password (Optional)
                </p>
                
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label" htmlFor="core-current-password">Current Password</label>
                  <input
                    id="core-current-password"
                    className="form-input"
                    type="password"
                    placeholder="Required to set new password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                <div style={{ marginBottom: 4 }}>
                  <label className="form-label" htmlFor="core-new-password">New Password</label>
                  <input
                    id="core-new-password"
                    className="form-input"
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="submit" className="btn btn-primary" disabled={profileSubmitting} style={{ width: '100%', justifyContent: 'center' }}>
                  {profileSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Update Core Details'}
                </button>
              </div>
            </form>
          </div>

          {/* DYNAMIC ADDITIONAL DETAILS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* LIST OF DETAILS */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="var(--brand-400)" /> Additional Contact & Profile Info
              </h3>

              {detailsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="skeleton" style={{ height: 50, borderRadius: 10 }} />
                  <div className="skeleton" style={{ height: 50, borderRadius: 10 }} />
                </div>
              ) : details.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--surface-400)' }}>No additional details added yet.</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--surface-500)', marginTop: 4 }}>Add details below (e.g. Email, Phone, Office Address)</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {details.map((detail) => (
                    <div
                      key={detail.id}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(21, 29, 46, 0.4)',
                        border: '1px solid var(--surface-700)',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brand-400)', letterSpacing: '0.05em' }}>
                          {detail.label}
                        </span>
                        
                        {editingDetailId === detail.id ? (
                          <div style={{ display: 'flex', gap: 8, marginTop: 4, width: '100%' }}>
                            <input
                              className="form-input"
                              type="text"
                              value={editingDetailValue}
                              onChange={(e) => setEditingDetailValue(e.target.value)}
                              style={{ padding: '4px 8px', fontSize: '0.8125rem' }}
                              autoFocus
                            />
                            <button
                              className="btn btn-success"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => handleSaveInlineDetail(detail.label, editingDetailValue)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => setEditingDetailId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {detail.value}
                          </p>
                        )}
                      </div>
                      
                      {editingDetailId !== detail.id && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: 6, minWidth: 0, color: 'var(--surface-300)' }}
                            title="Edit detail"
                            onClick={() => {
                              setEditingDetailId(detail.id);
                              setEditingDetailValue(detail.value);
                            }}
                          >
                            <User size={14} />
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: 6, minWidth: 0, color: '#f87171' }}
                            title="Delete detail"
                            onClick={() => handleDeleteDetail(detail.id)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CREATE / UPDATE ADDITIONAL DETAIL FORM */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
                Create / Edit Custom Detail
              </h3>

              {detailError && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.75rem', marginBottom: 12, textAlign: 'center' }}>
                  {detailError}
                </div>
              )}
              {detailSuccess && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.15)', color: '#4ade80', fontSize: '0.75rem', marginBottom: 12, textAlign: 'center' }}>
                  {detailSuccess}
                </div>
              )}

              <form onSubmit={handleAddDetail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label" htmlFor="new-detail-label">Detail Label</label>
                  <input
                    id="new-detail-label"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Email, Phone, Desk Location, Address"
                    value={newDetailLabel}
                    onChange={(e) => setNewDetailLabel(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="new-detail-value">Detail Value</label>
                  <input
                    id="new-detail-value"
                    className="form-input"
                    type="text"
                    placeholder="e.g. contact@domain.com, +91 ..."
                    value={newDetailValue}
                    onChange={(e) => setNewDetailValue(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 8 }}>
                  <Plus size={16} /> Save Detail
                </button>
              </form>
            </div>

          </div>
        </div>
      ) : (
        /* USER MANAGEMENT SUB-VIEW */
        <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc' }}>User Profiles</h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
                {isAdmin ? 'Manage GoliOps system users and credentials.' : 'View system users and their roles.'}
              </p>
            </div>
            {isAdmin && (
              <button className="btn btn-primary" onClick={openCreateUserModal}>
                <Plus size={16} /> Create User Account
              </button>
            )}
          </div>

          {usersLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="skeleton" style={{ height: 44, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 44, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 44, borderRadius: 8 }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 700, color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                          #{u.id}
                        </td>
                        <td style={{ color: '#f8fafc', fontWeight: 600 }}>
                          {u.name} {isSelf && <span className="badge badge-neutral" style={{ fontSize: '0.625rem', padding: '1px 5px', marginLeft: 6 }}>You</span>}
                        </td>
                        <td style={{ color: '#cbd5e1' }}>
                          @{u.username}
                        </td>
                        <td>
                          <span className={`badge ${u.role === 'Admin' ? 'badge-success' : 'badge-info'}`}>
                            {u.role}
                          </span>
                        </td>
                        {isAdmin && (
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                className="btn btn-ghost"
                                style={{ padding: 6, minWidth: 0, color: 'var(--brand-400)' }}
                                onClick={() => openEditUserModal(u)}
                                title="Edit user profile"
                              >
                                <User size={14} />
                              </button>
                              <button
                                className="btn btn-ghost"
                                style={{ padding: 6, minWidth: 0, color: isSelf ? 'var(--surface-600)' : '#f87171' }}
                                onClick={() => !isSelf && handleDeleteUser(u.id)}
                                disabled={isSelf}
                                title={isSelf ? 'You cannot delete yourself' : 'Delete user profile'}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* USER CREATE / EDIT MODAL */}
          <Modal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} title={editingUser ? `Edit User: ${editingUser.name}` : 'Create New User Profile'}>
            {userFormError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.8125rem', marginBottom: 16, textAlign: 'center' }}>
                {userFormError}
              </div>
            )}
            {userFormSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#4ade80', fontSize: '0.8125rem', marginBottom: 16, textAlign: 'center' }}>
                {userFormSuccess}
              </div>
            )}

            <form onSubmit={handleUserFormSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="user-form-name">Full Name</label>
                <input
                  id="user-form-name"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Rahul Kumar"
                  value={userFormName}
                  onChange={(e) => setUserFormName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="user-form-username">Username</label>
                <input
                  id="user-form-username"
                  className="form-input"
                  type="text"
                  placeholder="e.g. rahul123"
                  value={userFormUsername}
                  onChange={(e) => setUserFormUsername(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="user-form-role">System Role</label>
                <select
                  id="user-form-role"
                  className="form-input form-select"
                  value={userFormRole}
                  onChange={(e) => setUserFormRole(e.target.value)}
                  required
                >
                  <option value="Manager">Manager (Read & Write Sales/Inventory)</option>
                  <option value="Admin">Admin (Full Control)</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="user-form-password">
                  {editingUser ? 'Password (Leave blank to keep existing)' : 'Account Password'}
                </label>
                <input
                  id="user-form-password"
                  className="form-input"
                  type="password"
                  placeholder={editingUser ? '••••••••' : 'Enter account password'}
                  value={userFormPassword}
                  onChange={(e) => setUserFormPassword(e.target.value)}
                  required={!editingUser}
                  autoComplete="new-password"
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setUserModalOpen(false)}
                  disabled={userFormSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={userFormSubmitting}
                >
                  {userFormSubmitting ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Saving...
                    </>
                  ) : (
                    editingUser ? 'Save User Changes' : 'Create Account'
                  )}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="animate-scale-in" style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(6, 182, 212, 0.35)',
              marginBottom: 16,
            }}
          >
            <Droplets size={32} color="#fff" />
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#f8fafc',
              letterSpacing: '-0.02em',
            }}
          >
            GoliOps
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#64748b',
              marginTop: 4,
            }}
          >
            Inventory & Finance Management
          </p>
          <p
            style={{
              fontSize: '0.6875rem',
              color: '#475569',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            Uday Food & Beverages
          </p>
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#e2e8f0',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            Sign in to your account
          </h2>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                fontSize: '0.8125rem',
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label className="form-label" htmlFor="login-username">
                Username
              </label>
              <input
                id="login-username"
                className="form-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 2,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 20px',
                fontSize: '0.9375rem',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: 24,
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.12)',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onClick={() => {
              setUsername('admin');
              setPassword('admin123');
            }}
            title="Click to autofill credentials"
          >
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa', marginBottom: 8 }}>
              Demo Credentials (Click to Autofill)
            </p>
            <div style={{ display: 'flex', gap: 24, fontSize: '0.8125rem', color: '#94a3b8' }}>
              <div>
                <span style={{ color: '#64748b' }}>User: </span>
                <code style={{ color: '#e2e8f0', fontWeight: 600 }}>admin</code>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Pass: </span>
                <code style={{ color: '#e2e8f0', fontWeight: 600 }}>admin123</code>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function Home() {
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [sales, setSales] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [enquiries, setEnquiries] = useState([]);

  useEffect(() => {
    async function loadAll() {
      try {
        const [dashRes, lowRes, prodRes, txnRes, expRes, salRes, pnlRes, enqRes] =
          await Promise.all([
            apiFetch('/api/reports/dashboard'),
            apiFetch('/api/inventory/low-stock'),
            apiFetch('/api/inventory/products'),
            apiFetch('/api/inventory/transactions'),
            apiFetch('/api/expenses'),
            apiFetch('/api/sales'),
            apiFetch('/api/reports/pnl'),
            apiFetch('/api/enquiry'),
          ]);

        setDashboard(await dashRes.json());
        setLowStock(await lowRes.json());
        setProducts(await prodRes.json());
        setTransactions(await txnRes.json());
        setExpenses(await expRes.json());
        setSales(await salRes.json());
        setPnl(await pnlRes.json());
        const enqData = await enqRes.json();
        setEnquiries(Array.isArray(enqData) ? enqData : []);
      } catch (err) {
        console.error('Home load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [apiFetch]);

  const updateEnquiryStatus = async (id, status) => {
    try {
      const res = await apiFetch(`/api/enquiry/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setEnquiries((prev) =>
          prev.map((e) => (e.id === id ? data.enquiry : e))
        );
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 64, borderRadius: 16, marginBottom: 28 }} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
            marginBottom: 28,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
        </div>
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </div>
    );
  }

  const isProfit = pnl && pnl.netProfit >= 0;
  const topProducts = [...products].sort((a, b) => a.stock - b.stock).slice(0, 5);
  const catColors = {
    'Raw Materials': '#3b82f6',
    Packaging: '#8b5cf6',
    Logistics: '#f59e0b',
    Overheads: '#ef4444',
  };

  return (
    <div className="animate-fade-in">
      <div
        className="glass-card home-greeting"
        style={{
          padding: '24px 28px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background:
            'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(30, 41, 59, 0.7) 60%, rgba(17, 24, 39, 0.85) 100%)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Sparkles size={18} color="#22d3ee" />
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#22d3ee',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Operations Hub
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>
            {greeting()}, {user?.name || 'Admin'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: 4 }}>
            Here's a complete snapshot of Uday Food & Beverages today.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 10,
            background: 'rgba(148, 163, 184, 0.06)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
          }}
        >
          <Clock size={14} color="#64748b" />
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          marginBottom: 28,
        }}
        className="stagger-children kpi-grid"
      >
        <KPICard
          icon={Package}
          label="Total Stock"
          value={`${dashboard?.totalStock?.toLocaleString('en-IN') || 0} units`}
          subtitle={`${dashboard?.totalProducts || 0} SKUs · ${dashboard?.lowStockCount || 0} alerts`}
          accentColor="#3b82f6"
          delay={0}
        />
        <KPICard
          icon={IndianRupee}
          label="Revenue This Month"
          value={fmt(dashboard?.revenueThisMonth || 0)}
          subtitle={`${sales.length} sales recorded`}
          accentColor="#22c55e"
          delay={0.06}
        />
        <KPICard
          icon={TrendingDown}
          label="Expenses This Month"
          value={fmt(dashboard?.expensesThisMonth || 0)}
          subtitle={`${expenses.length} entries`}
          accentColor="#ef4444"
          delay={0.12}
        />
        <KPICard
          icon={isProfit ? TrendingUp : TrendingDown}
          label={`Net ${isProfit ? 'Profit' : 'Loss'}`}
          value={fmt(Math.abs(pnl?.netProfit || 0))}
          subtitle={`${pnl?.margin || 0}% margin`}
          accentColor={isProfit ? '#22c55e' : '#ef4444'}
          delay={0.18}
        />
      </div>

      <div className="panel-grid">

        <div className="glass-card animate-fade-in" style={{ padding: 24, animationDelay: '0.2s' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={16} color="#f87171" />
              </div>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                  Low-Stock Alerts
                </h3>
                <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>Below 50-unit threshold</p>
              </div>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => navigate('/inventory')}
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          {lowStock.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <Package size={32} color="#334155" style={{ marginBottom: 8 }} />
              <p style={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>
                All stock levels healthy
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lowStock.map((item, idx) => (
                <div
                  key={item.id}
                  className="alert-flash animate-fade-in"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    animationDelay: `${0.25 + idx * 0.05}s`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle size={14} color="#f87171" />
                    <div>
                      <p style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.8125rem' }}>
                        {item.name}
                      </p>
                      <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                        {item.variant} · {item.batch}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-danger" style={{ fontSize: '0.6875rem' }}>
                    {item.stock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {pnl && (
          <div
            className="glass-card animate-fade-in"
            style={{ padding: 24, animationDelay: '0.25s' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: 'rgba(6, 182, 212, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BarChart3 size={16} color="#22d3ee" />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                    P&L Summary
                  </h3>
                  <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{pnl.period}</p>
                </div>
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/profit-loss')}
                style={{ fontSize: '0.75rem', padding: '6px 10px' }}
              >
                Full Report <ArrowRight size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--surface-700)',
                }}
              >
                <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>Revenue</span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: '#4ade80',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmt(pnl.revenue)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--surface-700)',
                }}
              >
                <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>
                  Cost of Goods Sold
                </span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#f87171',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  − {fmt(pnl.cogs)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--surface-700)',
                }}
              >
                <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>
                  Operating Expenses
                </span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#0891b2',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  − {fmt(pnl.operatingExpenses)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 12px',
                  marginTop: 8,
                  borderRadius: 10,
                  background: isProfit
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))'
                    : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))',
                  border: `1px solid ${isProfit ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isProfit ? (
                    <TrendingUp size={18} color="#4ade80" />
                  ) : (
                    <TrendingDown size={18} color="#f87171" />
                  )}
                  <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9375rem' }}>
                    Net {isProfit ? 'Profit' : 'Loss'}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: isProfit ? '#4ade80' : '#f87171',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmt(Math.abs(pnl.netProfit))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="panel-grid">

        <div className="glass-card animate-fade-in" style={{ overflow: 'hidden', animationDelay: '0.3s' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'rgba(59, 130, 246, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Boxes size={16} color="#60a5fa" />
              </div>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                  Inventory Snapshot
                </h3>
                <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                  Sorted by lowest stock
                </p>
              </div>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => navigate('/inventory')}
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              Manage <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.8125rem' }}>
                      {p.name}
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{p.variant}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '0.8125rem',
                      }}
                    >
                      {p.stock.toLocaleString('en-IN')}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '0.8125rem',
                      }}
                    >
                      ₹{p.sellingPrice.toFixed(0)}
                    </td>
                    <td>
                      {p.stock < 50 ? (
                        <span className="badge badge-danger" style={{ fontSize: '0.6875rem' }}>
                          Low
                        </span>
                      ) : p.stock < 200 ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                          Moderate
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                          Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {pnl && (
          <div
            className="glass-card animate-fade-in"
            style={{ padding: 24, animationDelay: '0.35s' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wallet size={16} color="#f87171" />
              </div>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                  Expense Breakdown
                </h3>
                <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                  Total: {fmt(pnl.operatingExpenses)}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(pnl.expenseBreakdown).map(([cat, amount]) => {
                const total = pnl.operatingExpenses;
                const pct = total > 0 ? ((amount / total) * 100).toFixed(0) : 0;
                const color = catColors[cat] || '#64748b';

                return (
                  <div key={cat}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>{cat}</span>
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: '#e2e8f0',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fmt(amount)}{' '}
                        <span style={{ color: '#64748b', fontWeight: 400 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        background: 'var(--surface-700)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: color,
                          transition: 'width 0.8s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="panel-grid">

        <div
          className="glass-card animate-fade-in"
          style={{ overflow: 'hidden', animationDelay: '0.4s' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'rgba(34, 197, 94, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShoppingCart size={16} color="#4ade80" />
              </div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                Recent Sales
              </h3>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => navigate('/finance')}
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          {sales.length === 0 ? (
            <div className="empty-state" style={{ padding: '28px 16px' }}>
              <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>No sales recorded.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Buyer</th>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 5).map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{s.buyer}</td>
                      <td style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                        {s.productName || s.productId}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#4ade80',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {fmt(s.amount)}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          className="glass-card animate-fade-in"
          style={{ overflow: 'hidden', animationDelay: '0.45s' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'rgba(6, 182, 212, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wallet size={16} color="#0891b2" />
              </div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                Recent Expenses
              </h3>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => navigate('/finance')}
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          {expenses.length === 0 ? (
            <div className="empty-state" style={{ padding: '28px 16px' }}>
              <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>No expenses recorded.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 5).map((exp) => (
                    <tr key={exp.id}>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${catColors[exp.category] || '#64748b'}18`,
                            color: catColors[exp.category] || '#94a3b8',
                            fontSize: '0.6875rem',
                          }}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: '0.8125rem',
                          color: '#94a3b8',
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {exp.description || '—'}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {fmt(exp.amount)}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{exp.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div
        className="glass-card animate-fade-in"
        style={{ overflow: 'hidden', marginBottom: 24, animationDelay: '0.5s' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'rgba(148, 163, 184, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowDownToLine size={16} color="#94a3b8" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                Recent Stock Movements
              </h3>
              <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                Latest IN/OUT transactions
              </p>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/inventory')}
            style={{ fontSize: '0.75rem', padding: '6px 10px' }}
          >
            View All <ArrowRight size={12} />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state" style={{ padding: '28px 16px' }}>
            <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>No transactions yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th>Date</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 6).map((t) => {
                  const prod = products.find((p) => p.id === t.productId);
                  return (
                    <tr key={t.id}>
                      <td>
                        <code style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{t.id}</code>
                      </td>
                      <td>
                        {t.type === 'IN' ? (
                          <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                            <ArrowDownToLine size={10} /> IN
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.6875rem' }}>
                            <ArrowUpFromLine size={10} /> OUT
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 500, fontSize: '0.8125rem' }}>
                        {prod?.name || t.productId}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {t.quantity}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.date}</td>
                      <td
                        style={{
                          color: '#94a3b8',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {t.note || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Enquiries Panel ── */}
      <div
        className="glass-card animate-fade-in"
        style={{ overflow: 'hidden', marginBottom: 24, animationDelay: '0.55s' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--surface-700)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'rgba(168, 85, 247, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FileText size={16} color="#c084fc" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                Enquiries
              </h3>
              <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                {enquiries.length} total · {enquiries.filter(e => e.status === 'new').length} new
              </p>
            </div>
          </div>
          {enquiries.filter(e => e.status === 'new').length > 0 && (
            <span
              className="badge"
              style={{
                background: 'rgba(168,85,247,0.15)',
                color: '#c084fc',
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '3px 10px',
              }}
            >
              {enquiries.filter(e => e.status === 'new').length} new
            </span>
          )}
        </div>

        {enquiries.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <FileText size={32} color="#334155" style={{ marginBottom: 8 }} />
            <p style={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>
              No enquiries yet
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Interest</th>
                  <th>Email</th>
                  <th>Message</th>
                  <th>Received</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enq) => {
                  const statusStyles = {
                    new:       { bg: 'rgba(168,85,247,0.12)', color: '#c084fc', label: 'New' },
                    contacted: { bg: 'rgba(6,182,212,0.12)',  color: '#22d3ee', label: 'Contacted' },
                    closed:    { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', label: 'Closed' },
                  };
                  const st = statusStyles[enq.status] || statusStyles.new;
                  return (
                    <tr
                      key={enq.id}
                      style={{
                        borderLeft: enq.status === 'new' ? '3px solid #c084fc' : '3px solid transparent',
                      }}
                    >
                      <td>
                        <code style={{ fontSize: '0.6875rem', color: '#64748b' }}>#{enq.id}</code>
                      </td>
                      <td style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.8125rem' }}>
                        {enq.company}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{enq.location}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: enq.interest === 'wholesale'
                              ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.12)',
                            color: enq.interest === 'wholesale' ? '#60a5fa' : '#4ade80',
                            fontSize: '0.6875rem',
                            textTransform: 'capitalize',
                          }}
                        >
                          {enq.interest}
                        </span>
                      </td>
                      <td>
                        <a
                          href={`mailto:${enq.email}`}
                          style={{ fontSize: '0.8125rem', color: '#22d3ee', textDecoration: 'none' }}
                        >
                          {enq.email}
                        </a>
                      </td>
                      <td
                        style={{
                          fontSize: '0.8125rem', color: '#94a3b8',
                          maxWidth: 220, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                        title={enq.message}
                      >
                        {enq.message}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(enq.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td>
                        <select
                          id={`enquiry-status-${enq.id}`}
                          value={enq.status}
                          onChange={(e) => updateEnquiryStatus(enq.id, e.target.value)}
                          style={{
                            background: st.bg,
                            color: st.color,
                            border: `1px solid ${st.color}40`,
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, lowRes] = await Promise.all([
          apiFetch('/api/reports/dashboard'),
          apiFetch('/api/inventory/low-stock'),
        ]);
        setDashboard(await dashRes.json());
        setLowStock(await lowRes.json());
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiFetch]);

  if (loading) {
    return (
      <div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            marginBottom: 28,
          }}
        >
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
      </div>
    );
  }

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          marginBottom: 28,
        }}
        className="stagger-children kpi-grid"
      >
        <KPICard
          icon={Package}
          label="Current Stock Health"
          value={`${dashboard?.totalStock?.toLocaleString('en-IN') || 0} units`}
          subtitle={`${dashboard?.totalProducts || 0} SKUs · ${dashboard?.lowStockCount || 0} below threshold`}
          accentColor="#3b82f6"
          delay={0}
        />
        <KPICard
          icon={IndianRupee}
          label="Revenue This Month"
          value={fmt(dashboard?.revenueThisMonth || 0)}
          subtitle="June 2026"
          accentColor="#22c55e"
          delay={0.08}
        />
        <KPICard
          icon={TrendingDown}
          label="Expenses This Month"
          value={fmt(dashboard?.expensesThisMonth || 0)}
          subtitle="June 2026"
          accentColor="#ef4444"
          delay={0.16}
        />
      </div>

      <div className="glass-card animate-fade-in" style={{ padding: 24, animationDelay: '0.24s' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} color="#f87171" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                Low-Stock Alerts
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Items below 50-unit threshold
              </p>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/inventory')}
            style={{ fontSize: '0.8125rem' }}
          >
            View All <ArrowRight size={14} />
          </button>
        </div>

        {lowStock.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <Package size={40} color="#334155" style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 600, color: '#64748b' }}>All stock levels healthy</p>
            <p style={{ fontSize: '0.8125rem', color: '#475569', marginTop: 4 }}>
              No items are currently below the 50-unit threshold.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lowStock.map((item, idx) => (
              <div
                key={item.id}
                className="alert-flash animate-fade-in"
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  animationDelay: `${0.3 + idx * 0.06}s`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <AlertTriangle size={16} color="#f87171" />
                  <div>
                    <p style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {item.variant} · {item.batch}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-danger">
                    {item.stock} units left
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Inventory() {
  const { apiFetch } = useAuth();
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [txnForm, setTxnForm] = useState({
    productId: '',
    type: 'IN',
    quantity: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [txnError, setTxnError] = useState('');

  // Add Product state
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodForm, setProdForm] = useState({
    id: '', name: '', variant: '', batch: '', stock: '', costPerUnit: '', sellingPrice: '',
  });
  const [prodSubmitting, setProdSubmitting] = useState(false);
  const [prodError, setProdError] = useState('');

  const loadData = async () => {
    try {
      const [prodRes, txnRes] = await Promise.all([
        apiFetch('/api/inventory/products'),
        apiFetch('/api/inventory/transactions'),
      ]);
      setProducts(await prodRes.json());
      setTransactions(await txnRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [apiFetch]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setProdError('');
    setProdSubmitting(true);
    try {
      const res = await apiFetch('/api/inventory/products', {
        method: 'POST',
        body: JSON.stringify(prodForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const newProduct = await res.json();
      setProducts(prev => [...prev, newProduct]);
      setProdForm({ id: '', name: '', variant: '', batch: '', stock: '', costPerUnit: '', sellingPrice: '' });
      setShowProductModal(false);
    } catch (err) {
      setProdError(err.message);
    } finally {
      setProdSubmitting(false);
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    setTxnError('');
    setSubmitting(true);

    try {
      const res = await apiFetch('/api/inventory/transaction', {
        method: 'POST',
        body: JSON.stringify(txnForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const data = await res.json();

      setProducts(prev =>
        prev.map(p => (p.id === data.updatedProduct.id ? data.updatedProduct : p))
      );
      setTransactions(prev => [data.transaction, ...prev]);

      setTxnForm({ productId: '', type: 'IN', quantity: '', note: '' });
      setShowModal(false);
    } catch (err) {
      setTxnError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter(p =>
    `${p.name} ${p.variant} ${p.batch} ${p.id}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 48, borderRadius: 10, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search
            size={16}
            color="#64748b"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            id="inventory-search"
            className="form-input"
            placeholder="Search by name, variant, batch, or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        <button
          id="add-product-btn"
          className="btn btn-success"
          onClick={() => setShowProductModal(true)}
        >
          <Plus size={16} />
          Add Product
        </button>
        <button
          id="log-transaction-btn"
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} />
          Log Transaction
        </button>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 24px' }}>
            <BoxSelect size={48} color="#334155" style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 600, color: '#64748b' }}>No products found</p>
            <p style={{ fontSize: '0.8125rem', color: '#475569', marginTop: 4 }}>
              {search ? 'Try a different search term.' : 'No products have been added yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Variant</th>
                  <th>Batch</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Cost/Unit</th>
                  <th style={{ textAlign: 'right' }}>Sell Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <code style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.id}</code>
                    </td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{p.name}</td>
                    <td>{p.variant}</td>
                    <td>
                      <code style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{p.batch}</code>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {p.stock.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{p.costPerUnit.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{p.sellingPrice.toFixed(2)}
                    </td>
                    <td>
                      {p.stock < 50 ? (
                        <span className="badge badge-danger">Low Stock</span>
                      ) : p.stock < 200 ? (
                        <span className="badge badge-warning">Moderate</span>
                      ) : (
                        <span className="badge badge-success">Healthy</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-card" style={{ marginTop: 24, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
            Recent Transactions
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
            Stock movements log
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <p style={{ color: '#64748b' }}>No transactions yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th>Date</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map(t => {
                  const prod = products.find(p => p.id === t.productId);
                  return (
                    <tr key={t.id}>
                      <td>
                        <code style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.id}</code>
                      </td>
                      <td>
                        {t.type === 'IN' ? (
                          <span className="badge badge-success">
                            <ArrowDownToLine size={12} /> IN
                          </span>
                        ) : (
                          <span className="badge badge-danger">
                            <ArrowUpFromLine size={12} /> OUT
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 500 }}>{prod?.name || t.productId}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {t.quantity}
                      </td>
                      <td>{t.date}</td>
                      <td style={{ color: '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.note || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setTxnError(''); }}
        title="Log Stock Transaction"
      >
        {txnError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              fontSize: '0.8125rem',
              marginBottom: 16,
            }}
          >
            {txnError}
          </div>
        )}

        <form onSubmit={handleTransaction}>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="txn-product">Product</label>
            <select
              id="txn-product"
              className="form-input form-select"
              value={txnForm.productId}
              onChange={e => setTxnForm(f => ({ ...f, productId: e.target.value }))}
              required
            >
              <option value="">Select product…</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.variant} (Stock: {p.stock})
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label className="form-label" htmlFor="txn-type">Type</label>
              <select
                id="txn-type"
                className="form-input form-select"
                value={txnForm.type}
                onChange={e => setTxnForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="IN">Stock IN (Production/Purchase)</option>
                <option value="OUT">Stock OUT (Dispatch/Sale)</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="txn-qty">Quantity</label>
              <input
                id="txn-qty"
                className="form-input"
                type="number"
                min="1"
                placeholder="e.g., 200"
                value={txnForm.quantity}
                onChange={e => setTxnForm(f => ({ ...f, quantity: e.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="form-label" htmlFor="txn-note">Note (Optional)</label>
            <input
              id="txn-note"
              className="form-input"
              placeholder="e.g., Production run #46"
              value={txnForm.note}
              onChange={e => setTxnForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setShowModal(false); setTxnError(''); }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : txnForm.type === 'IN' ? (
                <ArrowDownToLine size={16} />
              ) : (
                <ArrowUpFromLine size={16} />
              )}
              {submitting ? 'Saving…' : `Log ${txnForm.type}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => { setShowProductModal(false); setProdError(''); }}
        title="Add New Product (SKU)"
      >
        {prodError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              fontSize: '0.8125rem',
              marginBottom: 16,
            }}
          >
            {prodError}
          </div>
        )}

        <form onSubmit={handleAddProduct}>
          <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="form-label" htmlFor="prod-id">SKU ID</label>
              <input
                id="prod-id"
                className="form-input"
                placeholder="e.g., SKU-009"
                value={prodForm.id}
                onChange={e => setProdForm(f => ({ ...f, id: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="prod-name">Product Name</label>
              <input
                id="prod-name"
                className="form-input"
                placeholder="e.g., Pineapple Goli Soda"
                value={prodForm.name}
                onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="form-label" htmlFor="prod-variant">Variant</label>
              <input
                id="prod-variant"
                className="form-input"
                placeholder="e.g., Classic 200ml"
                value={prodForm.variant}
                onChange={e => setProdForm(f => ({ ...f, variant: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="prod-batch">Batch Number</label>
              <input
                id="prod-batch"
                className="form-input"
                placeholder="e.g., BATCH-1050"
                value={prodForm.batch}
                onChange={e => setProdForm(f => ({ ...f, batch: e.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div>
              <label className="form-label" htmlFor="prod-stock">Initial Stock</label>
              <input
                id="prod-stock"
                className="form-input"
                type="number"
                min="0"
                placeholder="e.g., 500"
                value={prodForm.stock}
                onChange={e => setProdForm(f => ({ ...f, stock: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="prod-cost">Cost/Unit (₹)</label>
              <input
                id="prod-cost"
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g., 9.50"
                value={prodForm.costPerUnit}
                onChange={e => setProdForm(f => ({ ...f, costPerUnit: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="prod-price">Sell Price (₹)</label>
              <input
                id="prod-price"
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g., 17.00"
                value={prodForm.sellingPrice}
                onChange={e => setProdForm(f => ({ ...f, sellingPrice: e.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setShowProductModal(false); setProdError(''); }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={prodSubmitting}>
              {prodSubmitting ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Package size={16} />
              )}
              {prodSubmitting ? 'Adding…' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function Finance() {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('expenses');
  const [expenses, setExpenses] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expForm, setExpForm] = useState({ category: '', amount: '', date: '', description: '' });
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [expError, setExpError] = useState('');

  const [salForm, setSalForm] = useState({ productId: '', quantity: '', buyer: '', buyerType: 'Retailer', date: '', amount: '' });
  const [salSubmitting, setSalSubmitting] = useState(false);
  const [salError, setSalError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [expRes, salRes, catRes, prodRes] = await Promise.all([
          apiFetch('/api/expenses'),
          apiFetch('/api/sales'),
          apiFetch('/api/expenses/categories'),
          apiFetch('/api/inventory/products'),
        ]);
        setExpenses(await expRes.json());
        setSales(await salRes.json());
        setCategories(await catRes.json());
        setProducts(await prodRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiFetch]);

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setExpError('');
    setExpSubmitting(true);
    try {
      const res = await apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(expForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const newExp = await res.json();
      setExpenses(prev => [newExp, ...prev]);
      setExpForm({ category: '', amount: '', date: '', description: '' });
    } catch (err) {
      setExpError(err.message);
    } finally {
      setExpSubmitting(false);
    }
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    setSalError('');
    setSalSubmitting(true);
    try {
      const res = await apiFetch('/api/sales', {
        method: 'POST',
        body: JSON.stringify(salForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const newSale = await res.json();
      setSales(prev => [newSale, ...prev]);
      setSalForm({ productId: '', quantity: '', buyer: '', buyerType: 'Retailer', date: '', amount: '' });
    } catch (err) {
      setSalError(err.message);
    } finally {
      setSalSubmitting(false);
    }
  };

  const fmt = n => `₹${Number(n).toLocaleString('en-IN')}`;

  const categoryColors = {
    'Raw Materials': '#3b82f6',
    'Packaging': '#8b5cf6',
    'Logistics': '#f59e0b',
    'Overheads': '#ef4444',
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 48, borderRadius: 12, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="tab-bar" style={{ marginBottom: 28, maxWidth: 360 }}>
        <button
          className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          <Wallet size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Expenses
        </button>
        <button
          className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          <ShoppingCart size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Sales
        </button>
      </div>

      {activeTab === 'expenses' && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: 18 }}>
              Record New Expense
            </h3>

            {expError && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.8125rem', marginBottom: 16,
              }}>
                {expError}
              </div>
            )}

            <form onSubmit={handleExpenseSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="form-label" htmlFor="exp-category">Category</label>
                  <select
                    id="exp-category"
                    className="form-input form-select"
                    value={expForm.category}
                    onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}
                    required
                  >
                    <option value="">Select category…</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="exp-amount">Amount (₹)</label>
                  <input
                    id="exp-amount"
                    className="form-input"
                    type="number"
                    min="1"
                    placeholder="e.g., 15000"
                    value={expForm.amount}
                    onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="exp-date">Date</label>
                  <input
                    id="exp-date"
                    className="form-input"
                    type="date"
                    value={expForm.date}
                    onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="exp-desc">Description</label>
                  <input
                    id="exp-desc"
                    className="form-input"
                    placeholder="e.g., Sugar procurement from Chennai supplier"
                    value={expForm.description}
                    onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={expSubmitting} style={{ whiteSpace: 'nowrap' }}>
                  {expSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                  {expSubmitting ? 'Saving…' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Recent Expenses</h3>
            </div>
            {expenses.length === 0 ? (
              <div className="empty-state">
                <ListX size={40} color="#334155" style={{ marginBottom: 12 }} />
                <p style={{ color: '#64748b' }}>No expenses recorded yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Date</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(exp => (
                      <tr key={exp.id}>
                        <td><code style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{exp.id}</code></td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: `${categoryColors[exp.category] || '#64748b'}18`,
                              color: categoryColors[exp.category] || '#94a3b8',
                            }}
                          >
                            {exp.category}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(exp.amount)}
                        </td>
                        <td>{exp.date}</td>
                        <td style={{ color: '#94a3b8', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {exp.description || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: 18 }}>
              Record New Sale
            </h3>

            {salError && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.8125rem', marginBottom: 16,
              }}>
                {salError}
              </div>
            )}

            <form onSubmit={handleSaleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="form-label" htmlFor="sal-product">Product</label>
                  <select
                    id="sal-product"
                    className="form-input form-select"
                    value={salForm.productId}
                    onChange={e => setSalForm(f => ({ ...f, productId: e.target.value }))}
                    required
                  >
                    <option value="">Select product…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.variant}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="sal-qty">Quantity Sold</label>
                  <input
                    id="sal-qty"
                    className="form-input"
                    type="number"
                    min="1"
                    placeholder="e.g., 150"
                    value={salForm.quantity}
                    onChange={e => setSalForm(f => ({ ...f, quantity: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="sal-amount">Amount Received (₹)</label>
                  <input
                    id="sal-amount"
                    className="form-input"
                    type="number"
                    min="1"
                    placeholder="e.g., 2250"
                    value={salForm.amount}
                    onChange={e => setSalForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="form-label" htmlFor="sal-buyer">Buyer</label>
                  <input
                    id="sal-buyer"
                    className="form-input"
                    placeholder="e.g., Krishna Distributors"
                    value={salForm.buyer}
                    onChange={e => setSalForm(f => ({ ...f, buyer: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="sal-buyertype">Buyer Type</label>
                  <select
                    id="sal-buyertype"
                    className="form-input form-select"
                    value={salForm.buyerType}
                    onChange={e => setSalForm(f => ({ ...f, buyerType: e.target.value }))}
                  >
                    <option value="Retailer">Retailer</option>
                    <option value="Distributor">Distributor</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="sal-date">Date</label>
                  <input
                    id="sal-date"
                    className="form-input"
                    type="date"
                    value={salForm.date}
                    onChange={e => setSalForm(f => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-success" disabled={salSubmitting}>
                  {salSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                  {salSubmitting ? 'Saving…' : 'Record Sale'}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Recent Sales</h3>
            </div>
            {sales.length === 0 ? (
              <div className="empty-state">
                <ListX size={40} color="#334155" style={{ marginBottom: 12 }} />
                <p style={{ color: '#64748b' }}>No sales recorded yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Product</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th>Buyer</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(s => (
                      <tr key={s.id}>
                        <td><code style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.id}</code></td>
                        <td style={{ fontWeight: 500 }}>{s.productName || s.productId}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.quantity}</td>
                        <td>{s.buyer}</td>
                        <td>
                          <span className={`badge ${s.buyerType === 'Distributor' ? 'badge-info' : 'badge-neutral'}`}>
                            {s.buyerType}
                          </span>
                        </td>
                        <td>{s.date}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#4ade80', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(s.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfitLoss() {
  const { apiFetch } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/api/reports/pnl');
        setReport(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiFetch]);

  const fmt = n => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  const handleExportCSV = () => {
    console.log("CSV Export clicked, report:", report);
    if (!report) return;
    const csvContent = [
      ['GoliOps P&L Report', report.period],
      [],
      ['Metric', 'Amount (INR)'],
      ['Total Revenue', report.revenue],
      ['Cost of Goods Sold (COGS)', report.cogs],
      ['Gross Profit', report.grossProfit],
      ['Operating Expenses', report.operatingExpenses],
      ['Net Profit', report.netProfit],
      ['Profit Margin', `${report.margin}%`],
      [],
      ['Expense Breakdown'],
      ...Object.entries(report.expenseBreakdown).map(([k, v]) => [k, v]),
      [],
      ['Revenue by Product'],
      ...Object.entries(report.revenueByProduct).map(([k, v]) => [k, v]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GoliOps_PnL_${report.period.replace(/\s/g, '_')}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    alert('CSV Export downloaded successfully. Please check your Downloads folder.');
  };

  const handleExportPDF = () => {
    console.log("PDF Export clicked, report:", report);
    if (!report) return;

    // Create a new PDF document (A4 size, portrait, points)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const primaryColor = [8, 145, 178]; // Teal: #0891b2
    const darkColor = [30, 41, 59];    // Navy: #1e293b
    const greyColor = [100, 116, 139];  // Slate: #64748b
    const successColor = [22, 163, 74]; // Green: #16a34a
    const dangerColor = [220, 38, 38]; // Red: #dc2626

    // --- Header ---
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 595.28, 15, 'F'); // Top colored accent bar

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...darkColor);
    doc.text('GoliOps P&L Report', 40, 55);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...greyColor);
    doc.text('UDAY FOOD & BEVERAGES', 40, 72);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 40, 86);

    // Right-aligned report details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text('STATEMENT PERIOD', 400, 52);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(...darkColor);
    doc.text(report.period, 400, 70);

    // Decorative line
    doc.setDrawColor(226, 232, 240); // Light grey
    doc.setLineWidth(1);
    doc.line(40, 105, 555, 105);

    // --- KPI Cards (Drawn as styled grids) ---
    const drawKpi = (x, y, w, h, title, value, color) => {
      doc.setFillColor(248, 250, 252); // Very light grey surface
      doc.rect(x, y, w, h, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(x, y, w, h, 'S');
      
      // Top accent line inside box
      doc.setFillColor(...color);
      doc.rect(x, y, w, 4, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...greyColor);
      doc.text(title.toUpperCase(), x + 12, y + 22);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...darkColor);
      doc.text(value, x + 12, y + 46);
    };

    drawKpi(40, 120, 158, 65, 'Total Revenue', fmt(report.revenue), successColor);
    drawKpi(218, 120, 158, 65, 'Total Expenses', fmt(report.operatingExpenses + report.cogs), dangerColor);
    
    const isProfit = report.netProfit >= 0;
    drawKpi(397, 120, 158, 65, `Net ${isProfit ? 'Profit' : 'Loss'}`, `${fmt(report.netProfit)} (${report.margin}%)`, isProfit ? successColor : dangerColor);

    // --- Table 1: P&L Calculations ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...darkColor);
    doc.text('Profit & Loss Summary', 40, 215);

    const calcRows = [
      ['Total Revenue', 'Total sales value received from buyers', fmt(report.revenue)],
      ['Cost of Goods Sold (COGS)', 'Quantity of goods sold x cost per unit', `- ${fmt(report.cogs)}`],
      ['Gross Profit', 'Revenue minus Cost of Goods Sold', fmt(report.grossProfit)],
      ['Operating Expenses', 'Raw Materials, Packaging, Logistics, and Overheads', `- ${fmt(report.operatingExpenses)}`],
      ['Net Profit / Loss', `Total Revenue minus COGS and Operating Expenses (${report.margin}% margin)`, fmt(report.netProfit)]
    ];

    doc.autoTable({
      startY: 225,
      margin: { left: 40, right: 40 },
      head: [['Metric', 'Details', 'Amount (INR)']],
      body: calcRows,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: darkColor
      },
      columnStyles: {
        0: { cellWidth: 150, fontStyle: 'bold' },
        1: { cellWidth: 230 },
        2: { cellWidth: 95, halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.row.index === 4) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = isProfit ? successColor : dangerColor;
          if (data.column.index === 2) {
            data.cell.styles.fontSize = 11;
          }
        }
        if (data.row.index === 2) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // --- Table 2: Expenses Breakdown & Table 3: Product Revenue ---
    let currentY = doc.lastAutoTable.finalY + 30;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...darkColor);
    doc.text('Expenses Breakdown', 40, currentY);

    const expenseRows = Object.entries(report.expenseBreakdown).map(([cat, amount]) => {
      const pct = report.operatingExpenses > 0 ? ((amount / report.operatingExpenses) * 100).toFixed(1) : '0';
      return [cat, `${pct}%`, fmt(amount)];
    });

    doc.autoTable({
      startY: currentY + 10,
      margin: { left: 40, right: 40 },
      head: [['Expense Category', 'Percentage', 'Amount (INR)']],
      body: expenseRows,
      theme: 'striped',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: darkColor
      },
      columnStyles: {
        0: { cellWidth: 250, fontStyle: 'bold' },
        1: { cellWidth: 100, halign: 'center' },
        2: { cellWidth: 125, halign: 'right', fontStyle: 'bold' }
      }
    });

    currentY = doc.lastAutoTable.finalY + 30;

    if (currentY > 730) {
      doc.addPage();
      currentY = 40;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...darkColor);
    doc.text('Revenue by Product', 40, currentY);

    const productRows = Object.entries(report.revenueByProduct)
      .sort((a, b) => b[1] - a[1])
      .map(([prod, amount]) => {
        const pct = report.revenue > 0 ? ((amount / report.revenue) * 100).toFixed(1) : '0';
        return [prod, `${pct}%`, fmt(amount)];
      });

    doc.autoTable({
      startY: currentY + 10,
      margin: { left: 40, right: 40 },
      head: [['Product Name', 'Percentage', 'Revenue (INR)']],
      body: productRows,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: darkColor
      },
      columnStyles: {
        0: { cellWidth: 250, fontStyle: 'bold' },
        1: { cellWidth: 100, halign: 'center' },
        2: { cellWidth: 125, halign: 'right', fontStyle: 'bold' }
      }
    });

    // --- Footer ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...greyColor);
      doc.text('GoliOps Inventory & Finance System · Uday Food & Beverages', 40, 820);
      doc.text(`Page ${i} of ${totalPages}`, 515, 820);
    }

    // Save PDF using jsPDF built-in save (uses Blobs internally)
    doc.save(`GoliOps_PnL_Statement_${report.period.replace(/\s/g, '_')}.pdf`);
    alert('PDF Export downloaded successfully. Please check your Downloads folder.');
  };

  if (loading) {
    return (
      <div>
        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
        </div>
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="empty-state" style={{ minHeight: 400 }}>
        <p style={{ color: '#64748b' }}>Failed to load P&L data.</p>
      </div>
    );
  }

  const isProfit = report.netProfit >= 0;

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
            Monthly P&L Statement - V2
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 2 }}>
            {report.period} — Uday Food & Beverages
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            id="export-csv-btn"
            className="btn btn-secondary"
            onClick={handleExportCSV}
          >
            <FileSpreadsheet size={16} />
            Export CSV
          </button>
          <button
            id="export-pdf-btn"
            className="btn btn-primary"
            onClick={handleExportPDF}
          >
            <FileText size={16} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
        <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 24 }}>
          Profit & Loss Calculation
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--surface-700)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34, 197, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IndianRupee size={18} color="#4ade80" />
              </div>
              <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Total Revenue</span>
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(report.revenue)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--surface-700)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingDown size={18} color="#f87171" />
              </div>
              <div>
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Cost of Goods Sold</span>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Qty sold × Cost per unit</p>
              </div>
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>
              − {fmt(report.cogs)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(148, 163, 184, 0.04)', borderRadius: 8, margin: '8px 0', borderBottom: '1px solid var(--surface-700)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8' }}>Gross Profit</span>
            <span style={{ fontWeight: 700, color: report.grossProfit >= 0 ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(report.grossProfit)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--surface-700)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6, 182, 212, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingDown size={18} color="#0891b2" />
              </div>
              <div>
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Operating Expenses</span>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Raw Materials + Packaging + Logistics + Overheads</p>
              </div>
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0891b2', fontVariantNumeric: 'tabular-nums' }}>
              − {fmt(report.operatingExpenses)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 16px',
              marginTop: 8,
              borderRadius: 12,
              background: isProfit
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02))'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))',
              border: `1px solid ${isProfit ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isProfit ? (
                <TrendingUp size={24} color="#4ade80" />
              ) : (
                <TrendingDown size={24} color="#f87171" />
              )}
              <div>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#f8fafc' }}>
                  Net {isProfit ? 'Profit' : 'Loss'}
                </span>
                <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                  Margin: {report.margin}%
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                color: isProfit ? '#4ade80' : '#f87171',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmt(Math.abs(report.netProfit))}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc', marginBottom: 18 }}>
            Expense Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(report.expenseBreakdown).map(([cat, amount]) => {
              const total = report.operatingExpenses;
              const pct = total > 0 ? ((amount / total) * 100).toFixed(0) : 0;
              const colors = {
                'Raw Materials': '#3b82f6',
                'Packaging': '#8b5cf6',
                'Logistics': '#f59e0b',
                'Overheads': '#ef4444',
              };
              const color = colors[cat] || '#64748b';

              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>{cat}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(amount)} <span style={{ color: '#64748b', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      background: 'var(--surface-700)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: color,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc', marginBottom: 18 }}>
            Revenue by Product
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(report.revenueByProduct)
              .sort((a, b) => b[1] - a[1])
              .map(([prod, amount]) => {
                const pct = report.revenue > 0 ? ((amount / report.revenue) * 100).toFixed(0) : 0;
                return (
                  <div key={prod}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>{prod}</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(amount)} <span style={{ color: '#64748b', fontWeight: 400 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        background: 'var(--surface-700)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, var(--brand-500), var(--brand-300))',
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderLeft: '3px solid var(--brand-500)',
        }}
      >
        <Download size={16} color="#64748b" />
        <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
          <strong style={{ color: '#cbd5e1' }}>Formula:</strong>{' '}
          Revenue − Cost of Goods Sold − Operating Expenses = Net Profit
        </p>
      </div>
    </div>
  );
}

// ==========================================
// 3b. ANALYTICS PAGE
// ==========================================

const ANALYTICS_TABS = [
  { id: 'overview',  label: 'Overview',         icon: BarChart3 },
  { id: 'revenue',   label: 'Revenue Trends',   icon: TrendingUp },
  { id: 'stock',     label: 'Stock Movement',   icon: Boxes },
  { id: 'skus',      label: 'Top SKUs',         icon: Sparkles },
  { id: 'expenses',  label: 'Expense vs Revenue', icon: Wallet },
];

export function Analytics() {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard]     = useState(null);
  const [pnl, setPnl]                 = useState(null);
  const [sales, setSales]             = useState([]);
  const [expenses, setExpenses]       = useState([]);
  const [products, setProducts]       = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [dRes, pRes, sRes, eRes, prRes, trRes] = await Promise.all([
          apiFetch('/api/reports/dashboard'),
          apiFetch('/api/reports/pnl'),
          apiFetch('/api/sales'),
          apiFetch('/api/expenses'),
          apiFetch('/api/inventory/products'),
          apiFetch('/api/inventory/transactions'),
        ]);
        const [d, p, s, e, pr, tr] = await Promise.all([
          dRes.json(),
          pRes.json(),
          sRes.json(),
          eRes.json(),
          prRes.json(),
          trRes.json(),
        ]);
        if (!cancelled) {
          setDashboard(d);
          setPnl(p);
          setSales(Array.isArray(s) ? s : []);
          setExpenses(Array.isArray(e) ? e : []);
          setProducts(Array.isArray(pr) ? pr : []);
          setTransactions(Array.isArray(tr) ? tr : []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load analytics data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [apiFetch]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="ins-loading-state">
          <div className="ins-spinner" />
          <p>Loading analytics data…</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="ins-error-state">
          <AlertTriangle size={32} color="var(--danger)" />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="ins-view-stack">
            <InsightsMetricCards dashboard={dashboard} pnl={pnl} products={products} />
            <div className="ins-grid-2">
              <InsightsRevenueTrends pnl={pnl} compact />
              <InsightsTopSKUs pnl={pnl} sales={sales} compact />
            </div>
          </div>
        );
      case 'revenue':
        return <InsightsRevenueTrends pnl={pnl} sales={sales} />;
      case 'stock':
        return <InsightsStockMovement products={products} transactions={transactions} />;
      case 'skus':
        return <InsightsTopSKUs pnl={pnl} sales={sales} />;
      case 'expenses':
        return <InsightsExpenseRevenue pnl={pnl} expenses={expenses} />;
      default:
        return null;
    }
  };

  return (
    <div className="analytics-page">
      {/* Live data badge + period */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lightbulb size={18} color="var(--brand-400)" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--surface-300)' }}>
            Business Analytics
          </span>
          {pnl?.period && (
            <span style={{
              fontSize: '0.6875rem', fontWeight: 600, color: 'var(--brand-400)',
              background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)',
              padding: '2px 10px', borderRadius: 20,
            }}>
              {pnl.period}
            </span>
          )}
        </div>
        <div style={{
          fontSize: '0.6875rem', fontWeight: 600, color: 'var(--success)',
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          padding: '3px 10px', borderRadius: 20,
        }}>
          Live Data
        </div>
      </div>

      {/* Internal tab navigation */}
      <nav className="ins-tab-nav" aria-label="Analytics tabs">
        {ANALYTICS_TABS.map((tab) => (
          <button
            key={tab.id}
            id={`analytics-tab-${tab.id}`}
            className={`ins-tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {renderContent()}
    </div>
  );
}

// ==========================================
// 4. MAIN ROUTING & ENTRY
// ==========================================

export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="finance" element={<Finance />} />
        <Route path="profit-loss" element={<ProfitLoss />} />
        <Route path="profile" element={<Profile />} />
        <Route path="insight" element={<Analytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
