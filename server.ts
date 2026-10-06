import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Sample curated items for quick testing
const SAMPLE_ITEMS: Record<string, {
  name: string;
  category: string;
  colorPalette: string[];
  fabric: string;
  pattern: string;
  styleVibe: string;
  imageUrl: string;
  outfits: Array<{
    category: 'Casual' | 'Business' | 'Night Out';
    title: string;
    description: string;
    items: string[];
    stylingTip: string;
    imagePrompt: string;
  }>;
}> = {
  floral_skirt: {
    name: 'Vibrant Floral Silk Midi Skirt',
    category: 'Skirt',
    colorPalette: ['#E91E63', '#009688', '#FFC107', '#212121'],
    fabric: 'Silk charmeuse',
    pattern: 'Botanical floral print',
    styleVibe: 'Bohemian Chic & Artistic',
    imageUrl: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=800&q=80',
    outfits: [
      {
        category: 'Casual',
        title: 'Effortless Weekend Coffee Run',
        description: 'Pair the vibrant silk skirt with a relaxed neutral knit and minimalist sneakers for balanced daytime chic.',
        items: [
          'Oversized cream ribbed cotton crewneck sweater',
          'White leather minimalist tennis sneakers',
          'Tan leather cross-body bucket bag',
          'Delicate gold pendant necklace'
        ],
        stylingTip: 'Balancing the high-shine silk and bold floral pattern of the skirt with a relaxed, chunky knit sweater grounds the outfit for daytime. White sneakers keep it effortless while drawing from the subtle background tones in the print.',
        imagePrompt: 'Professional fashion flat-lay editorial photo on a clean neutral travertine background. Features a vibrant floral silk midi skirt paired with an oversized cream ribbed knit sweater, white leather minimalist sneakers, a tan leather cross-body bag, and gold pendant necklace. Arranged neatly from a top-down view with soft natural lighting, Vogue style.'
      },
      {
        category: 'Business',
        title: 'Polished Creative Office & Client Meeting',
        description: 'Elevate the skirt with a tailored black blazer and pointed pumps for a sophisticated corporate-creative aesthetic.',
        items: [
          'Structured black single-breasted blazer',
          'Black silk crewneck sleeveless shell top',
          'Black patent leather pointed-toe kitten heels',
          'Structured structured leather tote bag',
          'Minimalist silver hoop earrings'
        ],
        stylingTip: 'A structured black blazer instantly elevates the artistic skirt into a boardroom-ready statement piece. Keeping the supporting layers monochrome in rich black allows the skirt’s botanical palette to pop professionally without feeling chaotic.',
        imagePrompt: 'Professional fashion flat-lay editorial photo on a clean light gray studio background. Features a vibrant floral silk midi skirt paired with a structured black blazer, black sleeveless shell top, black patent leather kitten heels, structured leather tote, and silver hoop earrings. Top-down view, high fashion magazine style.'
      },
      {
        category: 'Night Out',
        title: 'Sartorial Gallery Opening & Dinner',
        description: 'Amp up the glamour with a sleek black silk camisole, statement metallic accessories, and strappy heels.',
        items: [
          'Black silk satin lace-trim camisole',
          'Gold metallic strappy stiletto heels',
          'Vintage velvet black clutch bag',
          'Statement layered gold choker necklace'
        ],
        stylingTip: 'The luxurious drape of the silk skirt shines brightest at night when paired with contrasting textures like velvet and gleaming gold accessories. A sleek camisole creates a streamlined silhouette that highlights the waist.',
        imagePrompt: 'Luxury editorial fashion flat-lay on a dark slate background with warm moody lighting. Features a vibrant floral silk midi skirt, black silk satin lace-trim camisole, gold metallic strappy stiletto heels, black velvet clutch, and layered gold choker. Top-down magazine spread aesthetic.'
      }
    ]
  },
  emerald_blazer: {
    name: 'Emerald Green Corduroy Tailored Blazer',
    category: 'Outerwear',
    colorPalette: ['#0A5C36', '#F5F5F5', '#3E2723', '#D4AF37'],
    fabric: 'Wide-wale cotton corduroy',
    pattern: 'Solid textured pile',
    styleVibe: 'Ivy League Heritage & Elevated Tailoring',
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80',
    outfits: [
      {
        category: 'Casual',
        title: 'Vintage Bookstore & Café Stroll',
        description: 'Layer the rich corduroy blazer over a striped Breton tee and vintage wash straight-leg denim.',
        items: [
          'Classic black and white striped cotton long-sleeve tee',
          'High-rise vintage wash straight-leg blue jeans',
          'Burgundy leather penny loafers',
          'Canvas tote bag'
        ],
        stylingTip: 'Corduroy naturally leans into heritage textures. Pairing it with classic French-girl stripes and denim creates a high-low balance that feels timeless and approachable for weekend outings.',
        imagePrompt: 'Fashion flat-lay editorial on a warm wooden tabletop. Features an emerald green corduroy tailored blazer, black and white striped cotton tee, high-rise vintage wash jeans, burgundy leather penny loafers, and canvas tote. Top-down view, cozy lighting.'
      },
      {
        category: 'Business',
        title: 'Executive Boardroom Power Look',
        description: 'Style the statement blazer with tailored charcoal grey trousers and crisp white poplin shirt.',
        items: [
          'Crisp oversized white poplin button-down shirt',
          'Charcoal grey pleated high-waisted wool trousers',
          'Black leather almond-toe ankle boots',
          'Structured black leather briefcase'
        ],
        stylingTip: 'Emerald green is a powerful alternative to traditional navy or black suiting. Pairing it with charcoal grey trousers and a crisp white shirt anchors the jewel tone with corporate refinement.',
        imagePrompt: 'Professional fashion flat-lay on a clean minimalist concrete floor. Features an emerald green corduroy blazer, crisp white poplin shirt, charcoal grey pleated wool trousers, black leather ankle boots, and leather briefcase. Top-down lighting.'
      },
      {
        category: 'Night Out',
        title: 'Cocktail Lounge & Evening Jazz Club',
        description: 'Wear the blazer over a black silk slip dress with vintage gold hardware and sultry booties.',
        items: [
          'Black silk midi slip dress',
          'Black suede pointed-toe boots',
          'Vintage chunky gold chain belt',
          'Embossed leather clutch'
        ],
        stylingTip: 'Juxtaposing heavy cotton corduroy with fluid silk slip material creates an irresistible tactile contrast. Belt the blazer over the slip dress to define your waist and create a modern hourglass silhouette.',
        imagePrompt: 'Editorial fashion flat-lay on dark moody charcoal surface. Features an emerald green corduroy blazer, black silk midi slip dress, black suede boots, vintage chunky gold chain belt, and leather clutch. Vogue magazine flat-lay style.'
      }
    ]
  }
};

