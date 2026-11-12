// NVIDIA AI Vision Scanner for Handwritten Vegetable Bills & Slips (Tamil & English)
// Powered by NVIDIA NIM API (meta/llama-3.2-90b-vision-instruct & meta/llama-3.2-11b-vision-instruct)
// Free API keys available at https://build.nvidia.com

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { VEGETABLES } from './constants';

const NVIDIA_API_KEY_STORAGE = 'NVIDIA_API_KEY';
const DEFAULT_FALLBACK_KEY = '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';
const DEFAULT_NVIDIA_MODEL = 'meta/llama-3.2-90b-vision-instruct';
const FALLBACK_NVIDIA_MODEL = 'meta/llama-3.2-11b-vision-instruct';
const NVIDIA_API_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const LOCAL_PROXY_ENDPOINT = 'http://localhost:5001/api/scan';

// Comprehensive Tamil (Script & Tanglish) to English Vegetable Dictionary
const TAMIL_VEGETABLE_MAP = {
  // Tamil script
  'தக்காளி': 'Tomato',
  'நாட்டு தக்காளி': 'Tomato',
  'ஆப்பிள் தக்காளி': 'Tomato',
  'வெங்காயம்': 'Onion',
  'பெரிய வெங்காயம்': 'Onion',
  'சின்ன வெங்காயம்': 'Onion',
  'சாம்பார் வெங்காயம்': 'Onion',
  'உருளைக்கிழங்கு': 'Potato',
  'உருளை': 'Potato',
  'கிழங்கு': 'Potato',
  'கேரட்': 'Carrot',
  'பீட்ரூட்': 'Beetroot',
  'கத்தரிக்காய்': 'Brinjal',
  'கத்திரி': 'Brinjal',
  'வெண்டைக்காய்': 'Okra (Lady Finger)',
  'வெண்டை': 'Okra (Lady Finger)',
  'முட்டைகோஸ்': 'Cabbage',
  'கோஸ்': 'Cabbage',
  'காலிஃபிளவர்': 'Cauliflower',
  'பச்சை மிளகாய்': 'Green Chilli',
  'மிளகாய்': 'Green Chilli',
  'பீன்ஸ்': 'Beans',
  'அவரைக்காய்': 'Beans',
  'அவரை': 'Beans',
  'வெள்ளரிக்காய்': 'Cucumber',
  'வெள்ளரி': 'Cucumber',
  'முள்ளங்கி': 'Radish',
  'பாகற்காய்': 'Bitter Gourd',
  'பாவக்காய்': 'Bitter Gourd',
  'சுரைக்காய்': 'Bottle Gourd',
  'சுரை': 'Bottle Gourd',
  'குடைமிளகாய்': 'Capsicum',
  'பட்டாணி': 'Peas',
  'பச்சை பட்டாணி': 'Peas',
  'கொத்தமல்லி': 'Coriander',
  'மல்லி': 'Coriander',
  'புதினா': 'Mint',
  'இஞ்சி': 'Ginger',
  'பூண்டு': 'Garlic',
  'கருவேப்பிலை': 'Spinach',
  'கீரை': 'Spinach',
  'முருங்கைக்காய்': 'Cucumber',
  'வாழைக்காய்': 'Cucumber',

  // Tanglish / Phonetic
  'thakkali': 'Tomato',
  'dhakkali': 'Tomato',
  'vengayam': 'Onion',
  'vengaiyam': 'Onion',
  'periya vengayam': 'Onion',
  'chinna vengayam': 'Onion',
  'urulaikilangu': 'Potato',
  'urulai': 'Potato',
  'kathirikkai': 'Brinjal',
  'kathiri': 'Brinjal',
  'vendakkai': 'Okra (Lady Finger)',
  'vendaikkai': 'Okra (Lady Finger)',
  'muttaikose': 'Cabbage',
  'kose': 'Cabbage',
  'cauliflower': 'Cauliflower',
  'pachai milagai': 'Green Chilli',
  'milagai': 'Green Chilli',
  'beans': 'Beans',
  'avaraikkai': 'Beans',
  'vellarikkai': 'Cucumber',
  'mullangi': 'Radish',
  'pavakkai': 'Bitter Gourd',
  'pagarkai': 'Bitter Gourd',
  'suraikkai': 'Bottle Gourd',
  'kudaimilagai': 'Capsicum',
  'pattani': 'Peas',
  'kothamalli': 'Coriander',
  'malli': 'Coriander',
  'pudina': 'Mint',
  'inji': 'Ginger',
  'poondu': 'Garlic',
  'keerai': 'Spinach',
};

