import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Order } from '../types';
import { useNavigate } from 'react-router-dom';
import { ArrowPathIcon, ClockIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

export default function Orders() {
  const { user } = useAuth();
  const { clearCart, addToCart } = useCart();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    let q;
    if (user.role === 'restaurant_admin') {
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'orders'),
        where('studentId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const fetched: Order[] = [];
      snap.forEach(d => fetched.push({ id: d.id, ...d.data() } as Order));
      setOrders(fetched);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleReorder = (order: Order) => {
    clearCart();
    order.items.forEach(item => {
      addToCart({
        itemId: item.itemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        photoUrl: item.photoUrl
      });
    });
    navigate('/menu');
  };
  const isStudent = user?.role === 'customer';

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Placed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Preparing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Ready': return 'bg-orange-100 text-swiggy-orange border-orange-200';
      case 'Delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      <header className="mb-8 border-b border-swiggy-borderLight pb-6">
        <h1 className="text-3xl font-display font-black text-swiggy-dark">
          {isStudent ? 'Past Orders' : 'All Orders'}
        </h1>
        <p className="text-swiggy-grayText mt-2 font-medium">
          {isStudent ? 'A history of all your delicious campus meals.' : 'Admin view of all system orders.'}
        </p>
      </header>

      {loading ? (
        <div className="space-y-6">
          {[1,2,3].map(i => <div key={i} className="skeleton h-48 rounded-2xl bg-white shadow-sm" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-swiggy-borderLight rounded-2xl p-16 text-center shadow-sm">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClockIcon className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-swiggy-dark mb-2">No orders found</h2>
          <p className="text-swiggy-grayText mb-6">Looks like you haven't ordered anything yet.</p>
          {isStudent && (
            <button onClick={() => navigate('/menu')} className="btn-primary px-8">
              Browse Menu
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white border border-swiggy-borderLight rounded-2xl p-6 transition-all hover:shadow-swiggyHover hover:border-swiggy-orange group">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-5 pb-5 border-b border-dashed border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 border border-swiggy-borderLight flex items-center justify-center flex-shrink-0">
                    <img src="/img/cat_biryani.png" alt="Order" className="w-10 h-10 object-cover opacity-60" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-swiggy-dark flex items-center gap-3 mb-1">
                      CampusEats
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </h3>
                    <p className="text-[13px] text-swiggy-grayText mb-1">Order #{order.id.slice(-6).toUpperCase()}</p>
                    <p className="text-[13px] text-swiggy-grayText flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" /> 
                      {order.createdAt?.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {!isStudent && <p className="text-[13px] font-bold text-blue-600 mt-1">Student: {order.studentName}</p>}
                  </div>
                </div>

                <div className="text-left sm:text-right bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-lg">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-swiggy-grayText mb-1">Total Paid</div>
                  <div className="font-display font-black text-swiggy-dark text-xl">₹{order.totalAmount}</div>
                  <div className={`text-[10px] font-bold mt-1 uppercase ${order.paymentMethod === 'PayPal' ? 'text-blue-600' : 'text-swiggy-grayText'}`}>
                    {order.paymentMethod === 'PayPal' ? 'Paid via PayPal' : 'Cash on Pickup'}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2.5 mb-6 px-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[15px]">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-swiggy-orange text-sm">{item.quantity} x</span>
                      <span className="font-medium text-swiggy-dark">{item.name}</span>
                    </div>
                    <span className="text-swiggy-grayText text-sm">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {isStudent && (
                <div className="flex flex-wrap gap-4 pt-1">
                  <button 
                    onClick={() => handleReorder(order)} 
                    className="flex-1 sm:flex-none uppercase text-xs font-bold tracking-wider px-6 py-3 border border-swiggy-orange text-swiggy-orange hover:bg-swiggy-orange hover:text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowPathIcon className="w-4 h-4" /> Reorder Again
                  </button>
                  
                  {order.status === 'Delivered' && (
                    <button 
                      onClick={() => navigate(`/feedback?orderId=${order.id}`)} 
                      className="flex-1 sm:flex-none uppercase text-xs font-bold tracking-wider px-6 py-3 border border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <StarIcon className="w-4 h-4 text-orange-400" /> Rate Order
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
