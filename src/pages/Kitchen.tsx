import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Order } from '../types';
import toast from 'react-hot-toast';

const STATUS_FLOW = ['Placed', 'Preparing', 'Ready', 'Delivered'] as const;

export default function Kitchen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['Placed', 'Preparing', 'Ready']),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const fetched: Order[] = [];
      snap.forEach(d => fetched.push({ id: d.id, ...d.data() } as Order));
      setOrders(fetched);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const advanceStatus = async (orderId: string, currentStatus: string) => {
    const idx = STATUS_FLOW.indexOf(currentStatus as any);
    if (idx === -1 || idx === STATUS_FLOW.length - 1) return;
    
    const nextStatus = STATUS_FLOW[idx + 1];
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status: nextStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Order set to ${nextStatus}`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const cancelOrder = async (orderId: string) => {
    if(window.confirm('Cancel this order? It cannot be undone.')) {
      try {
        await updateDoc(doc(db, 'orders', orderId), { 
          status: 'Cancelled',
          updatedAt: serverTimestamp()
        });
        toast.success('Order cancelled');
      } catch (e) {
        toast.error('Failed to cancel order');
      }
    }
  }

  const columns = [
    { title: 'New Orders', status: 'Placed', bg: 'bg-blue-50', border: 'border-blue-500' },
    { title: 'In Kitchen', status: 'Preparing', bg: 'bg-yellow-50', border: 'border-yellow-500' },
    { title: 'Awaiting Pickup', status: 'Ready', bg: 'bg-green-50', border: 'border-green-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen bg-gray-50 flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-swiggy-dark">Kitchen Display</h1>
        <p className="text-swiggy-grayText mt-1 text-lg">Live incoming orders. Always synced.</p>
      </header>

      {loading ? (
        <div className="flex-1 skeleton rounded-2xl bg-white shadow-sm" />
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {columns.map(col => {
            const columnOrders = orders.filter(o => o.status === col.status);
            return (
              <div key={col.status} className={`flex flex-col rounded-2xl overflow-hidden bg-white shadow-sm border border-swiggy-borderLight h-[70vh]`}>
                <div className={`p-5 border-b border-swiggy-borderLight flex justify-between items-center ${col.bg}`}>
                  <h2 className="font-display font-bold text-lg text-swiggy-dark flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${col.border.replace('border-', 'bg-')}`} />
                    {col.title}
                  </h2>
                  <span className="bg-white px-3 py-1 text-sm font-bold rounded shadow-sm border border-swiggy-borderLight">
                    {columnOrders.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                  {columnOrders.map((order, idx) => (
                    <div key={order.id} className="bg-white border border-swiggy-borderLight rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${col.border.replace('border-', 'bg-')}`} />
                      
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="font-display font-black text-xl text-swiggy-dark">#{order.id.slice(-4).toUpperCase()}</span>
                          <span className="text-sm font-medium text-swiggy-grayText block mt-0.5">{order.studentName}</span>
                          <span className={`text-[10px] font-bold mt-1 inline-block uppercase px-1.5 py-0.5 rounded ${order.paymentMethod === 'PayPal' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                            {order.paymentMethod === 'PayPal' ? 'Paid: PayPal' : 'Collect Cash'}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-swiggy-grayText bg-gray-100 px-2 py-1 rounded">
                          {order.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      
                      <div className="space-y-3 mb-5 border-y border-dashed border-gray-200 py-4">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex gap-3 text-[15px] items-center">
                            <span className="font-bold text-swiggy-orange bg-swiggy-orange/10 px-2 py-1 rounded w-8 text-center">{it.quantity}x</span>
                            <span className="font-medium text-swiggy-dark flex-1">{it.name}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3 mt-auto">
                        {col.status === 'Placed' && (
                          <button onClick={() => cancelOrder(order.id)} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex-1 transition-colors">
                            Reject
                          </button>
                        )}
                        <button 
                          onClick={() => advanceStatus(order.id, order.status)} 
                          className={`flex-1 text-sm font-bold uppercase tracking-wider py-3 rounded-lg transition-colors ${
                            col.status === 'Ready' ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm' : 
                            'bg-swiggy-orange text-white hover:bg-[#e07011] shadow-sm'
                          }`}
                        >
                          {col.status === 'Placed' ? 'Start Preparing' : col.status === 'Preparing' ? 'Mark Ready' : 'Mark Delivered'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {columnOrders.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-swiggy-grayText pb-10">
                      <div className={`w-16 h-16 rounded-full ${col.bg} mb-3 flex items-center justify-center`}>
                        <div className={`w-8 h-8 rounded-full ${col.border.replace('border-', 'bg-')} opacity-20`} />
                      </div>
                      <span className="font-medium">No items {col.title.toLowerCase()}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
