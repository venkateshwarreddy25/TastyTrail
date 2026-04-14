import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Order } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartBarIcon, CurrencyRupeeIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

const COLORS = ['#fc8019', '#eab308', '#3b82f6', '#10b981', '#8b5cf6'];

export default function Reports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'));
    const unsub = onSnapshot(q, (snap) => {
      const fetched: Order[] = [];
      snap.forEach(d => fetched.push({ id: d.id, ...d.data() } as Order));
      setOrders(fetched);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <div className="skeleton h-[500px] w-full max-w-7xl mx-auto mt-8 rounded-3xl bg-white shadow-sm" />;

  // 1. Process Daily Volume (last 7 days approx)
  const dailyDataMap: Record<string, number> = {};
  orders.forEach(o => {
    if (!o.createdAt) return;
    const date = o.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyDataMap[date] = (dailyDataMap[date] || 0) + 1;
  });
  const dailyData = Object.keys(dailyDataMap).slice(-7).map(date => ({ date, orders: dailyDataMap[date] }));

  // 2. Process Revenue by Category
  const itemMap: Record<string, { qty: number, rev: number }> = {};
  let totalRev = 0;
  
  orders.forEach(o => {
    if(o.status === 'Cancelled') return;
    totalRev += o.totalAmount;
    o.items.forEach(item => {
      if(!itemMap[item.name]) itemMap[item.name] = { qty: 0, rev: 0 };
      itemMap[item.name].qty += item.quantity;
      itemMap[item.name].rev += (item.quantity * item.price);
    });
  });

  const topItems = Object.entries(itemMap)
    .sort((a,b) => b[1].qty - a[1].qty)
    .slice(0, 8).map(([name, data]) => ({ name, ...data }));
    
  const pieData = topItems.slice(0, 5).map(item => ({ name: item.name, value: item.rev }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-20 space-y-8">
      <header className="border-b border-swiggy-borderLight pb-6">
        <h1 className="text-3xl font-display font-black text-swiggy-dark">Analytics & Reports</h1>
        <p className="text-swiggy-grayText mt-2 font-medium">Real-time sales and performance data.</p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-swiggy-borderLight rounded-2xl p-6 flex items-center gap-5 shadow-sm">
          <div className="p-4 bg-orange-50 rounded-2xl text-swiggy-orange"><CurrencyRupeeIcon className="w-8 h-8" /></div>
          <div>
            <p className="text-[13px] text-swiggy-grayText font-bold uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-3xl font-display font-black text-swiggy-dark mt-1">₹{totalRev.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white border border-swiggy-borderLight rounded-2xl p-6 flex items-center gap-5 shadow-sm">
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-500"><ShoppingBagIcon className="w-8 h-8" /></div>
          <div>
            <p className="text-[13px] text-swiggy-grayText font-bold uppercase tracking-wider">Total Orders</p>
            <h3 className="text-3xl font-display font-black text-swiggy-dark mt-1">{orders.filter(o=>o.status !== 'Cancelled').length}</h3>
          </div>
        </div>
        <div className="bg-white border border-swiggy-borderLight rounded-2xl p-6 flex items-center gap-5 shadow-sm">
          <div className="p-4 bg-green-50 rounded-2xl text-green-500"><ChartBarIcon className="w-8 h-8" /></div>
          <div>
            <p className="text-[13px] text-swiggy-grayText font-bold uppercase tracking-wider">Avg Order Value</p>
            <h3 className="text-3xl font-display font-black text-swiggy-dark mt-1">
              ₹{orders.length ? Math.round(totalRev / orders.length) : 0}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Volume Bar Chart */}
        <div className="bg-white border border-swiggy-borderLight rounded-2xl p-6 shadow-sm min-h-[350px] flex flex-col">
          <h3 className="font-bold text-lg text-swiggy-dark mb-6">Daily Order Volume (Last 7 Days)</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <XAxis dataKey="date" stroke="#686b78" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#686b78" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{backgroundColor: '#fff', borderColor: '#e9ecee', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.05)'}} />
                <Bar dataKey="orders" fill="#fc8019" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Pie Chart */}
        <div className="bg-white border border-swiggy-borderLight rounded-2xl p-6 shadow-sm min-h-[350px] flex flex-col">
          <h3 className="font-bold text-lg text-swiggy-dark mb-6">Revenue by Top Items</h3>
          {pieData.length > 0 ? (
            <>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#fff', borderColor: '#e9ecee', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.05)'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs font-bold text-swiggy-grayText">
                    <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></span>
                    {entry.name}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-swiggy-grayText">No data available yet</div>
          )}
        </div>
      </div>

      {/* Top Items Table */}
      <div className="bg-white border border-swiggy-borderLight rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-swiggy-borderLight bg-gray-50">
          <h3 className="font-bold text-lg text-swiggy-dark">Top Selling Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-swiggy-borderLight">
              <tr>
                <th className="p-4 text-[12px] font-bold uppercase tracking-wider text-swiggy-grayText">Item Name</th>
                <th className="p-4 text-[12px] font-bold uppercase tracking-wider text-swiggy-grayText">Quantity Sold</th>
                <th className="p-4 text-[12px] font-bold uppercase tracking-wider text-swiggy-grayText">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topItems.map((item, i) => (
                <tr key={i} className="hover:bg-orange-50/50 transition-colors">
                  <td className="p-4 font-bold text-[15px] text-swiggy-dark">{item.name}</td>
                  <td className="p-4 text-swiggy-grayText font-medium">{item.qty} units</td>
                  <td className="p-4 font-black text-swiggy-dark">₹{item.rev.toLocaleString()}</td>
                </tr>
              ))}
              {topItems.length === 0 && (
                <tr><td colSpan={3} className="text-center py-10 text-swiggy-grayText">No sales data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