// Weather Forecast Endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const city = (req.query.city as string) || 'New York';
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const geoData = await geoRes.json();
    
    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`);
    const weatherData = await weatherRes.json();

    const temp = weatherData.current?.temperature_2m ?? 20;
    const precipitation = weatherData.current?.precipitation ?? 0;
    const wind = weatherData.current?.wind_speed_10m ?? 0;
    const weatherCode = weatherData.current?.weather_code ?? 0;

    let condition = 'Clear & Sunny';
    let climateAdvice = 'Ideal weather for light layering and breathable fabrics.';
    if (weatherCode >= 50 && weatherCode < 70) {
      condition = 'Rainy / Drizzle';
      climateAdvice = 'Precipitation detected. Recommended to add a waterproof trench coat, umbrella, or weather-resistant footwear.';
    } else if (weatherCode >= 70) {
      condition = 'Snow / Cold';
      climateAdvice = 'Cold conditions detected. Layer with thermal innerwear, heavy wool coats, and closed boots.';
    } else if (temp < 10) {
      condition = 'Chilly';
      climateAdvice = 'Low temperatures. Add a cozy overcoat, scarf, or cashmere layering.';
    } else if (temp > 25) {
      condition = 'Warm & Sunny';
      climateAdvice = 'Warm weather. Opt for lightweight, breathable fabrics and UV protection accessories.';
    }

    res.json({
      location: `${name}, ${country || ''}`,
      temp,
      unit: '°C',
      condition,
      precipitation,
      wind,
      climateAdvice
    });

  } catch (err: any) {
    console.error('Weather error:', err);
    res.json({
      location: 'New York, USA',
      temp: 18,
      unit: '°C',
      condition: 'Partly Cloudy',
      precipitation: 0,
      wind: 12,
      climateAdvice: 'Pleasant conditions for standard layering.'
    });
  }
});

// Analyze Item Endpoint
app.post('/api/analyze-item', async (req, res) => {
  try {
    const { imageBase64, mimeType, sampleId, weatherContext } = req.body;

    if (sampleId && SAMPLE_ITEMS[sampleId]) {
      const sample = SAMPLE_ITEMS[sampleId];
      if (weatherContext) {
        const adaptedOutfits = sample.outfits.map(o => ({
          ...o,
          stylingTip: `${o.stylingTip} [Climate Note (${weatherContext.location}, ${weatherContext.temp}°C, ${weatherContext.condition}): ${weatherContext.climateAdvice}]`
        }));
        return res.json({ ...sample, outfits: adaptedOutfits });
      }
      return res.json(sample);
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64
      }
    };

    const prompt = `Analyze this fashion clothing item in detail. 
