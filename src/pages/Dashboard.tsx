import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocationInfo } from '../contexts/LocationContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Order, MenuItem } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClockIcon, ChartBarIcon, SparklesIcon,
  ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const customOrangeIcon = new L.Icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const HYDERABAD_AREAS = [
  { display_name: 'BN Reddy Nagar, Hyderabad, Telangana', lat: '17.3323', lon: '78.5519' },
  { display_name: 'Jubilee Hills, Hyderabad, Telangana', lat: '17.4326', lon: '78.4071' },
  { display_name: 'Banjara Hills, Hyderabad, Telangana', lat: '17.4168', lon: '78.4398' },
  { display_name: 'Madhapur, Hyderabad, Telangana', lat: '17.4483', lon: '78.3915' },
  { display_name: 'Gachibowli, Hyderabad, Telangana', lat: '17.4399', lon: '78.3483' },
  { display_name: 'Kukatpally, Hyderabad, Telangana', lat: '17.4948', lon: '78.3996' },
  { display_name: 'Secunderabad, Hyderabad, Telangana', lat: '17.4399', lon: '78.4983' },
  { display_name: 'Uppal, Hyderabad, Telangana', lat: '17.4018', lon: '78.5602' },
  { display_name: 'Dilsukhnagar, Hyderabad, Telangana', lat: '17.3688', lon: '78.5247' },
  { display_name: 'Ameerpet, Hyderabad, Telangana', lat: '17.4375', lon: '78.4482' },
];

// Haversine formula for distance
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
};

function MapFlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, 14); }, [center, map]);
  return null;
}

const CATEGORIES = [
  { name: 'South Indian', img: '/img/cat_south_indian.png' },
  { name: 'Dosa',         img: '/img/food_dosa.png' },
  { name: 'Idli',         img: '/img/cat_south_indian.png' },
  { name: 'Vada',         img: '/img/cat_south_indian.png' },
  { name: 'North Indian', img: '/img/cat_north_indian.png' },
  { name: 'Poori',        img: '/img/cat_north_indian.png' },
  { name: 'Desserts',     img: '/img/cat_desserts.png' },
  { name: 'Tea',          img: '/img/food_coffee.png' },
  { name: 'Burger',       img: '/img/food_burger.png' },
  { name: 'Khichdi',      img: '/img/cat_north_indian.png' },
  { name: 'Pizza',        img: '/img/food_burger.png' },
  { name: 'Paratha',      img: '/img/cat_north_indian.png' },
  { name: 'Chinese',      img: '/img/cat_chinese.png' },
  { name: 'Salad',        img: '/img/cat_south_indian.png' },
];



const GROCERY_CATEGORIES = [
  { name: 'Fresh Vegetables',      img: '/img/cat_south_indian.png' },
  { name: 'Fresh Fruits',          img: '/img/cat_desserts.png' },
  { name: 'Dairy Bread/Eggs',      img: '/img/food_dosa.png' },
  { name: 'Rice Atta and Dals',    img: '/img/cat_biryani.png' },
  { name: 'Masalas & Dry Fruits',  img: '/img/cat_north_indian.png' },
  { name: 'Oils and Ghee',         img: '/img/food_coffee.png' },
  { name: 'Munchies',              img: '/img/food_burger.png' },
];


const FOOD_CITIES = ['Bangalore', 'Gurgaon', 'Hyderabad', 'Delhi', 'Mumbai', 'Pune', 'Kolkata', 'Chennai', 'Ahmedabad', 'Chandigarh', 'Jaipur'];


const POPULAR_CHAINS = [
  'CampusEats Biryani', 'Canteen Chai Corner', 'The Dosa Hub', 'Quick Bites',
  'Spice Garden', 'Fresh Juice Bar', 'Snack Attack', 'The Rice Bowl',
  'Campus Burger Co.', 'Cool Drinks Corner', 'Al-Rayan Canteen', 'Hyderabad Sweets',
];

const OFFERS = ['20% OFF', '15% OFF', 'FREE DELIVERY', 'ITEMS AT ₹99', '30% OFF', '10% OFF', 'UPTO ₹40 OFF', 'COMBO DEAL'];

function getRating() { return (3.8 + Math.random() * 1.1).toFixed(1); }
function getTime() {
  const t = ['10–15 mins', '15–20 mins', '20–25 mins', '30–40 mins', '25–35 mins'];
  return t[Math.floor(Math.random() * t.length)];
}

const RESTAURANT_IMAGES = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
  'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&q=80',
  'https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?w=600&q=80',
  'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=600&q=80',
  'https://images.unsplash.com/photo-1554679665-f5537f187268?w=600&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  'https://images.unsplash.com/photo-1588674972161-fb54041e17ee?w=600&q=80',
];

