/**
 * CampusEats - Firebase Menu Seeder
 * Run: node seed.js
 * This seeds the Firestore database with 12 realistic canteen menu items.
 * Images use locally hosted photos or free Unsplash CDN (no API key needed).
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp, getDocs, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDGk-2HZKfYO_5CvLOjOa7r8suSERrI464",
  authDomain: "collegecanteenweb.firebaseapp.com",
  projectId: "collegecanteenweb",
  storageBucket: "collegecanteenweb.firebasestorage.app",
  messagingSenderId: "1061155014065",
  appId: "1:1061155014065:web:945731771b3f8e96afe990",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// NOTE: Images tagged [LOCAL] are served from /public/img/ (no API key needed)
// Images tagged [UNSPLASH] use publicly accessible Unsplash CDN (no API key needed)
const menuItems = [
  {
    name: 'Chicken Biryani',
    category: 'Biryani',
    price: 120,
    available: true,
    photoUrl: 'http://localhost:3000/img/food_biryani.png', // [LOCAL]
    description: 'Fragrant basmati rice cooked with tender chicken, aromatic spices, saffron and topped with fried onions & mint.',
  },
  {
    name: 'Veg Biryani',
    category: 'Biryani',
    price: 90,
    available: true,
    photoUrl: 'https://images.unsplash.com/photo-1563379091339-03246963d96e?w=600&h=400&fit=crop', // [UNSPLASH]
    description: 'Aromatic basmati rice with mixed seasonal vegetables, whole spices, and caramelized onions.',
  },
  {
    name: 'Masala Dosa',
    category: 'South Indian',
    price: 60,
    available: true,
    photoUrl: 'http://localhost:3000/img/food_dosa.png', // [LOCAL]
    description: 'Crispy golden crepe filled with spiced potato masala. Served with coconut chutney and hot sambar.',
  },
  {
    name: 'Idli Sambar (3 pcs)',
    category: 'South Indian',
    price: 40,
    available: true,
    photoUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&h=400&fit=crop', // [UNSPLASH]
    description: 'Soft steamed rice cakes served with hot lentil sambar and fresh coconut chutney.',
  },
  {
    name: 'Paneer Butter Masala',
    category: 'North Indian',
    price: 110,
    available: true,
    photoUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&h=400&fit=crop', // [UNSPLASH]
    description: 'Creamy tomato-butter gravy with soft cottage cheese cubes. Served with 2 rotis.',
  },
  {
    name: 'Dal Tadka + Roti',
    category: 'North Indian',
    price: 70,
    available: true,
    photoUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=400&fit=crop', // [UNSPLASH]
    description: 'Slow-cooked yellow lentils tempered with ghee, cumin, and dried red chilli. Served with 2 wheat rotis.',
  },
  {
    name: 'Hakka Noodles',
    category: 'Chinese',
    price: 80,
    available: true,
    photoUrl: 'http://localhost:3000/img/food_noodles.png', // [LOCAL]
    description: 'Stir-fried noodles with fresh vegetables, soy sauce, and chilli vinegar. Available Veg / Egg / Chicken.',
  },
  {
    name: 'Veg Manchurian',
    category: 'Chinese',
    price: 75,
    available: true,
    photoUrl: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&h=400&fit=crop', // [UNSPLASH]
    description: 'Crispy mixed vegetable balls in a tangy, spicy Manchurian sauce garnished with spring onions.',
  },
  {
    name: 'Aloo Tikki Burger',
    category: 'Biryani',
    price: 55,
    available: true,
    photoUrl: 'http://localhost:3000/img/food_burger.png', // [LOCAL]
    description: 'A toasted sesame bun with a crispy spiced potato patty, fresh lettuce, onion rings, and mint chutney.',
  },
  {
    name: 'Cold Coffee',
    category: 'Beverages',
    price: 50,
    available: true,
    photoUrl: 'http://localhost:3000/img/food_coffee.png', // [LOCAL]
    description: 'Chilled blended coffee with milk and sugar, topped with whipped cream and chocolate drizzle.',
  },
  {
    name: 'Fresh Lime Soda',
    category: 'Beverages',
    price: 30,
    available: true,
    photoUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=400&fit=crop', // [UNSPLASH]
    description: 'Freshly squeezed lime with chilled soda water. Choose from sweet, salty, or masala.',
  },
  {
    name: 'Gulab Jamun (2 pcs)',
    category: 'Desserts',
    price: 35,
    available: true,
    photoUrl: 'http://localhost:3000/img/food_gulab_jamun.png', // [LOCAL]
    description: 'Soft, spongy milk-solid dumplings soaked in warm rose-flavoured sugar syrup. Garnished with pistachios.',
  },
];

async function clearExistingItems() {
  console.log('🗑️  Clearing existing menu items...');
  const snap = await getDocs(collection(db, 'menuItems'));
  const deletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
  console.log(`   ✓ Removed ${snap.size} existing items.`);
}

async function seedMenu() {
  console.log('\n🌱 CampusEats - Firestore Menu Seeder');
  console.log('=====================================\n');

  await clearExistingItems();

  console.log('🍽️  Adding menu items...');
  for (const item of menuItems) {
    try {
      await addDoc(collection(db, 'menuItems'), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`   ✓ Added: ${item.name} (₹${item.price})`);
    } catch (err) {
      console.error(`   ✗ Failed: ${item.name}`, err.message);
    }
  }

  console.log(`\n✅ Done! Seeded ${menuItems.length} menu items successfully.`);
  console.log('   Open http://localhost:3000/menu to see them live!\n');
  process.exit(0);
}

seedMenu().catch(err => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});
