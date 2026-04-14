import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Order } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowPathIcon, ClockIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function OrderHistory() {
  const { user } = useAuth();
  const { addToCart, clearCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleReorder = (order: Order) => {
    clearCart();
    order.items.forEach(item => addToCart(item));
    toast.success(`${order.items.length} item(s) added to cart!`, { icon: '🛒' });
    navigate('/menu');
  };

  const statusIcon = (status: Order['status']) => {
    if (status?.toLowerCase?.() === 'delivered') return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    if (status?.toLowerCase?.() === 'cancelled') return <XCircleIcon className="w-5 h-5 text-red-500" />;
    return <ClockIcon className="w-5 h-5 text-[#fc8019]" />;
  };

  const statusColor = (status: Order['status']) => {
    if (status?.toLowerCase?.() === 'delivered') return 'bg-green-50 text-green-700 border-green-200';
    if (status?.toLowerCase?.() === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-orange-50 text-orange-700 border-orange-200';
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBagIcon className="w-7 h-7 text-[#fc8019]" />
        <h1 className="text-2xl font-bold font-display text-gray-900">Order History</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBagIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700">No orders yet</h3>
          <p className="text-gray-400 text-sm mt-1">Start ordering delicious food!</p>
          <Link to="/menu" className="mt-4 inline-block bg-[#fc8019] text-white px-6 py-2.5 rounded-xl font-bold">
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-[15px]">{order.restaurantName || 'TastyTrail Restaurant'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[11px] text-gray-400 font-mono">#{order.id.slice(-8).toUpperCase()}</p>
                    <span className="text-gray-300">•</span>
                    <p className="text-[11px] text-gray-400">
                      {order.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] uppercase font-extrabold px-2 py-1 rounded border tracking-wider ${statusColor(order.status)}`}>
                  {statusIcon(order.status)} {order.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                {order.items.map((item, i) => (
                  <p key={i} className="text-sm text-gray-600">
                    {item.name} <span className="text-gray-400">× {item.quantity}</span>
                  </p>
                ))}
              </div>

              <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                <span className="font-bold text-gray-900">₹{order.totalAmount}</span>
                <div className="flex gap-2">
                  <Link
                    to={`/order-tracking/${order.id}`}
                    className="text-[13px] border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Track Order
                  </Link>
                  <button
                    onClick={() => handleReorder(order)}
                    className="flex items-center gap-1.5 text-[13px] bg-[#fc8019] shadow-md shadow-orange-100 text-white px-4 py-2 rounded-xl font-extrabold hover:bg-[#e06f13] transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4 text-white font-bold" /> REORDER
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