export default function Dashboard() {
  const { user } = useAuth();
  const { location: userLoc } = useLocationInfo();
  const navigate = useNavigate();
  const catScrollRef = useRef<HTMLDivElement>(null);



  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [topItems, setTopItems] = useState<MenuItem[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typedLocation, setTypedLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentAreaName, setCurrentAreaName] = useState('Jubilee Hills');
  const [selectedCenter, setSelectedCenter] = useState<[number, number]>([17.4326, 78.4071]);
  const [realRestaurants, setRealRestaurants] = useState<any[]>([]);
  const [isFetchingRestaurants, setIsFetchingRestaurants] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const openRestaurantModal = (r: any) => { setAiInsight(null); setSelectedRestaurant(r); };
  const closeRestaurantModal = () => { setSelectedRestaurant(null); setAiInsight(null); };

  const handleLocationType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedLocation(val);
    if (typingTimeout) clearTimeout(typingTimeout);
    if (!val.trim()) { setLocationSuggestions([]); return; }
    setIsSearchingLocation(true);
    setTypingTimeout(setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&countrycodes=in&email=tastytrail@example.com`, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        setLocationSuggestions(data?.length ? data : HYDERABAD_AREAS.filter(a => a.display_name.toLowerCase().includes(val.toLowerCase())));
      } catch {
        setLocationSuggestions(HYDERABAD_AREAS.filter(a => a.display_name.toLowerCase().includes(val.toLowerCase())));
      } finally { setIsSearchingLocation(false); }
    }, 500) as unknown as NodeJS.Timeout);
  };

  const fetchRestaurantsAt = async (lat: number, lng: number, areaName: string) => {
    setIsFetchingRestaurants(true);
    setSelectedCenter([lat, lng]);
    setCurrentAreaName(areaName);
    setLocationSuggestions([]);
    setTypedLocation(areaName);
    const q = `[out:json][timeout:25];\n(\nnode["amenity"="restaurant"](around:3000,${lat},${lng});\nnode["amenity"="fast_food"](around:3000,${lat},${lng});\nnode["amenity"="cafe"](around:3000,${lat},${lng});\n);\nout body 20;`;
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      const raw = data.elements.filter((e: any) => e.tags?.name).map((e: any, i: number) => ({
        id: e.id, name: e.tags.name,
        cuisine: e.tags.cuisine?.replace(/;/g, ', ') || 'South Indian, Cafe',
        openingHours: e.tags.opening_hours, phone: e.tags.phone,
        address: e.tags['addr:street'], lat: e.lat, lon: e.lon,
        photoUrl: RESTAURANT_IMAGES[i % RESTAURANT_IMAGES.length],
      }));
      const unique: any[] = Array.from(new Map(raw.map((x: any) => [x.name, x])).values());
      setRealRestaurants(unique.slice(0, 20));
      if (!unique.length) throw new Error('empty');
    } catch {
      setRealRestaurants([
        { id: 'm1', name: `${areaName} Biryani House`, cuisine: 'Biryani, South Indian', lat: lat+0.001, lon: lng+0.001, photoUrl: RESTAURANT_IMAGES[0] },
        { id: 'm2', name: `Paradise Restaurant`, cuisine: 'North Indian, Chinese', lat: lat-0.001, lon: lng-0.002, photoUrl: RESTAURANT_IMAGES[1] },
        { id: 'm3', name: `Hotel Minerva`, cuisine: 'South Indian', lat: lat+0.002, lon: lng-0.001, photoUrl: RESTAURANT_IMAGES[2] },
        { id: 'm4', name: `${areaName} Spice Garden`, cuisine: 'Snacks, Cafe', lat: lat-0.002, lon: lng+0.002, photoUrl: RESTAURANT_IMAGES[3] },
        { id: 'm5', name: `Rayalaseema Ruchulu`, cuisine: 'Traditional', lat: lat+0.0015, lon: lng+0.0015, photoUrl: RESTAURANT_IMAGES[4] },
        { id: 'm6', name: `${areaName} Family Dhaba`, cuisine: 'North Indian', lat: lat-0.0015, lon: lng-0.0015, photoUrl: RESTAURANT_IMAGES[5] },
      ]);
    } finally { setIsFetchingRestaurants(false); }
  };

  useEffect(() => {
    setRealRestaurants([
      { id: '1', name: 'Jubilee Hills Biryani Co.', cuisine: 'Biryani, South Indian', lat: 17.4326, lon: 78.4071, photoUrl: RESTAURANT_IMAGES[0] },
      { id: '2', name: 'Jubilee Hills Spice Garden', cuisine: 'North Indian, Chinese', lat: 17.4336, lon: 78.4081, photoUrl: RESTAURANT_IMAGES[1] },
      { id: '3', name: 'The Dosa Hub Jubilee Hills', cuisine: 'South Indian', lat: 17.4316, lon: 78.4061, photoUrl: RESTAURANT_IMAGES[2] },
      { id: '4', name: 'Paradise Biryani', cuisine: 'Biryani', lat: 17.4320, lon: 78.4090, photoUrl: RESTAURANT_IMAGES[3] },
      { id: '5', name: 'Chutneys Jubilee Hills', cuisine: 'South Indian', lat: 17.4310, lon: 78.4080, photoUrl: RESTAURANT_IMAGES[4] },
      { id: '6', name: 'Barbeque Nation', cuisine: 'Grill, North Indian', lat: 17.4340, lon: 78.4060, photoUrl: RESTAURANT_IMAGES[5] },
    ]);
  }, []);

  const handleGetAIInsight = (r: any) => {
    setAiInsight([
      `✨ ${r.name} is a must-visit for ${r.cuisine || 'multi-cuisine'} lovers in ${currentAreaName}.`,
      `Known for vibrant ambiance, fresh ingredients, and locally authentic dishes.`,
      `Whether a quick bite or a family dinner, this spot consistently delivers a memorable experience.`
    ].join(' '));
  };

  useEffect(() => {
    if (!user) return;
    const ordersRef = collection(db, 'orders');
    const qOrders = user.role === 'customer'
      ? query(ordersRef, where('studentId', '==', user.uid))
      : query(ordersRef);
    const unsubOrders = onSnapshot(qOrders, snap => {
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      if (user.role === 'customer') {
        list = list.filter(o => ['Placed', 'Preparing', 'Ready'].includes(o.status));
        list.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      } else {
        list = list.filter(o => ['Placed', 'Preparing'].includes(o.status));
        list.sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis());
      }
      setActiveOrders(list);
    });
    const qTop = query(collection(db, 'menuItems'), where('available', '==', true), limit(8));
    const unsubTop = onSnapshot(qTop, snap => { setTopItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem))); setLoading(false); });
    const qAll = query(collection(db, 'menuItems'), where('available', '==', true));
    const unsubAll = onSnapshot(qAll, snap => setAllItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem))));
    return () => { unsubOrders(); unsubTop(); unsubAll(); };
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    setSearchResults(allItems.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)));
  }, [searchQuery, allItems]);

  const scrollCats = (dir: 'left' | 'right') => {
    catScrollRef.current?.scrollBy({ left: dir === 'right' ? 280 : -280, behavior: 'smooth' });
  };
  const handleSearchSelect = (item: MenuItem) => {
    setSearchQuery(item.name);
    if (foodDropdownRef.current) foodDropdownRef.current.style.display = 'none';
  };

  const searchBarRef = useRef<HTMLInputElement>(null);
  const foodDropdownRef = useRef<HTMLDivElement>(null);
  const locSearchBarRef = useRef<HTMLInputElement>(null);
  const locDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const t = e.target as Node;
      if (searchBarRef.current && !searchBarRef.current.contains(t) && !foodDropdownRef.current?.contains(t)) setSearchQuery('');
      if (locSearchBarRef.current && !locSearchBarRef.current.contains(t) && !locDropdownRef.current?.contains(t)) setLocationSuggestions([]);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (!user) return null;

  /* ─── STAFF / ADMIN VIEW ─── */
  if (user.role !== 'customer') {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-12 pb-20 space-y-8 bg-white min-h-screen">
        <header>
          <h1 className="page-header">Hello, {user.name.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 text-lg">Here is your TastyTrail restaurant's operational snapshot today.</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="border border-gray-100 rounded-2xl p-8 flex flex-col items-center text-center bg-white shadow-sm">
            <span className="text-6xl font-bold text-blue-600 mb-3">{activeOrders.length}</span>
            <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">Pending Orders</span>
          </div>
          <div className="border border-gray-100 rounded-2xl p-8 flex flex-col items-center text-center bg-white shadow-sm">
            <span className="text-6xl font-bold text-[#fc8019] mb-3">{activeOrders.filter(o => o.status === 'Preparing').length}</span>
            <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">Being Prepared</span>
          </div>
          <div className="border border-gray-100 rounded-2xl p-8 flex items-center justify-center cursor-pointer hover:border-[#fc8019] transition-all bg-white shadow-sm group" onClick={() => navigate('/kitchen')}>
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#fc8019] group-hover:text-white transition-all">
                <ClockIcon className="w-7 h-7" />
              </div>
              <span className="font-bold text-gray-800">Enter Kitchen Display →</span>
            </div>
          </div>
        </div>
        {user.role === 'restaurant_admin' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link to="/reports" className="border border-gray-100 rounded-2xl p-6 flex items-center gap-5 hover:border-[#fc8019] transition-all bg-white shadow-sm group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-green-50 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500 z-0" />
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center z-10 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <ChartBarIcon className="w-6 h-6" />
              </div>
              <div className="z-10">
                <h3 className="font-bold text-lg text-gray-800">Sales Reports</h3>
                <p className="text-sm text-gray-500 mt-0.5">Revenue charts &amp; top items</p>
              </div>
            </Link>
            <Link to="/ai-prediction" className="border border-gray-100 rounded-2xl p-6 flex items-center gap-5 hover:border-[#fc8019] transition-all bg-white shadow-sm group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-purple-50 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500 z-0" />
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center z-10 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <SparklesIcon className="w-6 h-6" />
              </div>
              <div className="z-10">
                <h3 className="font-bold text-lg text-gray-800">AI Demand Prediction</h3>
                <p className="text-sm text-gray-500 mt-0.5">Auto-forecast tomorrow's demand</p>
              </div>
            </Link>
          </div>
        )}
      </div>
    );
  }

  /* ─── CUSTOMER VIEW ─── */
  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, backgroundColor: '#fff' }}>



      {/* ══════════════════════════════════════════
          1. HERO SECTION & CATEGORY CARDS FULL BLEED
      ══════════════════════════════════════════ */}
      <div style={{
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        background: '#FF5200',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0',
        boxSizing: 'border-box',
        overflow: 'hidden', /* For the edge images on hero */
      }}>
        {/* HERO TOP PART */}
        <div style={{ position: 'relative', width: '100%', minHeight: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', boxSizing: 'border-box' }}>
          {/* Left food image */}
          <img
            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80"
            alt=""
            aria-hidden="true"
            style={{ position: 'absolute', left: '0', bottom: '0', height: '100%', width: '30%', objectFit: 'cover', zIndex: 1, WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 30%, transparent 100%)', maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 30%, transparent 100%)' }}
            className="hidden xl:block pointer-events-none"
          />
          {/* Right sushi image */}
          <img
            src="https://images.unsplash.com/photo-1553621042-f6e147245754?w=500&q=80"
            alt=""
            aria-hidden="true"
            style={{ position: 'absolute', right: '0', bottom: '0', height: '100%', width: '30%', objectFit: 'cover', zIndex: 1, WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 30%, transparent 100%)', maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 30%, transparent 100%)' }}
            className="hidden xl:block pointer-events-none"
          />

          {/* Hero content */}
          <div style={{ position: 'relative', zIndex: 3, width: '100%', textAlign: 'center' }}>
            <h1 style={{ color: '#fff', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, lineHeight: 1.1, margin: '0 auto 40px auto', letterSpacing: '-1px' }}>
              Order food and groceries. Discover<br />
              best restaurants. TastyTrail it!
            </h1>

            {/* Two completely separate white rounded input boxes side by side */}
            <div className="flex flex-col md:flex-row gap-4 w-full max-w-3xl mx-auto justify-center px-4 md:px-0">
              
              {/* Left Box: Location (40% width on Desktop) */}
              <div className="w-full md:w-[40%] bg-white rounded-2xl h-14 md:h-16 flex items-center px-4 md:px-5 gap-3 shadow-[0_12px_32px_rgba(0,0,0,0.15)] relative flex-shrink-0">
                <span style={{ fontSize: '24px', flexShrink: 0, color: '#ff5200' }}>📍</span>
                <input
                  ref={locSearchBarRef}
                  type="text"
                  placeholder="Enter your delivery location"
                  value={typedLocation}
                  onChange={handleLocationType}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', fontWeight: 600, color: '#1c1c1c', background: 'transparent', minWidth: 0 }}
                />
                <span style={{ fontSize: '16px', color: '#ff5200', fontWeight: 900, cursor: 'pointer' }}>▼</span>
                
                {isSearchingLocation && (
                  <div style={{ position: 'absolute', right: '48px', width: '18px', height: '18px', border: '3px solid #ff5200', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                )}
                {locationSuggestions.length > 0 && (
                  <div ref={locDropdownRef} style={{ position: 'absolute', top: '72px', left: 0, width: '100%', background: '#fff', borderRadius: '16px', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', zIndex: 100, maxHeight: '280px', overflowY: 'auto' }}>
                    {locationSuggestions.map((s, i) => (
                      <div key={i} onClick={() => fetchRestaurantsAt(parseFloat(s.lat), parseFloat(s.lon), s.display_name.split(',')[0])}
                        style={{ padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', fontSize: '15px' }}
                        className="hover:bg-orange-50 transition-colors text-left">
                        <div style={{ fontWeight: 800, color: '#1c1c1c' }}>{s.display_name.split(',')[0]}</div>
                        <div style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>{s.display_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Box: Food Search (60% width on Desktop) */}
              <div className="w-full md:w-[60%] bg-white rounded-2xl h-14 md:h-16 flex items-center px-4 md:px-5 gap-3 shadow-[0_12px_32px_rgba(0,0,0,0.15)] relative flex-shrink-0">
                <input
                  ref={searchBarRef}
                  type="text"
                  placeholder="Search for restaurant, item or more"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', fontWeight: 500, color: '#1c1c1c', background: 'transparent', minWidth: 0 }}
                />
                <span style={{ fontSize: '22px', color: '#888', flexShrink: 0 }}>🔍</span>
                
                {searchQuery.length > 0 && (
                  <div ref={foodDropdownRef} style={{ position: 'absolute', top: '72px', left: 0, width: '100%', background: '#fff', borderRadius: '16px', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', zIndex: 100, maxHeight: '360px', overflowY: 'auto' }}>
                    {searchResults.length > 0 ? searchResults.map((item, index) => (
                      <div key={index} onClick={() => {
                          setSearchQuery(item.name);
                        }}
                        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
                        className="hover:bg-orange-50 transition-colors text-left">
                        <img src={item.photoUrl} alt={item.name} style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '15px', color: '#1c1c1c' }}>{item.name}</div>
                          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px', fontWeight: 600 }}>{item.category} <span style={{color: '#ff5200'}}>• ₹{item.price}</span></div>
                        </div>
                      </div>
                    )) : (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#888', fontSize: '15px', fontWeight: 600 }}>Give the correct text</div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          2. CATEGORY CARDS (STILL ON ORANGE BACKGROUND)
      ══════════════════════════════════════════ */}
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-[#FF5200] px-6 pb-16 z-[5] pt-4 md:pt-0 mt-8 md:mt-0">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card 1 — Food Delivery */}
            {[
              { title: 'FOOD DELIVERY', sub: 'FROM RESTAURANTS', discount: 'UPTO 60% OFF', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', onClick: () => document.getElementById('discover-rest')?.scrollIntoView({ behavior: 'smooth' }) },
              { title: 'INSTAMART', sub: 'INSTANT GROCERY', discount: 'UPTO 60% OFF', img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80', onClick: () => navigate('/menu') },
              { title: 'DINEOUT', sub: 'EAT OUT AND SAVE MORE', discount: 'UPTO 50% OFF', img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80', onClick: () => document.getElementById('discover-rest')?.scrollIntoView({ behavior: 'smooth' }) },
            ].map((card, idx) => (
              <div
                key={card.title}
                onClick={card.onClick}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '24px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
                  padding: '32px',
                  minHeight: '260px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  overflow: 'visible' /* Crucial for bleeding image */
                }}
                className="hover:-translate-y-2 hover:shadow-2xl"
              >
                <div style={{ zIndex: 2, position: 'relative', maxWidth: '65%' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1c1c1c', margin: 0, letterSpacing: '-0.5px' }}>{card.title}</h2>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#7e808c', margin: '8px 0 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.sub}</p>
                  <p style={{ fontSize: '15px', fontWeight: 900, color: '#FF5200', margin: '20px 0 0' }}>{card.discount}</p>
                </div>
                
                {/* Arrow button */}
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FF5200', color: '#fff', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, fontWeight: 900, position: 'relative', flexShrink: 0, marginTop: '20px' }}>
                  →
                </div>

                {/* Background image BLEEDING out of the bottom right */}
                <img
                  src={card.img}
                  alt={card.title}
                  style={{
                    position: 'absolute',
                    right: '-16px',
                    bottom: '-16px',
                    width: '140px',
                    height: '140px',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    zIndex: 3,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    border: '6px solid #fff' /* To make the popping out cleanly framed */
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      {/* ══════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════ */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 5% 80px 5%', boxSizing: 'border-box' }}>

        {/* ================================================================
            SECTION 1 — ORDER OUR BEST FOOD OPTIONS
        ================================================================ */}
        <section style={{ marginBottom: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#02060c', margin: 0, letterSpacing: '-0.3px' }}>Order our best food options</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => catScrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' })} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e2e7', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>←</button>
              <button onClick={() => catScrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' })} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e2e7', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>→</button>
            </div>
          </div>
          <div ref={catScrollRef} className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowX: 'auto', paddingBottom: '16px', scrollBehavior: 'smooth' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              {CATEGORIES.slice(0, 7).map(cat => (
                <div key={cat.name} onClick={() => navigate('/menu')} style={{ cursor: 'pointer', flexShrink: 0, width: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }} className="group">
                  <img src={cat.img} alt={cat.name} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }} className="group-hover:scale-105 transition-transform" />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#414449' }}>{cat.name}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              {CATEGORIES.slice(7, 14).map(cat => (
                <div key={cat.name} onClick={() => navigate('/menu')} style={{ cursor: 'pointer', flexShrink: 0, width: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }} className="group">
                  <img src={cat.img} alt={cat.name} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }} className="group-hover:scale-105 transition-transform" />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#414449' }}>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            MAP SECTION — EXPLORE RESTAURANTS NEAR YOU
        ================================================================ */}
        <section style={{ marginBottom: '72px', marginTop: '8px' }}>
          <div style={{ width: '100%', height: '400px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', position: 'relative', border: '1.5px solid #f0f0f0' }}>
            <MapContainer center={selectedCenter} zoom={14} scrollWheelZoom={false} style={{ width: '100%', height: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              <MapFlyTo center={selectedCenter} />
              <Marker position={selectedCenter}>
                <Popup>📍 {currentAreaName}</Popup>
              </Marker>
              {realRestaurants.map(r => r.lat && r.lon && (
                <Marker key={r.id} position={[r.lat, r.lon]} icon={customOrangeIcon} eventHandlers={{ click: () => openRestaurantModal(r) }}>
                  <Popup>{r.name}</Popup>
                </Marker>
              ))}
            </MapContainer>
            {/* Exploring label */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', padding: '10px 18px', borderRadius: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.6)' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#FF5200', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>Exploring</p>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1c1c1c', margin: '2px 0 0' }}>{currentAreaName}</h3>
            </div>
          </div>

          {/* Restaurants near you */}
          <div style={{ marginTop: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#3d4152', marginBottom: '24px', letterSpacing: '-0.3px' }}>Restaurants near {currentAreaName?.split(',')[0]}</h2>
            {isFetchingRestaurants ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: '260px', borderRadius: '16px', backgroundColor: '#f5f5f5', animation: 'pulse 1.5s ease infinite' }} />)}
              </div>
            ) : realRestaurants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed #e9e9eb', borderRadius: '20px', background: '#fafafa' }}>
                <p style={{ fontSize: '20px', fontWeight: 800, color: '#3d4152', margin: 0 }}>No restaurants found yet.</p>
                <p style={{ fontSize: '14px', color: '#aaa', marginTop: '8px' }}>Search for an area above to discover nearby spots!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {realRestaurants.map((r, idx) => (
                  <div key={r.id} onClick={() => openRestaurantModal(r)} style={{ backgroundColor: '#fff', borderRadius: '18px', overflow: 'hidden', border: '1.5px solid #f0f0f0', cursor: 'pointer', transition: 'transform 0.25s ease, box-shadow 0.25s ease' }} className="hover:-translate-y-1 hover:shadow-xl">
                    <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                      <img src={r.photoUrl} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }} />
                      <span style={{ position: 'absolute', bottom: '12px', left: '14px', color: '#fff', fontWeight: 800, fontSize: '14px', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{OFFERS[idx % OFFERS.length]}</span>
                    </div>
                    <div style={{ padding: '16px 18px' }}>
                      <h3 style={{ fontWeight: 800, fontSize: '16px', color: '#1c1c1c', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 4px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#119E42', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <StarIcon style={{ width: '11px', height: '11px', color: '#fff' }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1c1c1c' }}>{getRating()}</span>
                        <span style={{ color: '#ddd' }}>•</span>
                        <span style={{ fontSize: '13px', color: '#93959f' }}>{getTime()}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#93959f', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.cuisine}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ================================================================
            SECTION 2 — SHOP GROCERIES ON INSTAMART
        ================================================================ */}
        <section style={{ marginBottom: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#02060c', margin: 0, letterSpacing: '-0.3px' }}>Shop groceries on Instamart</h2>
          </div>
          <div className="no-scrollbar" style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '16px' }}>
            {GROCERY_CATEGORIES.map(cat => (
              <div key={cat.name} onClick={() => navigate('/menu')} style={{ cursor: 'pointer', flexShrink: 0, width: '140px', display: 'flex', flexDirection: 'column', gap: '12px' }} className="group">
                <img src={cat.img} alt={cat.name} style={{ width: '140px', height: '140px', borderRadius: '16px', objectFit: 'cover' }} className="group-hover:scale-105 transition-transform" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#02060c', textAlign: 'center' }}>{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================
            SECTION 3 — DISCOVER BEST RESTAURANTS ON DINEOUT
        ================================================================ */}
        <section style={{ marginBottom: '80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#02060c', margin: 0, letterSpacing: '-0.3px' }}>Discover best restaurants on Dineout</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px' }}>
            {realRestaurants.map((r, idx) => {
               const dist = r.lat && r.lon && userLoc?.coordinates ? getDistanceKm(r.lat, r.lon, userLoc.coordinates[0], userLoc.coordinates[1]) : '1.2';
               // Fallback using guaranteed local images cyclically
               const fallbackImgs = [
                 '/img/cat_biryani.png',
                 '/img/cat_south_indian.png',
                 '/img/cat_north_indian.png',
                 '/img/food_burger.png'
               ];
               const photo = r.photoUrl || fallbackImgs[idx % fallbackImgs.length];
               return (
                <div key={r.id} onClick={() => openRestaurantModal(r)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} className="hover:-translate-y-1">
                  <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '24px', overflow: 'hidden', marginBottom: '16px' }}>
                    <img src={photo} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '30px 16px 12px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 800, fontSize: '18px' }}>
                        {r.name} <span style={{ background: '#259b38', padding: '2px 6px', borderRadius: '6px', fontSize: '13px' }}>★ {getRating()}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '0 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#02060c', fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
                      <span style={{ color: '#414449', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{r.cuisine}</span>
                      <span>₹400 for two</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#888', fontWeight: 500, marginBottom: '16px' }}>
                      {currentAreaName?.split(',')[0]} • {dist} km
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                      <div style={{ background: '#eaf7ef', color: '#16a34a', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        % Flat 10% off on walk-in + 1 more
                      </div>
                      <div style={{ background: '#f5f5f5', color: '#ff5200', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, display: 'inline-block', alignSelf: 'flex-start' }}>
                        Up to 10% off with bank offers
                      </div>
                    </div>
                  </div>
                </div>
               );
            })}
          </div>
        </section>



        {/* ================================================================
            SECTION 5 & 6 — CITIES GRID
        ================================================================ */}
        <section className="my-12">
          <h2 className="text-xl md:text-2xl font-extrabold text-[#02060c] mb-6 tracking-tight">Cities with food delivery</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {FOOD_CITIES.map(city => (
              <div key={city} onClick={() => fetchRestaurantsAt(17.3850, 78.4867, city)} style={{ border: '1px solid #e2e2e7', padding: '16px', borderRadius: '12px', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: '#414449', cursor: 'pointer' }} className="hover:border-[#02060c] hover:shadow-sm">
                Order food online in {city}
              </div>
            ))}
            <div style={{ border: '1px solid #e2e2e7', padding: '16px', borderRadius: '12px', textAlign: 'center', fontSize: '15px', fontWeight: 700, color: '#02060c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} className="hover:border-[#02060c]">
              Show More <span style={{ color: '#FF5200' }}>▼</span>
            </div>
          </div>
        </section>

        <section className="my-12">
          <h2 className="text-xl md:text-2xl font-extrabold text-[#02060c] mb-6 tracking-tight">Cities with grocery delivery</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {FOOD_CITIES.map(city => (
              <div key={city} onClick={() => fetchRestaurantsAt(17.3850, 78.4867, city)} style={{ border: '1px solid #e2e2e7', padding: '16px', borderRadius: '12px', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: '#414449', cursor: 'pointer' }} className="hover:border-[#02060c] hover:shadow-sm">
                Order grocery delivery in {city}
              </div>
            ))}
            <div style={{ border: '1px solid #e2e2e7', padding: '16px', borderRadius: '12px', textAlign: 'center', fontSize: '15px', fontWeight: 700, color: '#02060c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} className="hover:border-[#02060c]">
              Show More <span style={{ color: '#FF5200' }}>▼</span>
            </div>
          </div>
        </section>

      </div>{/* end max-width container */}

      {/* ══════════════════════════════════════════
          RESTAURANT DETAIL MODAL
      ══════════════════════════════════════════ */}
      {selectedRestaurant && (
        <>
          <div onClick={closeRestaurantModal} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100000, backdropFilter: 'blur(2px)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '520px', maxWidth: '95vw', maxHeight: '88vh', borderRadius: '24px', backgroundColor: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', zIndex: 100001, overflowY: 'auto', overflowX: 'hidden' }}>
            {/* Close button */}
            <button onClick={closeRestaurantModal} style={{ position: 'absolute', top: '14px', right: '14px', width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: '#fff', fontSize: '18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', zIndex: 10, color: '#1c1c1c' }}>
              &times;
            </button>
            {/* Hero image */}
            <div style={{ position: 'relative', height: '220px', flexShrink: 0 }}>
              <img src={selectedRestaurant.photoUrl} alt={selectedRestaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)' }} />
              <div style={{ position: 'absolute', bottom: '18px', left: '22px' }}>
                <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 900, margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{selectedRestaurant.name}</h2>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 700, margin: '5px 0 0', textTransform: 'uppercase', letterSpacing: '1.2px' }}>{selectedRestaurant.cuisine}</p>
              </div>
            </div>
            {/* Info rows */}
            <div style={{ padding: '24px 28px 0' }}>
              {[
                { icon: '📍', text: `${selectedRestaurant.address || currentAreaName}, Hyderabad, Telangana` },
                { icon: '🕒', text: selectedRestaurant.openingHours || 'Open Now • Closes 11 PM' },
                { icon: '📞', text: selectedRestaurant.phone || 'Contact unavailable' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '14px', marginBottom: '14px', borderBottom: i < 2 ? '1px solid #f5f5f5' : 'none' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{row.icon}</span>
                  <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500, lineHeight: 1.5 }}>{row.text}</span>
                </div>
              ))}
            </div>
            {/* Google Maps link */}
            <div style={{ padding: '0 28px 20px' }}>
              <a href={`https://www.google.com/maps/search/?api=1&query=${selectedRestaurant.lat||17.43},${selectedRestaurant.lon||78.40}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '8px 16px', borderRadius: '10px', textDecoration: 'none' }}>
                ↗ Open in Google Maps
              </a>
            </div>
            {/* AI Insight */}
            <div style={{ margin: '0 28px 20px', background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '16px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 800, fontSize: '13px', color: '#92400e' }}>✨ AI Insight</span>
                {!aiInsight && (
                  <button onClick={() => handleGetAIInsight(selectedRestaurant)} style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    Generate
                  </button>
                )}
              </div>
              <p className="text-xs text-[#78350f] leading-7 font-medium m-0">
                {aiInsight || 'Click "Generate" to get a quick AI summary about this restaurant.'}
              </p>
            </div>
            <div className="px-7 pb-7">
              <button onClick={() => { closeRestaurantModal(); navigate('/menu'); }}
                className="w-full bg-[#fc8019] text-white border-none rounded-2xl py-4 text-sm font-extrabold cursor-pointer tracking-wide uppercase shadow-lg transition-colors hover:bg-[#e06f13]">
                View Menu &amp; Order Now
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          COMPREHENSIVE FOOTER
      ══════════════════════════════════════════ */}
      <footer className="bg-[#f0f0f5] py-16 mt-16 w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10 px-6 text-[#02060c]">
          
          {/* Column 1: Logo & Copyright */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: '#fc8019', borderRadius: '30%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-12deg)' }}>
                <span style={{ fontWeight: 900, fontSize: '18px', color: '#fff' }}>T</span>
              </div>
              <span style={{ fontWeight: 900, fontSize: '24px', letterSpacing: '-0.5px' }}>TastyTrail</span>
            </div>
            <div style={{ fontSize: '15px', color: '#414449', fontWeight: 600, marginBottom: '24px' }}>© 2026 TastyTrail Limited</div>
            
            {/* Contact Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <a href="tel:+918317527369" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#414449', fontSize: '15px', fontWeight: 600 }} className="hover:text-black">
                <span style={{ fontSize: '18px' }}>📞</span> +91-8317527369
              </a>
              <a href="mailto:mvreddy052005@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#414449', fontSize: '15px', fontWeight: 600 }} className="hover:text-black">
                <span style={{ fontSize: '18px' }}>✉️</span> mvreddy052005@gmail.com
              </a>
            </div>

            {/* Social Links */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '12px' }}>
              <a href="https://www.linkedin.com/in/muduganti-venkateshwar-reddy/" target="_blank" rel="noopener noreferrer" style={{ color: '#414449', transition: 'color 0.2s' }} className="hover:text-[#0077b5]">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '24px', height: '24px' }}><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a href="https://www.instagram.com/mvr_venky/" target="_blank" rel="noopener noreferrer" style={{ color: '#414449', transition: 'color 0.2s' }} className="hover:text-[#E1306C]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="#" style={{ color: '#414449', transition: 'color 0.2s' }} className="hover:text-[#1877F2]">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '24px', height: '24px' }}><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
              </a>
              <a href="#" style={{ color: '#414449', transition: 'color 0.2s' }} className="hover:text-[#E60023]">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '24px', height: '24px' }}><path d="M12.017 0c-6.627 0-12 5.373-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" style={{ color: '#414449', transition: 'color 0.2s' }} className="hover:text-[#1DA1F2]">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '24px', height: '24px' }}><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
            </div>
          </div>

          {/* Column 2: Company */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px 0' }}>Company</h3>
            {['About Us', 'TastyTrail Corporate', 'Careers', 'Team', 'TastyTrail One', 'TastyTrail Instamart', 'TastyTrail Dineout', 'Minis', 'Pyng'].map(link => (
              <a key={link} href="#" style={{ textDecoration: 'none', color: '#414449', fontSize: '15px', fontWeight: 500 }} className="hover:text-black">{link}</a>
            ))}
          </div>

          {/* Column 3: Contact & Legal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px 0' }}>Contact us</h3>
            {['Help & Support', 'Partner With Us', 'Ride With Us'].map(link => (
              <a key={link} href="#" style={{ textDecoration: 'none', color: '#414449', fontSize: '15px', fontWeight: 500 }} className="hover:text-black">{link}</a>
            ))}
            


            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '12px 0 4px 0' }}>Legal</h3>
            {['Terms & Conditions', 'Cookie Policy', 'Privacy Policy'].map(link => (
              <a key={link} href="#" style={{ textDecoration: 'none', color: '#414449', fontSize: '15px', fontWeight: 500 }} className="hover:text-black">{link}</a>
            ))}
          </div>

          {/* Column 4: Available in */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px 0' }}>Available in:</h3>
            {['Bangalore', 'Gurgaon', 'Hyderabad', 'Delhi', 'Mumbai', 'Pune'].map(link => (
              <a key={link} href="#" style={{ textDecoration: 'none', color: '#414449', fontSize: '15px', fontWeight: 500 }} className="hover:text-black">{link}</a>
            ))}
            <div style={{ border: '1px solid #d4d5d9', borderRadius: '8px', padding: '10px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', cursor: 'pointer', background: '#fff' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#414449' }}>685 cities</span>
              <span style={{ fontSize: '12px', color: '#414449' }}>▼</span>
            </div>
          </div>

          {/* Column 5: Life & Socials */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px 0' }}>Life at TastyTrail</h3>
            {['Explore With TastyTrail', 'TastyTrail News', 'Snackables'].map(link => (
              <a key={link} href="#" style={{ textDecoration: 'none', color: '#414449', fontSize: '15px', fontWeight: 500 }} className="hover:text-black">{link}</a>
            ))}


          </div>

        </div>
      </footer>
    </div>
  );
}
