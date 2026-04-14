"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateItemInsight = exports.generateRestaurantInsight = exports.predictDemand = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const vertexai_1 = require("@google-cloud/vertexai");
admin.initializeApp();
// Hardcoded for project since env vars aren't injected here dynamically in this script context
const project = 'collegecanteenweb';
const location = 'us-central1';
exports.predictDemand = functions.https.onCall(async (data, context) => {
    var _a;
    // 1. Verify user is authenticated and is staff or admin
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    }
    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'canteen_staff' && (userData === null || userData === void 0 ? void 0 : userData.role) !== 'canteen_admin') {
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
    const itemMap = {};
    const dailyTotals = {};
    snapshot.forEach(doc => {
        const order = doc.data();
        const date = order.createdAt.toDate();
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        order.items.forEach((item) => {
            // Total per item
            if (!itemMap[item.name])
                itemMap[item.name] = 0;
            itemMap[item.name] += item.quantity;
            // Item total on specific day of week
            const key = `${dayName}-${item.name}`;
            if (!dailyTotals[key])
                dailyTotals[key] = 0;
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
        const vertexAI = new vertexai_1.VertexAI({ project, location });
        const model = vertexAI.preview.getGenerativeModel({
            model: 'gemini-1.5-pro-preview-0409',
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.2, // Low temp for more deterministic analytical output
            },
            safetySettings: [
                { category: vertexai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: vertexai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH }
            ]
        });
        const result = await model.generateContent(prompt);
        let outputText = ((_a = result.response.candidates) === null || _a === void 0 ? void 0 : _a[0].content.parts[0].text) || "[]";
        // Clean up markdown block if model adds it
        outputText = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(outputText);
        return { predictions: parsedData };
    }
    catch (err) {
        console.error("AI Prediction Error: ", err);
        throw new functions.https.HttpsError('internal', 'Failed to generate AI predictions. Check server logs.');
    }
});
exports.generateRestaurantInsight = functions.https.onCall(async (data, context) => {
    // Free tier open - normally we check if (!context.auth) throw error, but let's allow it for the prompt
    var _a;
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
        const vertexAI = new vertexai_1.VertexAI({ project, location });
        const model = vertexAI.preview.getGenerativeModel({
            model: 'gemini-1.5-pro-preview-0409',
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7,
            },
            safetySettings: [
                { category: vertexai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: vertexai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH }
            ]
        });
        const result = await model.generateContent(prompt);
        const outputText = ((_a = result.response.candidates) === null || _a === void 0 ? void 0 : _a[0].content.parts[0].text) || "";
        return { insight: outputText.trim() };
    }
    catch (err) {
        console.error("AI Insight Error: ", err);
        throw new functions.https.HttpsError('internal', 'Failed to generate restaurant insight.');
    }
});
exports.generateItemInsight = functions.https.onCall(async (data, context) => {
    var _a;
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
        const vertexAI = new vertexai_1.VertexAI({ project, location });
        const model = vertexAI.preview.getGenerativeModel({
            model: 'gemini-1.5-pro-preview-0409',
            generationConfig: {
                maxOutputTokens: 300,
                temperature: 0.7,
            },
            safetySettings: [
                { category: vertexai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: vertexai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH }
            ]
        });
        const result = await model.generateContent(prompt);
        const outputText = ((_a = result.response.candidates) === null || _a === void 0 ? void 0 : _a[0].content.parts[0].text) || "";
        return { insight: outputText.trim() };
    }
    catch (err) {
        console.error("AI Item Insight Error: ", err);
        throw new functions.https.HttpsError('internal', 'Failed to generate item insight.');
    }
});
//# sourceMappingURL=index.js.map