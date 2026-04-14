import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeftIcon, CheckCircleIcon, PhoneIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';

// Leaflet Icons
const restaurantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const riderIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const STEPS = [
  { key: 'order_placed',    label: 'Order Placed',         desc: 'We received your order!' },
  { key: 'confirmed',       label: 'Restaurant Confirmed', desc: 'The restaurant accepted your order.' },
  { key: 'preparing',       label: 'Food Being Prepared',  desc: 'Chef is preparing your food.' },
  { key: 'out_for_delivery',label: 'Out for Delivery',     desc: 'Rider is on the way.' },
  { key: 'delivered',       label: 'Delivered',            desc: 'Enjoy your meal!' },
];

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.panTo(center); }, [center, map]);
  return null;
}

// Mock Coordinates
const restaurantCoords: [number, number] = [17.43, 78.40]; // Jubilee Hills
const userCoords: [number, number] = [17.44, 78.38]; // Another point nearby

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  const [riderCoords, setRiderCoords] = useState<[number, number]>(restaurantCoords);

  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, 'orders', orderId), snap => {
      if (snap.exists()) {
        const o = { id: snap.id, ...snap.data() } as any;
        setOrder(o);
        if (o.status === 'delivered') setConfetti(true);

        // Feature 8: Notification System
        if (prevStatusRef.current && prevStatusRef.current !== o.status) {
          showNotificationForStatus(o.status);
        }
        prevStatusRef.current = o.status;
      }
      setLoading(false);
    });
    return () => unsub();
  }, [orderId]);

  const showNotificationForStatus = (status: string) => {
    let title = '';
    let body = '';
    switch(status) {
      case 'confirmed': title = 'Order Confirmed'; body = 'Your order is confirmed'; break;
      case 'preparing': title = 'Preparing'; body = 'Chef is preparing your food'; break;
      case 'out_for_delivery': title = 'Out for Delivery'; body = 'Rider is on the way'; break;
      case 'delivered': title = 'Delivered'; body = 'Enjoy your meal'; break;
    }
    if (title) {
      toast.success(`${title} - ${body}`, { icon: '🔔' });
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    }
  };

  // Feature 3: Live Map Tracking Rider Movement (Smooth Polish)
  useEffect(() => {
    if (order?.status === 'out_for_delivery') {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.002; // 0.2% step for extremely smooth movement
        if (progress >= 1) { progress = 1; clearInterval(interval); }
        // Interpolate between restaurant and user coordinates
        const newLat = restaurantCoords[0] + (userCoords[0] - restaurantCoords[0]) * progress;
        const newLng = restaurantCoords[1] + (userCoords[1] - restaurantCoords[1]) * progress;
        setRiderCoords([newLat, newLng]);
      }, 100); // Update 10 times a second
      return () => clearInterval(interval);
    }
  }, [order?.status]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#fc8019] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500 text-lg">Order not found</p>
      <button onClick={() => navigate('/order-history')} className="text-[#fc8019] font-bold">← Back to Orders</button>
    </div>
  );

  const currentStep = STEPS.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black/20">
          <div className="text-8xl animate-bounce">🎉</div>
        </div>
      )}
      
      <div className="bg-[#fc8019] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="bg-white/20 rounded-full p-1.5">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-lg">Track Your Order</h1>
          <p className="text-xs opacity-90">#{order.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* AI Delivery Time Prediction */}
        {!['delivered', 'cancelled'].includes(order.status) && (
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <SparklesIcon className="w-8 h-8 text-[#fc8019] animate-pulse" />
            <div>
              <p className="font-extrabold text-gray-800 text-sm">AI Predicted Delivery</p>
              <p className="text-xs text-orange-800 font-bold mt-0.5">
                {order.estimatedDeliveryTime} minutes based on real-time traffic
              </p>
            </div>
          </div>
        )}

        {/* Feature 2: Stepper exactly like Swiggy */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-6 text-lg tracking-tight">Order Status</h2>
          <div className="relative">
            {STEPS.map((step, idx) => {
              const done = idx <= currentStep;
              const active = idx === currentStep;
              return (
                <div key={step.key} className="flex gap-4 mb-6 last:mb-0 relative">
                  {/* Line connecting steps */}
                  {idx < STEPS.length - 1 && (
                    <div className="absolute left-4 top-8 w-0.5 h-12 bg-gray-200" />
                  )}
                  {idx < STEPS.length - 1 && (
                    <div 
                      className="absolute left-4 top-8 w-0.5 h-12 bg-[#fc8019] origin-top transition-transform duration-700 ease-in-out" 
                      style={{ transform: idx < currentStep ? 'scaleY(1)' : 'scaleY(0)' }}
                    />
                  )}
                  {/* Status Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-colors duration-500
                    ${done ? 'bg-[#fc8019] text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? <CheckCircleIcon className="w-6 h-6 animate-fade-in" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                  </div>
                  <div className="pt-1 transition-all duration-300 transform" style={{ opacity: done ? 1 : 0.6 }}>
                    <p className={`font-bold flex items-center gap-2 transition-colors duration-300 ${active ? 'text-gray-900 text-[15px]' : done ? 'text-gray-700 text-sm' : 'text-gray-400 text-sm'}`}>
                      {step.label}
                      {active && <span className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>}
                    </p>
                    <p className="text-[12px] text-gray-500 mt-0.5">{step.desc}</p>
                    {done && order.updatedAt && active && (
                      <p className="text-[10px] text-orange-500 font-bold mt-1 animate-pulse">Updated just now</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature 3: Live Map Tracking */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden h-[250px] relative border border-gray-100">
           <MapContainer center={riderCoords} zoom={13} zoomControl={false} style={{ width: '100%', height: '100%' }}>
             <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
             <Marker position={restaurantCoords} icon={restaurantIcon} />
             <Marker position={userCoords} icon={userIcon} />
             {order.status === 'out_for_delivery' && <Marker position={riderCoords} icon={riderIcon} />}
             <Polyline positions={[restaurantCoords, userCoords]} color="#fc8019" weight={3} dashArray="5, 10" />
             <MapController center={order.status === 'out_for_delivery' ? riderCoords : restaurantCoords} />
           </MapContainer>
        </div>

        {/* Feature 4: Rider Details Card */}
        {order.status === 'out_for_delivery' && (
          <div className="bg-white border-2 border-[#fc8019] rounded-2xl shadow-sm p-5 animate-slide-up">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center font-bold text-[#fc8019] text-xl">
                      {order.riderName?.[0] || 'R'}
                   </div>
                   <div>
                      <p className="font-bold text-gray-900">{order.riderName || 'Rider Assigned'}</p>
                      <p className="text-xs text-gray-500 font-medium tracking-wide">DELIVERY PARTNER</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="font-black text-2xl text-[#fc8019]">12<span className="text-sm">min</span></p>
                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Arriving In</p>
                </div>
             </div>
             <div className="flex gap-3">
                <a href={`tel:${order.riderPhone || '123'}`} className="flex-1 bg-green-50 text-green-700 border border-green-200 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-colors hover:bg-green-100">
                   <PhoneIcon className="w-4 h-4" /> Call Rider
                </a>
                <button className="flex-1 bg-gray-50 text-gray-700 border border-gray-200 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-colors hover:bg-gray-100" onClick={() => toast("Chat started!", {icon: '💬'})}>
                   <ChatBubbleLeftIcon className="w-4 h-4" /> Chat
                </button>
             </div>
          </div>
        )}

        {/* Order Items Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 tracking-tight">Order Details</h3>
          <div className="space-y-3">
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 font-medium flex items-center gap-2">
                  <div className="w-2 h-2 rounded bg-green-500" />
                  {item.name} <span className="text-gray-400">× {item.quantity}</span>
                </span>
                <span className="font-bold text-gray-900">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-gray-200 mt-4 pt-4 flex justify-between font-extrabold text-[15px] tracking-tight text-gray-900">
            <span>Total Amount Paid</span>
            <span>₹{order.totalAmount}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
