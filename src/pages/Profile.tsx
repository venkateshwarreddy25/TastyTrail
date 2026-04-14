import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocationInfo } from '../contexts/LocationContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, limit, updateDoc, doc } from 'firebase/firestore';
import { Order } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { UserCircleIcon, HeartIcon, ShoppingBagIcon, MapPinIcon, PencilIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user } = useAuth();
  const { location } = useLocationInfo();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('studentId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
    return () => unsub();
  }, [user]);

  const favouriteCuisine = () => {
    if (!orders.length) return 'None yet';
    const counts: Record<string, number> = {};
    orders.forEach(o => o.items.forEach(i => { counts[i.name] = (counts[i.name] || 0) + i.quantity; }));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : 'Biryani';
  };

  const handleSaveName = async () => {
    if (!user || !newName.trim()) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { name: newName.trim() });
      toast.success('Name updated!');
      setIsEditingName(false);
    } catch {
      toast.error('Failed to update name');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="max-w-xl mx-auto pb-20">
      {/* Avatar Card */}
      <div className="bg-gradient-to-br from-[#fc8019] to-orange-600 rounded-3xl p-8 mb-6 text-white shadow-lg shadow-orange-200">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-3xl font-black">
            {initials}
          </div>
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="flex-1 bg-white/20 border border-white/40 rounded-lg px-3 py-1.5 text-white placeholder-white/60 text-sm font-bold outline-none"
                  autoFocus
                />
                <button onClick={handleSaveName} className="bg-white text-[#fc8019] px-3 py-1.5 rounded-lg text-sm font-bold">Save</button>
                <button onClick={() => setIsEditingName(false)} className="bg-white/20 px-3 py-1.5 rounded-lg text-sm font-bold">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{user?.name}</h1>
                <button onClick={() => setIsEditingName(true)} className="bg-white/20 rounded-full p-1 hover:bg-white/30 transition-colors">
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-sm opacity-80 mt-0.5">{user?.email}</p>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full mt-1 inline-block capitalize">{user?.role?.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Orders', value: orders.length, icon: '🛍' },
          { label: 'Delivered', value: orders.filter(o => o.status === 'Delivered').length, icon: '✅' },
          { label: 'Fav Dish', value: favouriteCuisine().split(' ').slice(0, 2).join(' '), icon: '❤️' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <p className="font-black text-gray-900 text-lg leading-none">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* AI Location */}
      {location.aiData && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPinIcon className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-900">Your Area</h3>
          </div>
          <p className="text-sm text-purple-800 font-medium mb-1">📍 {location.aiData.areaDescription}</p>
          <p className="text-sm text-purple-700">🍴 Popular: {location.aiData.popularFood}</p>
          <p className="text-sm text-purple-700 mt-0.5">⏰ {location.aiData.mealSuggestion}</p>
        </div>
      )}

      {/* Recent Orders */}
      {orders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Recent Orders</h3>
            <Link to="/order-history" className="text-xs text-[#fc8019] font-bold">See all →</Link>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 3).map(order => (
              <div key={order.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-800">{order.items[0]?.name}{order.items.length > 1 ? ` +${order.items.length - 1}` : ''}</p>
                  <p className="text-xs text-gray-400">₹{order.totalAmount}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden mb-6">
        {[
          { to: '/order-history', icon: <ShoppingBagIcon className="w-5 h-5 text-[#fc8019]" />, label: 'Order History' },
          { to: '/favourites', icon: <HeartIcon className="w-5 h-5 text-red-500" />, label: 'My Favourites' },
          { to: '/dashboard', icon: <UserCircleIcon className="w-5 h-5 text-blue-500" />, label: 'Go to Dashboard' },
        ].map(link => (
          <Link key={link.to} to={link.to} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
            {link.icon}
            <span className="font-medium text-gray-800">{link.label}</span>
            <span className="ml-auto text-gray-400">›</span>
          </Link>
        ))}
      </div>

      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" /> Sign Out
      </button>
    </div>
  );
}