// Retrieve stored API key or fallback
export async function getNvidiaApiKey() {
  try {
    const key = await AsyncStorage.getItem(NVIDIA_API_KEY_STORAGE);
    const envKey = process.env.EXPO_PUBLIC_NVIDIA_API_KEY;
    if (key && key.trim().length > 0) return key.trim();
    if (envKey && envKey.trim().length > 0) return envKey.trim();
    return DEFAULT_FALLBACK_KEY;
  } catch (e) {
    return process.env.EXPO_PUBLIC_NVIDIA_API_KEY || DEFAULT_FALLBACK_KEY;
  }
}

// Save API key
export async function setNvidiaApiKey(key) {
  try {
    if (!key) {
      await AsyncStorage.removeItem(NVIDIA_API_KEY_STORAGE);
    } else {
      await AsyncStorage.setItem(NVIDIA_API_KEY_STORAGE, key.trim());
    }
    return true;
  } catch (e) {
    console.error('Error saving NVIDIA API key:', e);
    return false;
  }
}

/**
 * Scan handwritten vegetable note / bill image with NVIDIA AI Vision
 * @param {string} base64Image - Base64 encoded JPEG/PNG image (without data: prefix)
 * @param {string} defaultType - 'stock' | 'sale' | 'wastage' | 'auto'
 */
