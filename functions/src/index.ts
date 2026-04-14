import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Hardcoded for project since env vars aren't injected here dynamically in this script context
const project = 'collegecanteenweb';
const location = 'us-central1';

export const predictDemand = functions.https.onCall(async (data, context) => {
  // 1. Verify user is authenticated and is staff or admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }
  
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  if (userData?.role !== 'canteen_staff' && userData?.role !== 'canteen_admin') {
     throw new functions.https.HttpsError('permission-denied', 'Only staff can run predictions.');
  }

  // 2. Fetch last 30 days of orders
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const db = admin.firestore();
  const snapshot = await db.collection('orders')
    .where('createdAt', '>=', thirtyDaysAgo)
    .where('status', '!=', 'Cancelled')
    .get();

  // 3. Aggregate item quantities per day and by item name
  const itemMap: Record<string, number> = {};
  const dailyTotals: Record<string, number> = {};

  snapshot.forEach(doc => {
    const order = doc.data();
    const date = order.createdAt.toDate();
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    order.items.forEach((item: any) => {
      // Total per item
      if (!itemMap[item.name]) itemMap[item.name] = 0;
      itemMap[item.name] += item.quantity;

      // Item total on specific day of week
      const key = `${dayName}-${item.name}`;
      if (!dailyTotals[key]) dailyTotals[key] = 0;
      dailyTotals[key] += item.quantity;
    });
  });

  // Convert to prompt string
  let promptData = "Past 30 days summary:\n";
  Object.keys(itemMap).forEach(itemName => {
    promptData += `- ${itemName}: Total ${itemMap[itemName]} ordered.\n`;
  });
  
  promptData += "\nDay of week breakdown:\n";
  Object.keys(dailyTotals).forEach(key => {
     promptData += `- ${key}: ${dailyTotals[key]}\n`;
  });

  const prompt = `
You are an AI assistant managing a college canteen inventory. 
Analyze the past 30 days of food order data provided below. 
Your goal is to predict EXACTLY how many units of EACH item the canteen staff should prepare tomorrow morning to avoid overstocking and prevent running out.
Tomorrow's day of week is: ${new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'long' })}.

Data:
${promptData}

Return ONLY a valid JSON array of objects, with no markdown formatting or extra text. Each object should have:
1. "itemName" (string): the exact name of the item.
2. "predictedQty" (number): your predicted demand for tomorrow.
3. "reasoning" (string): one short sentence explaining why you chose this number based on the data.
  `;

  // 4. Call Vertex AI
  try {
    const vertexAI = new VertexAI({ project, location });
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-1.5-pro-preview-0409',
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.2, // Low temp for more deterministic analytical output
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
      ]
    });

    const result = await model.generateContent(prompt);
    let outputText = result.response.candidates?.[0].content.parts[0].text || "[]";
    
    // Clean up markdown block if model adds it
    outputText = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(outputText);
    
    return { predictions: parsedData };
  } catch (err: any) {
    console.error("AI Prediction Error: ", err);
    throw new functions.https.HttpsError('internal', 'Failed to generate AI predictions. Check server logs.');
  }
});

export const generateRestaurantInsight = functions.https.onCall(async (data, context) => {
  // Free tier open - normally we check if (!context.auth) throw error, but let's allow it for the prompt
  
  const { name, cuisine, address, openingHours, location: userLoc } = data;
  if (!name || !userLoc) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: name and location.');
  }

  const prompt = `
You are a helpful food guide for Hyderabad.
A user in ${userLoc} is looking at a restaurant called ${name}.
Cuisine: ${cuisine || 'Unknown'}. Address: ${address || 'Unknown'}. Hours: ${openingHours || 'Unknown'}.
In 3-4 friendly sentences tell them:
1. What food and experience to expect at this restaurant
2. Best dishes to try based on the cuisine type
3. Best time to visit and one practical tip
Keep the tone like a friendly local recommendation.
`;

  try {
    const vertexAI = new VertexAI({ project, location });
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-1.5-pro-preview-0409',
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7, 
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
      ]
    });

    const result = await model.generateContent(prompt);
    const outputText = result.response.candidates?.[0].content.parts[0].text || "";
    
    return { insight: outputText.trim() };
  } catch (err: any) {
    console.error("AI Insight Error: ", err);
    throw new functions.https.HttpsError('internal', 'Failed to generate restaurant insight.');
  }
});

