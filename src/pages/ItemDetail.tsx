import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { httpsCallable } from 'firebase/functions';
import { MenuItem } from '../types';
import { StarIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { ArrowLeftIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';

export default function ItemDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, updateQuantity } = useCart();
  const { user } = useAuth();
  
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isFetchingInsight, setIsFetchingInsight] = useState(true);

  useEffect(() => {
    if (!itemId) return;
    const unsub = onSnapshot(doc(db, 'menuItems', itemId), (docSnap) => {
      if (docSnap.exists()) {
        setItem({ id: docSnap.id, ...docSnap.data() } as MenuItem);
      } else {
        setItem(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [itemId]);

  useEffect(() => {
    if (!item) return;

    const fetchInsight = async () => {
      try {
        const getInsight = httpsCallable(functions, 'generateItemInsight');
        const res = await getInsight({
          itemName: item.name,
          price: item.price,
          cuisine: item.category,
          description: item.description || ''
        });
        setAiInsight((res.data as any).insight);
      } catch (err) {
        console.error("Item Insight failed: ", err);
        const fallback = `1. ${item.name} is a delicious dish bursting with authentic flavours.
2. Made with fresh ingredients sourced daily for best taste.
3. A wholesome and satisfying meal packed with nutrition.
4. Perfect for anyone craving a hearty and flavorful experience.`;
        setAiInsight(fallback);
      } finally {
        setIsFetchingInsight(false);
      }
    };
    
    fetchInsight();
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#fc8019] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Item not found</h2>
        <button onClick={() => navigate('/menu')} className="bg-[#fc8019] text-white px-6 py-2 rounded-xl font-bold mt-4">Go back to menu</button>
      </div>
    );
  }

  const inCart = cart.find(c => c.itemId === item.id);
  const cartQty = inCart ? inCart.quantity : 0;
  const totalPrice = cartQty > 0 ? cartQty * item.price : item.price;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Top Image area */}
      <div className="relative w-full h-64 md:h-80 bg-gray-200">
        <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
        <button onClick={() => navigate('/menu')} className="absolute top-4 left-4 bg-white/70 hover:bg-white text-black w-10 h-10 rounded-full flex items-center justify-center shadow-lg backdrop-blur font-bold z-10 transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-t-3xl -mt-6 relative z-20 px-6 py-8 shadow-sm">
        
        {/* Bestseller Badge */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-[14px] h-[14px] border border-green-600 rounded-sm flex items-center justify-center p-[2px]">
             <div className="w-full h-full bg-green-600 rounded-full"></div>
          </div>
          <span className="text-[#e46d47] font-bold text-[12px] flex items-center gap-1 uppercase tracking-wider">
            <StarIcon className="w-3 h-3 text-[#e46d47]" /> Bestseller
          </span>
        </div>

        <h1 className="text-3xl font-bold font-display text-gray-900 leading-tight mb-2">{item.name}</h1>
        <div className="font-bold text-[22px] text-[#3e4152] mb-5">₹{item.price}</div>

        <div className="flex items-center gap-4 text-[13px] font-bold text-gray-700 mb-8 border-b border-gray-100 pb-5">
           <div className="flex items-center gap-1">
             <div className="w-[18px] h-[18px] rounded-full bg-green-600 text-white flex items-center justify-center">
               <StarIcon className="w-2.5 h-2.5" />
             </div>
             <span>4.6 (400+ Ratings)</span>
           </div>
           <span className="text-gray-300">|</span>
           <span>15-20 mins prep</span>
           <span className="text-gray-300">|</span>
           <span>450 kcal</span>
        </div>

        {/* ✨ AI Dish Insight Section ── */}
        <div className="bg-gradient-to-br from-orange-50/50 to-orange-100/50 rounded-2xl p-6 border border-orange-100/50 relative overflow-hidden mb-8 shadow-sm">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-200/40 rounded-full blur-2xl pointer-events-none"></div>
            <h3 className="font-bold text-orange-900 flex items-center gap-1.5 mb-4 text-lg">
               <SparklesIcon className="w-6 h-6 text-orange-500" /> ✨ About This Dish
            </h3>
            
            {isFetchingInsight ? (
               <div className="flex flex-col gap-3 relative z-10 pt-1">
                  <div className="h-4 bg-orange-200/50 rounded w-[90%] animate-pulse"></div>
                  <div className="h-4 bg-orange-200/50 rounded w-[80%] animate-pulse"></div>
                  <div className="h-4 bg-orange-200/50 rounded w-[95%] animate-pulse"></div>
                  <p className="text-sm font-bold text-orange-600 mt-2 animate-pulse flex items-center gap-2">
                     <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div> Getting dish details...
                  </p>
               </div>
            ) : (
               <div className="text-[15px] text-orange-900/80 leading-relaxed font-medium space-y-2 relative z-10 whitespace-pre-line">
                  {aiInsight}
               </div>
            )}
        </div>

        <div className="space-y-4">
            <h4 className="font-bold text-gray-900 text-lg mb-2">Details</h4>
            <div className="flex justify-between py-3 border-b border-gray-100 text-gray-600">
               <span>Ingredients</span>
               <span className="font-medium text-gray-900 text-right w-1/2">Fresh base, authentic spices, select herbs</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100 text-gray-600">
               <span>Spice Level</span>
               <span className="font-medium text-gray-900">Medium Spicy</span>
            </div>
        </div>

      </div>

      {/* Bottom Add Bar Overlay */}
      {user?.role === 'customer' && item.available && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 drop-shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50 rounded-t-2xl">
          <div className="max-w-3xl mx-auto flex justify-between items-center gap-4">
              <div className="flex flex-col flex-1 pl-2">
                  <span className="text-[18px] font-black text-gray-900">₹{totalPrice}</span>
                  {cartQty > 0 && <span className="text-[11px] font-bold text-[#fc8019] uppercase tracking-wider">Total Item Price</span>}
              </div>
              
              {!inCart ? (
                <button 
                  onClick={() => addToCart({ itemId: item.id, name: item.name, price: item.price, quantity: 1, photoUrl: item.photoUrl })}
                  className="bg-[#fc8019] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-colors uppercase text-[15px] w-2/3 max-w-[200px]"
                >
                  Add to Cart
                </button>
              ) : (
                <div className="flex items-center justify-between mx-auto md:mx-0 bg-green-50 border border-green-200 text-green-700 px-2 py-2 rounded-xl w-2/3 max-w-[160px]">
                  <button onClick={() => { if(cartQty === 1) removeFromCart(item.id); else updateQuantity(item.id, -1); }} className="w-10 h-10 hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
                      <MinusIcon className="w-5 h-5"/>
                  </button>
                  <span className="font-extrabold text-[16px] px-2">{cartQty}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-10 h-10 hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
                      <PlusIcon className="w-5 h-5"/>
                  </button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