export async function scanVegetableBillWithNvidiaAI(base64Image, defaultType = 'auto') {
  const apiKey = await getNvidiaApiKey();

  // 1. Try local proxy first (works in web browsers without CORS restrictions)
  try {
    const proxyRes = await fetch(LOCAL_PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, scanType: defaultType, apiKey }),
    });
    if (proxyRes.ok) {
      const pData = await proxyRes.json();
      if (pData.success && Array.isArray(pData.items)) {
        return {
          success: true,
          demoMode: false,
          items: pData.items,
        };
      }
    }
  } catch (proxyErr) {
    // Local proxy not running, fall back to direct cloud call
  }

  // If no API key configured, return realistic simulated extraction with warning
  if (!apiKey) {
    console.warn('No NVIDIA API key found. Using intelligent demo parsing.');
    return {
      success: true,
      demoMode: true,
      message: 'Running in Demo Mode (Add your free NVIDIA API key in Settings for live cloud AI).',
      items: [
        {
          id: 'demo_1',
          vegetable: 'Tomato',
          quantity_kg: 15,
          price_per_kg: 35,
          type: defaultType === 'auto' ? 'stock' : defaultType,
          reason: defaultType === 'wastage' ? 'Spoiled/Rotten' : '',
          total: 525,
        },
        {
          id: 'demo_2',
          vegetable: 'Onion',
          quantity_kg: 25,
          price_per_kg: 28,
          type: defaultType === 'auto' ? 'stock' : defaultType,
          reason: defaultType === 'wastage' ? 'Damaged in Transport' : '',
          total: 700,
        },
        {
          id: 'demo_3',
          vegetable: 'Potato',
          quantity_kg: 30,
          price_per_kg: 22,
          type: defaultType === 'auto' ? 'stock' : defaultType,
          reason: '',
          total: 660,
        },
        {
          id: 'demo_4',
          vegetable: 'Carrot',
          quantity_kg: 8,
          price_per_kg: 45,
          type: defaultType === 'auto' ? 'stock' : defaultType,
          reason: '',
          total: 360,
        },
      ],
    };
  }

  const prompt = `You are an expert AI vision assistant specialized in reading Indian vegetable shop bills, mandi purchase slips, and daily notebook notes.
The image may contain handwritten or printed notes in TAMIL script (e.g. தக்காளி, வெங்காயம், உருளைக்கிழங்கு, கத்தரிக்காய், வெண்டைக்காய், முட்டைகோஸ், கொத்தமல்லி, இஞ்சி, பச்சை மிளகாய், கேரட், பீன்ஸ், etc.) or Romanized Tamil (Thakkali, Vengayam, etc.) or English.

Your task:
1. Translate all Tamil vegetable names to standard English vegetable names (e.g., தக்காளி -> Tomato, வெங்காயம் -> Onion, உருளைக்கிழங்கு -> Potato, கத்தரிக்காய் -> Brinjal, வெண்டைக்காய் -> Okra (Lady Finger), முட்டைகோஸ் -> Cabbage, பச்சை மிளகாய் -> Green Chilli, இஞ்சி -> Ginger, பூண்டு -> Garlic, கொத்தமல்லி -> Coriander, புதினா -> Mint, கேரட் -> Carrot, பீன்ஸ் -> Beans, வெள்ளரிக்காய் -> Cucumber, முள்ளங்கி -> Radish, சுரைக்காய் -> Bottle Gourd, பாகற்காய் -> Bitter Gourd, குடைமிளகாய் -> Capsicum, பட்டாணி -> Peas).
2. Extract "quantity_kg": Numeric quantity in kg. If written in grams (e.g. 500g, 250g, 500 கிராம்), convert to kg (0.5, 0.25).
3. Extract "price_per_kg": Numeric price per kg in Indian Rupees (₹ or ரூ / ரூபாய்). If only the total price is written, calculate price_per_kg = total / quantity_kg.
4. "type": If context indicates buying/mandi/purchase/வரவு -> "stock". If selling/customer bill -> "sale". If rotten/waste/kharab/அழுகல்/சேதம் -> "wastage". If unclear, default to "${defaultType === 'auto' ? 'stock' : defaultType}".
5. "reason": If type is "wastage", give a reason like "Spoiled/Rotten", "Damaged in Transport", or "Unsold/Expired".

OUTPUT FORMAT: Return STRICTLY valid JSON ONLY. No markdown explanations, no notes.
Format:
[
  {
    "vegetable": "Tomato",
    "quantity_kg": 10.5,
    "price_per_kg": 30,
    "type": "stock",
    "reason": ""
  }
]`;

  async function callNvidiaAPI(modelName) {
    return await fetch(NVIDIA_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });
  }

  try {
    let response = await callNvidiaAPI(DEFAULT_NVIDIA_MODEL);

    if (!response.ok) {
      console.warn(`Primary model ${DEFAULT_NVIDIA_MODEL} returned ${response.status}. Retrying with ${FALLBACK_NVIDIA_MODEL}...`);
      response = await callNvidiaAPI(FALLBACK_NVIDIA_MODEL);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIDIA API error (${response.status}): ${errText}`);
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content || '[]';

    // Extract JSON block from potential markdown fences
    let cleaned = rawContent.trim();
    if (cleaned.includes('```json')) {
      cleaned = cleaned.split('```json')[1].split('```')[0].trim();
    } else if (cleaned.includes('```')) {
      cleaned = cleaned.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(cleaned);
    const validatedItems = (Array.isArray(parsed) ? parsed : []).map((item, idx) => {
      const qty = parseFloat(item.quantity_kg) || 0;
      const price = parseFloat(item.price_per_kg) || 0;
      return {
        id: `ai_${Date.now()}_${idx}`,
        vegetable: matchKnownVegetable(item.vegetable),
        quantity_kg: qty,
        price_per_kg: price,
        type: item.type || defaultType || 'stock',
        reason: item.reason || '',
        total: Math.round(qty * price * 100) / 100,
      };
    });

    return {
      success: true,
      demoMode: false,
      items: validatedItems,
    };
  } catch (error) {
    console.error('NVIDIA AI extraction failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze image with NVIDIA AI',
    };
  }
}

// Helper to normalize vegetable name to list of standard names (supports Tamil & English)
function matchKnownVegetable(rawName) {
  if (!rawName) return 'Tomato';
  const clean = rawName.toLowerCase().trim();

  // 1. Direct Tamil / Tanglish dictionary check
  if (TAMIL_VEGETABLE_MAP[clean]) {
    return TAMIL_VEGETABLE_MAP[clean];
  }
  for (const [tamilKey, engVal] of Object.entries(TAMIL_VEGETABLE_MAP)) {
    if (clean === tamilKey.toLowerCase() || clean.includes(tamilKey.toLowerCase())) {
      return engVal;
    }
  }

  // 2. Standard vegetable list check
  const found = VEGETABLES.find(
    (v) => v.name.toLowerCase() === clean || clean.includes(v.name.toLowerCase())
  );
  if (found) return found.name;

  // 3. Capitalize first letter as fallback
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
