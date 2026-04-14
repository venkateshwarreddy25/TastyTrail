import { useState } from 'react';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { SparklesIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { PredictionItem } from '../types';

export default function AIPrediction() {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [timestamp, setTimestamp] = useState<Date | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    const toastId = toast.loading('Gemini is analyzing 30 days of data...');
    try {
      const predictDemand = httpsCallable(functions, 'predictDemand');
      const result = await predictDemand();
      
      // Assume cloud function returns structured JSON
      const data = result.data as { predictions: PredictionItem[] };
      setPredictions(data.predictions);
      setTimestamp(new Date());
      
      toast.success('AI Prediction generated!', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error generating prediction', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-20 space-y-8 animate-fade-in">
      <header className="border-b border-swiggy-borderLight pb-6">
        <h1 className="text-3xl font-display font-black text-swiggy-dark flex items-center gap-3">
          AI Demand Forecast <SparklesIcon className="w-8 h-8 text-swiggy-orange" />
        </h1>
        <p className="text-swiggy-grayText mt-2 font-medium">Powered by Vertex AI Gemini 1.5 Pro</p>
      </header>

      <div className="bg-white border border-swiggy-borderLight rounded-3xl p-10 text-center shadow-sm relative overflow-hidden">
        {/* Decorative corner circles */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-orange-50 rounded-full blur-3xl -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-50 rounded-full blur-3xl -ml-10 -mb-10" />

        <div className="relative z-10">
          <div className="w-20 h-20 bg-white border border-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
             <SparklesIcon className="w-10 h-10 text-swiggy-orange" />
          </div>
          <h2 className="text-2xl font-display font-black text-swiggy-dark mb-4">Generate Tomorrow's Prep List</h2>
          <p className="text-swiggy-grayText max-w-xl mx-auto mb-10 leading-relaxed">
            The AI runs an analysis on the last 30 days of orders, factoring in day-of-week trends. It predicts exactly how many of each item you should prepare tomorrow morning to avoid overstocking or running out.
          </p>

          <button 
            onClick={handleGenerate} 
            disabled={loading}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-swiggy-orange hover:bg-[#e07011] text-white font-bold uppercase tracking-widest text-[14px] transition-all disabled:opacity-50 disabled:cursor-wait shadow-sm hover:shadow-swiggyHover"
          >
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Analysing Data...</>
            ) : (
              <><CalendarDaysIcon className="w-5 h-5"/> Run Prediction Matrix</>
            )}
          </button>
        </div>
      </div>

      {predictions.length > 0 && (
        <div className="bg-white border border-swiggy-borderLight rounded-3xl overflow-hidden shadow-sm animate-slide-up">
           <div className="p-6 border-b border-swiggy-borderLight bg-gray-50 flex justify-between items-center">
             <h3 className="font-bold text-lg text-swiggy-dark">Suggested Prep Quantity</h3>
             {timestamp && <span className="text-[11px] font-bold uppercase tracking-wider text-swiggy-grayText bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">Generated at: {timestamp.toLocaleTimeString()}</span>}
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="p-4 pl-6 text-[12px] font-bold uppercase tracking-wider text-swiggy-grayText">Item Name</th>
                    <th className="p-4 text-[12px] font-bold uppercase tracking-wider text-swiggy-grayText">Predicted Qty</th>
                    <th className="p-4 text-[12px] font-bold uppercase tracking-wider text-swiggy-grayText w-1/2">AI Reasoning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {predictions.map((p, idx) => (
                    <tr key={idx} className="hover:bg-orange-50/30 transition-colors">
                      <td className="p-4 pl-6 font-bold text-[15px] text-swiggy-dark">{p.itemName}</td>
                      <td className="p-4 text-swiggy-orange font-black text-xl">{p.predictedQty}</td>
                      <td className="p-4 text-swiggy-grayText text-[13px] leading-relaxed italic border-l border-dashed border-gray-100 bg-gray-50/50">"{p.reasoning}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
}