export const generateItemInsight = functions.https.onCall(async (data, context) => {
  const { itemName, price, cuisine, description } = data;
  if (!itemName) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required field: itemName.');
  }

  const prompt = `
You are a food expert for a restaurant ordering app.
The user is viewing a dish called ${itemName} priced at ₹${price}.
Cuisine type: ${cuisine || 'General'}.
In exactly 4 short lines tell them:
1. What this dish tastes like and key flavours
2. Main ingredients used in this dish
3. Health benefits or nutrition highlights
4. Who should order this and best time to eat it
Keep tone friendly, appetizing, and helpful.
`;

  try {
    const vertexAI = new VertexAI({ project, location });
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7, 
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
      ]
    });

    const result = await model.generateContent(prompt);
    const outputText = result.response.candidates?.[0].content.parts[0].text || "";
    
    return { insight: outputText.trim() };
  } catch (err: any) {
    console.error("AI Item Insight Error: ", err);
    // FALLBACK TEXT if Gemini fails
    const fallback = \`1. \${itemName} is a delicious dish bursting with authentic flavours.
2. Made with fresh ingredients sourced daily for best taste.
3. A wholesome and satisfying meal packed with nutrition.
4. Perfect for anyone craving a hearty and flavorful experience.\`;
    return { insight: fallback };
  }
});

// ─── analyseUserLocation ───────────────────────────────────────────────────
export const analyseUserLocation = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }
    res.set('Access-Control-Allow-Origin', '*');
    try {
      const { lat, lng, suburb, city, accuracy, currentTime } = req.body.data || req.body || {};
      if (!lat || !lng) {
        res.json({ data: { error: 'lat/lng required' } });
        return;
      }

      const prompt = `A user is located at coordinates ${lat}, ${lng} in ${suburb || 'unknown area'}, ${city || 'Hyderabad'}.
GPS accuracy is ${accuracy || 'unknown'} meters.
Current local time is ${currentTime || new Date().toLocaleTimeString()}.
Based on this location:
1. Give a friendly short area description in one sentence (example: 'You are in the heart of LB Nagar, a busy commercial hub')
2. Suggest what type of food is most popular in this area
3. Best meal time suggestion based on current time
Keep response STRICTLY as JSON with keys: areaDescription, popularFood, mealSuggestion`;

      const vertexAI = new VertexAI({ project, location });
      const model = vertexAI.preview.getGenerativeModel({ model: 'gemini-1.5-pro', generationConfig: { maxOutputTokens: 400, temperature: 0.7 } });
      const result = await model.generateContent(prompt);
      const raw = result.response.candidates?.[0].content.parts[0].text || '{}';
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      res.json({ data: { success: true, ...parsed } });
    } catch (err) {
      console.error('analyseUserLocation error:', err);
      const suburb = req.body?.data?.suburb;
      const city = req.body?.data?.city;
      res.json({
        data: {
          success: false,
          areaDescription: `You are near ${suburb || city || 'your area'}, ready to explore great food!`,
          popularFood: 'Biryani, Dosas and local street food',
          mealSuggestion: 'Now is a great time for a warm, satisfying meal!'
        }
      });
    }
  });
});

// ─── getDailySpecials ─────────────────────────────────────────────────────
export const getDailySpecials = functions.https.onCall(async (data, _context) => {
  const { areaDescription, popularFood, timeOfDay, location: userLocation } = data;

  const prompt = `Based on ${timeOfDay || 'this time of day'} in ${areaDescription || userLocation || 'Hyderabad'},
where ${popularFood || 'biryani'} is popular,
suggest 3 food items a person would most enjoy right now.
For each give: name, reason why it suits this moment, emoji.
Return STRICTLY as JSON array with objects having keys: name, reason, emoji`;

  try {
    const vertexAI = new VertexAI({ project, location });
    const model = vertexAI.preview.getGenerativeModel({ model: 'gemini-1.5-pro', generationConfig: { maxOutputTokens: 400, temperature: 0.8 } });
    const result = await model.generateContent(prompt);
    const raw = result.response.candidates?.[0].content.parts[0].text || '[]';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { specials: parsed };
  } catch (err) {
    console.error('getDailySpecials error:', err);
    return {
      specials: [
        { name: 'Chicken Biryani', reason: 'The classic comfort meal perfect for any time of day', emoji: '🍛' },
        { name: 'Masala Dosa', reason: 'Crispy, light and packed with flavour — ideal right now', emoji: '🫓' },
        { name: 'Chilled Lassi', reason: 'Cool down and refresh with this creamy favourite', emoji: '🥛' }
      ]
    };
  }
});
