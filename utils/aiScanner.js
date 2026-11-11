// NVIDIA AI Vision Scanner for Handwritten Vegetable Bills & Slips
// Powered by NVIDIA NIM API (e.g. meta/llama-3.2-11b-vision-instruct)
// Free API keys available at https://build.nvidia.com

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VEGETABLES } from './constants';

const NVIDIA_API_KEY_STORAGE = 'NVIDIA_API_KEY';
const DEFAULT_NVIDIA_MODEL = 'meta/llama-3.2-11b-vision-instruct';
const NVIDIA_API_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

// Retrieve stored API key or null
export async function getNvidiaApiKey() {
  try {
    return await AsyncStorage.getItem(NVIDIA_API_KEY_STORAGE);
  } catch (e) {
    return null;
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

  const prompt = `You are an AI assistant for an Indian vegetable shop.
The user uploaded a photo of a handwritten receipt, daily tally notebook, or mandi purchase bill.
Read the handwritten text or printed lines carefully.

Identify each vegetable row and extract:
1. "vegetable": Standard English vegetable name (e.g. Tomato, Potato, Onion, Carrot, Spinach, Cauliflower, Brinjal, Cabbage, Green Chilli, Beans, Cucumber, Radish, Capsicum, Ginger).
2. "quantity_kg": Numeric quantity in kg. If written in grams (e.g. 500g), convert to kg (0.5).
3. "price_per_kg": Numeric price per kg in Indian Rupees (₹).
4. "type": If context indicates buying/mandi/purchase -> "stock". If customer selling -> "sale". If rotten/waste/kharab -> "wastage". If unclear, default to "${defaultType === 'auto' ? 'stock' : defaultType}".
5. "reason": If type is "wastage", reason like "Spoiled/Rotten", "Damaged in Transport", or "Unsold/Expired".

OUTPUT FORMAT: Return STRICTLY valid JSON ONLY. No markdown explanation, no preamble.
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

  try {
    const response = await fetch(NVIDIA_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_NVIDIA_MODEL,
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

// Helper to normalize vegetable name to list of standard names
function matchKnownVegetable(rawName) {
  if (!rawName) return 'Tomato';
  const clean = rawName.toLowerCase().trim();
  const found = VEGETABLES.find(
    (v) => v.name.toLowerCase() === clean || clean.includes(v.name.toLowerCase())
  );
  if (found) return found.name;

  // Capitalize first letter as fallback
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
