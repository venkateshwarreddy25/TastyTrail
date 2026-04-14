import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { HeartIcon, TrashIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface FavItem {
  id: string;
  type: 'item' | 'restaurant';
  name: string;
  photoUrl?: string;
  price?: number;
  cuisine?: string;
  savedAt: any;
}

export default function Favourites() {
  const { user } = useAuth();
  const [favs, setFavs] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'favourites'));
    const unsub = onSnapshot(q, snap => {
      setFavs(snap.docs.map(d => ({ id: d.id, ...d.data() } as FavItem)));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleRemove = async (favId: string, name: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'favourites', favId));
    toast.success(`${name} removed from favourites`);
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-8">
        <HeartIcon className="w-7 h-7 text-red-500" />
        <h1 className="text-2xl font-bold font-display text-gray-900">My Favourites</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : favs.length === 0 ? (
        <div className="text-center py-24">
          <HeartIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700">No favourites yet</h3>
          <p className="text-gray-400 text-sm mt-1">Tap the ❤️ on any item to save it here</p>
          <Link to="/menu" className="mt-4 inline-block bg-[#fc8019] text-white px-6 py-2.5 rounded-xl font-bold">
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {favs.map(fav => (
            <div key={fav.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
              <div className="relative h-36 bg-gray-100">
                <img
                  src={fav.photoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'}
                  alt={fav.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}
                />
                <button
                  onClick={() => handleRemove(fav.id, fav.name)}
                  className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-white shadow transition-colors"
                >
                  <TrashIcon className="w-4 h-4 text-red-500" />
                </button>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{fav.name}</h3>
                {fav.price && <p className="text-[#fc8019] font-bold text-sm mt-0.5">₹{fav.price}</p>}
                {fav.cuisine && <p className="text-gray-400 text-xs mt-0.5 capitalize">{fav.cuisine}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
