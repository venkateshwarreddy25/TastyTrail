const fs = require('fs');
let fileContent = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const cardsWrapperStart = `{/* ── 3 MASSIVE WHITE CARDS ── */}`;
const cardsWrapperEndMarker = `{/* ── RESTAURANT DETAIL MODAL ── */}`;

const startIndex = fileContent.indexOf(cardsWrapperStart);
const endIndex = fileContent.indexOf(cardsWrapperEndMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newCardsHtml = `      {/* ── 3 MASSIVE WHITE CARDS ── */}
      <div style={{ padding: '0px 80px 40px 80px', marginTop: '-100px', display: 'flex', flexDirection: 'row', gap: '24px', width: '100%', boxSizing: 'border-box', backgroundColor: 'transparent', maxWidth: '1200px', margin: '-50px auto 0 auto' }} className="flex-col md:flex-row relative z-30">
         <div onClick={() => { document.getElementById('discover-rest')?.scrollIntoView({ behavior: 'smooth' }) }} style={{ flex: 1, minHeight: '260px', borderRadius: '16px', background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.1)', padding: '28px 24px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }} className="hover:-translate-y-1 transition-transform duration-300">
            <div>
              <h2 style={{ color: '#000', fontSize: '24px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>FOOD DELIVERY</h2>
              <p style={{ color: 'gray', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '4px 0 0 0' }}>FROM RESTAURANTS</p>
              <p style={{ color: '#FF5200', fontSize: '14px', fontWeight: 'bold', margin: '12px 0 0 0' }}>UPTO 60% OFF</p>
            </div>
            <img src="https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/portal/m/seo-home/food_icon.png" alt="Breakfast" style={{ position: 'absolute', right: '-10px', bottom: '-10px', height: '180px', objectFit: 'contain' }} className="pointer-events-none group-hover:scale-[1.03] transition-transform duration-300" />
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FF5200', color: 'white', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, fontWeight: 'bold' }}>→</div>
         </div>

         <div onClick={() => navigate('/menu')} style={{ flex: 1, minHeight: '260px', borderRadius: '16px', background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.1)', padding: '28px 24px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }} className="hover:-translate-y-1 transition-transform duration-300">
            <div>
              <h2 style={{ color: '#000', fontSize: '24px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>INSTAMART</h2>
              <p style={{ color: 'gray', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '4px 0 0 0' }}>INSTANT GROCERY</p>
              <p style={{ color: '#FF5200', fontSize: '14px', fontWeight: 'bold', margin: '12px 0 0 0' }}>UPTO 60% OFF</p>
            </div>
            <img src="https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/portal/m/seo-home/instamart_icon.png" alt="Grocery" style={{ position: 'absolute', right: '-10px', bottom: '-10px', height: '180px', objectFit: 'contain' }} className="pointer-events-none group-hover:scale-[1.03] transition-transform duration-300" />
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FF5200', color: 'white', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, fontWeight: 'bold' }}>→</div>
         </div>

         <div onClick={() => { document.getElementById('discover-rest')?.scrollIntoView({ behavior: 'smooth' }) }} style={{ flex: 1, minHeight: '260px', borderRadius: '16px', background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.1)', padding: '28px 24px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }} className="hover:-translate-y-1 transition-transform duration-300">
            <div>
              <h2 style={{ color: '#000', fontSize: '24px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>DINEOUT</h2>
              <p style={{ color: 'gray', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '4px 0 0 0' }}>EAT OUT & SAVE MORE</p>
              <p style={{ color: '#FF5200', fontSize: '14px', fontWeight: 'bold', margin: '12px 0 0 0' }}>UPTO 50% OFF</p>
            </div>
            <img src="https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/portal/m/seo-home/dineout_icon.png" alt="Dineout" style={{ position: 'absolute', right: '-10px', bottom: '-10px', height: '180px', objectFit: 'contain' }} className="pointer-events-none group-hover:scale-[1.03] transition-transform duration-300" />
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FF5200', color: 'white', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, fontWeight: 'bold' }}>→</div>
         </div>
      </div>
      
      `;

  const textToReplace = fileContent.substring(startIndex, endIndex);
  fileContent = fileContent.replace(textToReplace, newCardsHtml);
  fs.writeFileSync('src/pages/Dashboard.tsx', fileContent, 'utf8');
  console.log("Successfully replaced cards and removed old content.");
} else {
  console.log("Could not find start or end index.");
  console.log("start:", startIndex, "end:", endIndex);
}
