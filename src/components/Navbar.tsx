import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MagnifyingGlassIcon, MapPinIcon, ChevronDownIcon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { SignalIcon } from '@heroicons/react/24/solid';
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { useLocationInfo } from '../contexts/LocationContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { MenuItem } from '../types';

function MapFlyTo({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(coords, 14, { duration: 1.5 });
  }, [coords, map]);
  return null;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', roles: ['customer', 'restaurant_staff', 'restaurant_admin'] },
  { name: 'Menu',      href: '/menu',      roles: ['customer', 'restaurant_staff', 'restaurant_admin'] },
  { name: 'Kitchen',   href: '/kitchen',   roles: ['restaurant_staff', 'restaurant_admin'] },
  { name: 'Order History', href: '/order-history', roles: ['customer'] },
  { name: 'Orders',    href: '/orders',    roles: ['restaurant_admin'] },
  { name: 'Reports',   href: '/reports',   roles: ['restaurant_admin'] },
  { name: 'AI Forecast', href: '/ai-prediction', roles: ['restaurant_staff', 'restaurant_admin'] },
];

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [isMapOpen, setIsMapOpen] = useState(false);
  const { location, setLocation } = useLocationInfo();

  const [addressSearch, setAddressSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeCoords, setActiveCoords] = useState<[number, number]>(location.coordinates);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showBell, setShowBell] = useState(false);

  // Navbar food search
  const [navQuery, setNavQuery] = useState('');
  const [navItems, setNavItems] = useState<MenuItem[]>([]);
  const navResults = navQuery.trim().length > 0
    ? navItems.filter(i => i.name.toLowerCase().includes(navQuery.toLowerCase()) || i.category.toLowerCase().includes(navQuery.toLowerCase()))
    : [];

  const navSearchRef = useRef<HTMLInputElement>(null);
  const navDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (navSearchRef.current && !navSearchRef.current.contains(target) && (!navDropdownRef.current || !navDropdownRef.current.contains(target))) {
        setNavQuery('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'menuItems'), where('available', '==', true));
    const unsub = onSnapshot(q, snap => {
      setNavItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!addressSearch.trim() || addressSearch.length < 3) { setSuggestions([]); return; }
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}`);
        const data = await res.json();
        setSuggestions(data.slice(0, 5));
      } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(delay);
  }, [addressSearch]);

  // Listen for order status changes for notifications
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('studentId', '==', user.uid),
      limit(5)
    );
    const seen = new Set<string>();
    const unsub = onSnapshot(q, snap => {
      const newNotifs: any[] = [];
      snap.docChanges().forEach(change => {
        if (change.type === 'modified') {
          const d = change.doc.data();
          const key = `${change.doc.id}-${d.status}`;
          if (!seen.has(key)) {
            seen.add(key);
            newNotifs.push({ id: key, orderId: change.doc.id, status: d.status, time: new Date() });
          }
        }
      });
      if (newNotifs.length) setNotifications(prev => [...newNotifs, ...prev].slice(0, 10));
    });
    return () => unsub();
  }, [user]);

  const unreadCount = notifications.length;

  // GPS accuracy colour
  const gpsColor = () => {
    if (location.permissionDenied) return 'text-red-500';
    if (!location.accuracy) return 'text-gray-400';
    if (location.accuracy <= 50) return 'text-green-500';
    if (location.accuracy <= 200) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!user) {
    return (
      <nav className="bg-white border-b border-swiggy-borderLight sticky top-0 z-50 shadow-swiggyHover">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 group cursor-pointer transition-transform hover:scale-105">
              <div className="w-9 h-10 bg-[#fc8019] rounded-[40%] flex items-center justify-center -rotate-12 mt-1 shadow-sm">
                <span className="font-extrabold text-white text-xl">T</span>
              </div>
              <span className="font-display font-extrabold text-[#3d4152] text-2xl tracking-tight hidden md:inline ml-1">TastyTrail</span>
            </Link>
            <div className="flex gap-2 sm:gap-3 items-center">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-6 sm:py-2.5 rounded-lg border-2 border-[#fc8019] bg-transparent text-[#fc8019] font-bold text-[13px] sm:text-[15px] transition-colors hover:bg-orange-50"
              >
                <UserCircleIcon className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">Login</span>
              </button>
              <button
                onClick={() => navigate('/register')}
                className="flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-6 sm:py-2.5 rounded-lg border-2 border-[#fc8019] bg-[#fc8019] text-white font-bold text-[13px] sm:text-[15px] shadow-sm transition-colors hover:bg-[#e06b12] hover:border-[#e06b12]"
              >
                <span className="hidden sm:inline">Register</span>
                <span className="sm:hidden">Join</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }
  const isStudent = user.role === 'customer';
  const filteredNav = navigation.filter(item => item.roles.includes(user.role));

  return (
    <nav className="bg-white border-b border-swiggy-borderLight sticky top-0 z-50 shadow-swiggyHover">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">

          {/* Logo & Location */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link to="/dashboard" className="flex items-center gap-2 group cursor-pointer transition-transform hover:scale-105">
              <div className="w-9 h-10 bg-[#fc8019] rounded-[40%] flex items-center justify-center -rotate-12 mt-1 shadow-sm">
                <span className="font-extrabold text-white text-xl">T</span>
              </div>
              <span className="font-display font-extrabold text-[#3d4152] text-2xl tracking-tight hidden md:inline ml-1">TastyTrail</span>
            </Link>

            {isStudent && (
              <div className="hidden lg:flex items-center gap-1.5 cursor-pointer hover:text-[#fc8019] transition-colors" onClick={() => setIsMapOpen(true)}>
                <SignalIcon className={`w-4 h-4 ${gpsColor()} flex-shrink-0`} title={`GPS: ${location.accuracy ? `±${Math.round(location.accuracy)}m` : 'unknown'}`} />
                <div className="max-w-[180px]">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-gray-800 truncate">{location.areaName}</span>
                    <ChevronDownIcon className="w-3.5 h-3.5 text-[#fc8019] flex-shrink-0" />
                  </div>
                  {location.aiData?.areaDescription && (
                    <p className="text-[10px] text-gray-400 truncate">{location.aiData.areaDescription.split(',')[0]}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          {isStudent && (
            <div style={{ flex: 1, maxWidth: '36rem', margin: '0 auto', position: 'relative', display: 'none' }} className="md:!block">
              <div style={{ position: 'relative', width: '100%', zIndex: 99999 }}>
                <input
                  ref={navSearchRef}
                  type="text"
                  value={navQuery}
                  onChange={e => setNavQuery(e.target.value)}
                  placeholder="Search for dishes and food..."
                  onKeyDown={e => { if (e.key === 'Enter' && navQuery) { navigate('/menu'); setNavQuery(''); } }}
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 40px 0 16px',
                    borderRadius: '8px',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '15px',
                    outline: 'none',
                    backgroundColor: '#f8f8f8',
                    boxSizing: 'border-box',
                    fontWeight: 500,
                  }}
                />
                {navQuery ? (
                  <button
                    onClick={() => setNavQuery('')}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}
                  >×</button>
                ) : (
                  <MagnifyingGlassIcon style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af' }} />
                )}

                {navQuery.length > 0 && (
                  <div style={{
                    position: 'fixed',
                    top: navSearchRef.current ? navSearchRef.current.getBoundingClientRect().bottom + 'px' : '0px',
                    left: navSearchRef.current ? navSearchRef.current.getBoundingClientRect().left + 'px' : '0px',
                    width: navSearchRef.current ? navSearchRef.current.getBoundingClientRect().width + 'px' : 'auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    zIndex: 99999,
                    maxHeight: '380px',
                    overflowY: 'auto',
                    marginTop: '4px'
                  }}>
                    {navResults.length === 0 ? (
                      <div style={{ padding: '20px 16px', color: '#9ca3af', textAlign: 'center', fontSize: '14px' }}>
                        No results for "{navQuery}"
                      </div>
                    ) : (
                      navResults.map((item, i) => (
                        <div
                          key={i}
                          onClick={() => { navigate('/item/' + item.id); setNavQuery(''); }}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            backgroundColor: '#fff'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fff8f0')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                        >
                          <img
                            src={item.photoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80'}
                            onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80'; }}
                            alt={item.name}
                            style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, color: '#1f2937', fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>{item.category} · ₹{item.price}</p>
                          </div>
                          <span style={{ color: '#fc8019', fontSize: '11px', fontWeight: 700 }}>→</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Nav links + icons */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {!isStudent && filteredNav.map(item => (
              <Link key={item.name} to={item.href} className="text-[14px] font-bold hover:text-swiggy-orange transition-colors hidden sm:block">
                {item.name}
              </Link>
            ))}

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowBell(v => !v)}
                className="relative flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#fc8019] transition-colors"
              >
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase">Alerts</span>
              </button>

              {showBell && (
                <div className="fixed top-20 left-4 right-4 sm:absolute sm:top-12 sm:left-auto sm:right-0 sm:w-72 bg-white shadow-2xl border border-gray-100 rounded-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="font-bold text-sm text-gray-800">Notifications</span>
                    <button onClick={() => { setNotifications([]); setShowBell(false); }} className="text-xs text-red-500 font-bold">Clear</button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No new notifications</p>
                  ) : (
                    <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className="px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer" onClick={() => { navigate(`/order/${n.orderId}`); setShowBell(false); }}>
                          <p className="font-bold text-gray-800">Order #{n.orderId.slice(-6).toUpperCase()}</p>
                          <p className="text-gray-500">Status: <span className="text-[#fc8019] font-bold">{n.status}</span></p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Link */}
            <Link to="/profile" className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#fc8019] transition-colors">
              <UserCircleIcon className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Profile</span>
            </Link>

            {/* User Avatar + Sign Out */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fc8019', color: '#fff', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <button
                onClick={() => signOut().then(() => navigate('/login'))}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '2px solid #fc8019', background: 'transparent', color: '#fc8019', fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map Overlay Drawer */}
      {isMapOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex animate-fade-in" onClick={() => setIsMapOpen(false)}>
          <div className="w-[450px] bg-white h-full shadow-2xl relative flex flex-col p-8 transition-transform" onClick={e => e.stopPropagation()}>
            <button className="absolute top-6 left-6 text-gray-500 font-extrabold text-xl" onClick={() => setIsMapOpen(false)}>✕</button>
            <h2 className="font-bold text-lg text-gray-900 mt-8 mb-4">Change Location</h2>
            {location.aiData && (
              <div className="bg-orange-50 rounded-xl p-3 mb-4 border border-orange-100">
                <p className="text-xs font-bold text-orange-800">📍 {location.aiData.areaDescription}</p>
                <p className="text-xs text-orange-600 mt-1">🍴 {location.aiData.popularFood}</p>
              </div>
            )}
            <div className="mb-4 relative">
              <input autoFocus type="text" value={addressSearch} onChange={e => setAddressSearch(e.target.value)} className="w-full border border-gray-300 shadow-sm rounded-xl p-4 outline-none focus:shadow-md transition-shadow font-medium text-gray-700" placeholder="Search for area, street name..." />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg rounded-xl z-[150] divide-y divide-gray-100 max-h-60 overflow-y-auto mt-1">
                  {suggestions.map(s => (
                    <div key={s.place_id} className="p-3 hover:bg-orange-50 cursor-pointer flex items-start gap-2" onClick={() => {
                      const lat = parseFloat(s.lat), lon = parseFloat(s.lon);
                      setActiveCoords([lat, lon]);
                      const parts = s.display_name.split(',');
                      setLocation({ areaName: parts[0], addressLine: parts.slice(1).join(',').trim(), coordinates: [lat, lon] });
                      setSuggestions([]); setAddressSearch(''); setIsMapOpen(false);
                    }}>
                      <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-sm text-[#3d4152]">{s.display_name.split(',')[0]}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{s.display_name.substring(s.display_name.indexOf(',') + 1).trim()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 w-full relative border border-gray-200 rounded-xl overflow-hidden z-0">
              <MapContainer center={activeCoords} zoom={14} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <Marker position={activeCoords} />
                <MapFlyTo coords={activeCoords} />
              </MapContainer>
            </div>
            <button onClick={() => setIsMapOpen(false)} className="w-full mt-5 bg-[#fc8019] text-white py-4 font-bold text-[15px] uppercase shadow-lg shadow-orange-200 rounded-xl hover:bg-orange-600 transition-colors">Confirm Location</button>
          </div>
        </div>
      )}

      {/* Mobile search bar */}
      {isStudent && (
        <div className="md:hidden px-4 pb-4 bg-white">
          <div className="relative flex items-center w-full h-11 rounded bg-swiggy-bgHover border border-swiggy-borderLight">
            <input type="text" className="w-full bg-transparent px-4 text-sm outline-none" placeholder="Search for food..." onKeyDown={e => { if (e.key === 'Enter') navigate('/menu'); }} />
            <MagnifyingGlassIcon className="absolute right-3 w-4 h-4 text-swiggy-grayText" />
          </div>
        </div>
      )}
    </nav>
  );
};
