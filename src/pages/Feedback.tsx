import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Feedback as FeedbackType, Order } from '../types';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';

export default function Feedback() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orderIdParam = params.get('orderId');
  const navigate = useNavigate();

  const [feedbacks, setFeedbacks] = useState<FeedbackType[]>([]);
  const [loading, setLoading] = useState(true);

  // Student specific submit state
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    // Admin/Staff view all feedback
    if (user?.role !== 'customer') {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const fetched: FeedbackType[] = [];
        snap.forEach(d => fetched.push({ id: d.id, ...d.data() } as FeedbackType));
        setFeedbacks(fetched);
        setLoading(false);
      });
      return () => unsub();
    } 
    // Student view
    else {
      if (orderIdParam) {
        // Fetch order logic to verify it belongs to user and is delivered
        const verifyOrder = async () => {
          const q = query(collection(db, 'orders'), where('studentId', '==', user.uid));
          const snap = await getDocs(q);
          const found = snap.docs.map(d => ({id: d.id, ...d.data()} as Order)).find(o => o.id === orderIdParam);
          if (found && found.status === 'Delivered') {
             // check if feedback already exists
             const fq = query(collection(db, 'feedback'), where('orderId', '==', found.id));
             const fsnap = await getDocs(fq);
             if (fsnap.empty) {
               setTargetOrder(found);
             } else {
               toast.error('Feedback already submitted for this order');
               navigate('/dashboard');
             }
          } else {
            navigate('/dashboard');
          }
          setLoading(false);
        };
        verifyOrder();
      } else {
        setLoading(false);
      }
    }
  }, [user, orderIdParam, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrder || rating === 0) return toast.error('Please select a star rating');
    
    try {
      await addDoc(collection(db, 'feedback'), {
        orderId: targetOrder.id,
        studentId: user?.uid,
        studentName: user?.name,
        rating,
        comment,
        createdAt: serverTimestamp()
      });
      toast.success('Thank you for your feedback! 🧡');
      navigate('/dashboard');
    } catch (err) {
       toast.error('Failed to submit feedback');
    }
  };

  if (loading) return <div className="skeleton h-32 w-full rounded-2xl bg-white shadow-sm max-w-4xl mx-auto mt-8" />;

  // Student Submit View
  if (user?.role === 'customer') {
    if (!targetOrder) return <div className="text-center py-20 text-swiggy-grayText mt-10">No pending feedback found. Go to Orders to rate a past delivery.</div>;
    
    return (
      <div className="max-w-xl mx-auto mt-10">
        <div className="bg-white border border-swiggy-borderLight rounded-3xl p-8 shadow-swiggy animate-slide-up text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-swiggy-orange" />
          
          <h2 className="text-3xl font-display font-black text-swiggy-dark mb-2 mt-4">Rate Your Meal</h2>
          <p className="text-sm text-swiggy-grayText font-bold uppercase tracking-wider mb-8">Order #{targetOrder.id.slice(-6).toUpperCase()}</p>
          
          <div className="bg-gray-50 border border-swiggy-borderLight p-5 rounded-2xl mb-8 text-left inline-block w-full max-w-md mx-auto">
            <h4 className="text-xs font-bold text-swiggy-grayText uppercase tracking-wider mb-3">Items Ordered</h4>
            <ul className="text-[15px] space-y-2">
              {targetOrder.items.map((i, idx) => (
                <li key={idx} className="flex justify-between">
                  <span className="font-medium text-swiggy-dark">{i.name}</span>
                  <span className="font-bold text-swiggy-grayText">x{i.quantity}</span>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-8">
            <div>
               <p className="text-[15px] font-bold text-swiggy-dark mb-4">How many stars would you give?</p>
               <div className="flex justify-center gap-3">
                 {[1,2,3,4,5].map(star => (
                    <button type="button" key={star} onClick={() => setRating(star)} className="focus:outline-none hover:scale-110 transition-transform bg-transparent">
                      {star <= rating ? <StarIcon className="w-12 h-12 text-yellow-400" /> : <StarOutline className="w-12 h-12 text-gray-300 hover:text-yellow-200" />}
                    </button>
                 ))}
               </div>
            </div>

            <div className="text-left">
              <label className="text-[13px] font-bold text-swiggy-dark uppercase tracking-wider mb-2 block">Any comments? (Optional)</label>
              <textarea 
                className="w-full bg-gray-50 border border-swiggy-borderLight rounded-xl p-4 text-[15px] text-swiggy-dark min-h-[120px] resize-none focus:outline-none focus:border-swiggy-orange transition-colors" 
                placeholder="Tell us what you liked or how we can improve..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
            </div>
            
            <button type="submit" className="w-full bg-swiggy-orange text-white font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[#e07011] transition-colors shadow-sm">
              Submit Feedback
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Staff/Admin List View
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-20">
      <header className="mb-8 border-b border-swiggy-borderLight pb-6">
        <h1 className="text-3xl font-display font-black text-swiggy-dark">Student Feedback</h1>
        <p className="text-swiggy-grayText mt-2 font-medium">Ratings and reviews from completed orders.</p>
      </header>

      {feedbacks.length === 0 ? (
        <div className="bg-white border border-swiggy-borderLight p-16 text-center text-swiggy-grayText rounded-2xl shadow-sm">
          <StarIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold">No feedback received yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedbacks.map(f => (
            <div key={f.id} className="bg-white border border-swiggy-borderLight rounded-2xl p-6 shadow-sm hover:shadow-swiggyHover transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-swiggy-dark text-lg">{f.studentName}</h3>
                  <span className="text-[12px] font-bold uppercase tracking-widest text-swiggy-grayText">
                    {f.createdAt?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex gap-1 bg-gray-50 border border-gray-100 px-2 py-1.5 rounded-lg">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className={`w-4 h-4 ${i < f.rating ? 'text-yellow-400' : 'text-gray-200'}`} />
                  ))}
                </div>
              </div>
              {f.comment && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl relative">
                  <span className="text-3xl text-orange-200 absolute top-1 left-2 select-none font-serif">"</span>
                  <p className="text-[14px] text-swiggy-dark italic relative z-10 pl-6 leading-relaxed">
                    {f.comment}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