Return a JSON object conforming to this exact structure:
{
  "name": "Creative name for the item (e.g. 'Vintage Plaid Wool Blazer')",
  "category": "Clothing category (e.g. 'Jacket', 'Skirt', 'Trousers', 'Top', 'Dress', 'Boots')",
  "colorPalette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4"],
  "fabric": "Material description (e.g. 'Heavyweight tweed wool')",
  "pattern": "Pattern description (e.g. 'Glen plaid check')",
  "styleVibe": "Aesthetic vibe (e.g. 'Dark Academia & Heritage Chic')",
  "outfits": [
    {
      "category": "Casual",
      "title": "Catchy outfit title",
      "description": "Short description of the casual styling concept.",
      "items": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "stylingTip": "Detailed explanation of why these pieces complement the uploaded item (color harmony, silhouette balance, texture pairing).",
      "imagePrompt": "Detailed visual description of a professional fashion flat-lay editorial photo featuring the uploaded item and these matching pieces on a clean aesthetic background, Vogue magazine style."
    },
    {
      "category": "Business",
      "title": "Catchy outfit title",
      "description": "Short description of the business/smart casual concept.",
      "items": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "stylingTip": "Detailed explanation of why these pieces complement the uploaded item for professional settings.",
      "imagePrompt": "Detailed visual description of a professional fashion flat-lay editorial photo featuring the uploaded item and these matching business pieces on a clean minimalist studio background."
    },
    {
      "category": "Night Out",
      "title": "Catchy outfit title",
      "description": "Short description of the night out / evening glam concept.",
      "items": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "stylingTip": "Detailed explanation of why these pieces complement the uploaded item for evening glamour.",
      "imagePrompt": "Detailed visual description of a luxury editorial fashion flat-lay photo featuring the uploaded item and these evening pieces on a dark moody background with warm lighting."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          imagePart,
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            colorPalette: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            fabric: { type: Type.STRING },
            pattern: { type: Type.STRING },
            styleVibe: { type: Type.STRING },
            outfits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  stylingTip: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING }
                },
                required: ["category", "title", "description", "items", "stylingTip", "imagePrompt"]
              }
            }
          },
          required: ["name", "category", "colorPalette", "fabric", "pattern", "styleVibe", "outfits"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('No response from AI analysis');
    }

    const parsedData = JSON.parse(text.trim());
    // Attach the original uploaded image URL
    parsedData.imageUrl = `data:${mimeType || 'image/jpeg'};base64,${cleanBase64}`;
    res.json(parsedData);

  } catch (error: any) {
    console.error('Error analyzing item:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze item' });
  }
});

// Generate Outfit Flat-Lay Image Endpoint
app.post('/api/generate-outfit-image', async (req, res) => {
  try {
    const { prompt, itemImageBase64 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const parts: any[] = [];
    if (itemImageBase64) {
      const cleanBase64 = itemImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64
        }
      });
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: '4:3',
          imageSize: '1K'
        }
      }
    });

    let imageUrl = null;
    let caption = '';

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }
    }

    if (!imageUrl) {
      throw new Error('Failed to generate outfit flat-lay image');
    }

    res.json({ imageUrl, caption });

  } catch (error: any) {
    console.error('Error generating outfit image:', error);
    res.status(500).json({ error: error.message || 'Failed to generate outfit image' });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`AuraStylist server running on port ${port}`);
  });
}

startServer();
