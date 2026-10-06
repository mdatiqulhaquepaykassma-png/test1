import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Upload, Camera, Shirt, Briefcase, Moon, Sun, 
  CheckCircle, ArrowRight, RefreshCw, Bookmark, BookmarkCheck, 
  Layers, Palette, Info, ChevronRight, Wand2, Star, Eye, Share2, Trash2, CloudRain, CloudSun, Thermometer, MapPin, Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OutfitOption {
  category: 'Casual' | 'Business' | 'Night Out';
  title: string;
  description: string;
  items: string[];
  stylingTip: string;
  imagePrompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
}

interface ItemAnalysis {
  name: string;
  category: string;
  colorPalette: string[];
  fabric: string;
  pattern: string;
  styleVibe: string;
  imageUrl: string;
  outfits: OutfitOption[];
}

interface WeatherInfo {
  location: string;
  temp: number;
  unit: string;
  condition: string;
  precipitation: number;
  wind: number;
  climateAdvice: string;
}

export default function App() {
  const [selectedSample, setSelectedSample] = useState<string | null>('floral_skirt');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customMimeType, setCustomMimeType] = useState<string>('image/jpeg');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<ItemAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'outfits' | 'lookbook'>('outfits');
  const [lookbook, setLookbook] = useState<Array<{ id: string; item: ItemAnalysis; outfit: OutfitOption; savedAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  // Weather state
  const [cityInput, setCityInput] = useState<string>('Paris');
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);

  // Fetch weather on mount or city change
  useEffect(() => {
    fetchWeather('Paris');
  }, []);

  const fetchWeather = async (cityName: string) => {
    setLoadingWeather(true);
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(cityName)}`);
      const data = await res.json();
      if (res.ok) {
        setWeather(data);
      }
    } catch (err) {
      console.error('Failed to fetch weather:', err);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleCitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;
    fetchWeather(cityInput);
    // Re-analyze current item if loaded
    if (selectedSample) {
      handleAnalyzeSample(selectedSample, cityInput);
    } else if (analysisData && customImage) {
      reanalyzeCustomImage(customImage, customMimeType, cityInput);
    }
  };

  const handleAnalyzeSample = async (sampleId: string, targetCity?: string) => {
    setSelectedSample(sampleId);
    setCustomImage(null);
    setLoading(true);
    setError(null);
    setLoadingStep('Analyzing item & checking local weather climate...');

    const currentCityWeather = targetCity ? await fetchWeatherDirect(targetCity) : weather;

    try {
      const res = await fetch('/api/analyze-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleId, weatherContext: currentCityWeather })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze item');

      setAnalysisData(data);
      setLoadingStep('Generating climate-adapted editorial flat-lays...');
      generateAllOutfitImages(data.outfits, data.imageUrl);

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  const fetchWeatherDirect = async (cityName: string): Promise<WeatherInfo | null> => {
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(cityName)}`);
      const data = await res.json();
      if (res.ok) {
        setWeather(data);
        return data;
      }
    } catch (err) {
      console.error(err);
    }
    return weather;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    setLoadingStep('Processing uploaded clothing photo...');
    reader.onload = async () => {
      const base64 = reader.result as string;
      setCustomImage(base64);
      setCustomMimeType(file.type);
      setSelectedSample(null);
      setLoading(true);
      setError(null);

      reanalyzeCustomImage(base64, file.type, cityInput);
    };
    reader.readAsDataURL(file);
  };

  const reanalyzeCustomImage = async (base64: string, mimeType: string, cityName: string) => {
    setLoading(true);
    const currentCityWeather = await fetchWeatherDirect(cityName);

    try {
      const res = await fetch('/api/analyze-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: base64, 
          mimeType,
          weatherContext: currentCityWeather
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze item');

      setAnalysisData(data);
      setLoading(false);
      generateAllOutfitImages(data.outfits, data.imageUrl);

    } catch (err: any) {
      setError(err.message || 'Failed to analyze photo');
      setLoading(false);
    }
  };

  const generateAllOutfitImages = async (outfits: OutfitOption[], itemImageUrl: string) => {
    setLoading(false);
    const updatedOutfits = [...outfits];
    
    for (let i = 0; i < updatedOutfits.length; i++) {
      updatedOutfits[i] = { ...updatedOutfits[i], isGeneratingImage: true };
      setAnalysisData(prev => prev ? { ...prev, outfits: [...updatedOutfits] } : null);

      try {
        const res = await fetch('/api/generate-outfit-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: updatedOutfits[i].imagePrompt,
            itemImageBase64: itemImageUrl 
          })
        });
        const data = await res.json();
        if (res.ok && data.imageUrl) {
          updatedOutfits[i] = { ...updatedOutfits[i], imageUrl: data.imageUrl, isGeneratingImage: false };
        } else {
          updatedOutfits[i] = { ...updatedOutfits[i], isGeneratingImage: false };
        }
      } catch (err) {
        console.error('Failed to generate image for outfit:', err);
        updatedOutfits[i] = { ...updatedOutfits[i], isGeneratingImage: false };
      }

      setAnalysisData(prev => prev ? { ...prev, outfits: [...updatedOutfits] } : null);
    }
  };

  const regenerateOutfitImage = async (index: number) => {
    if (!analysisData) return;
    const updatedOutfits = [...analysisData.outfits];
    updatedOutfits[index].isGeneratingImage = true;
    setAnalysisData({ ...analysisData, outfits: updatedOutfits });

    try {
      const res = await fetch('/api/generate-outfit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: updatedOutfits[index].imagePrompt,
          itemImageBase64: analysisData.imageUrl 
        })
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        updatedOutfits[index].imageUrl = data.imageUrl;
      }
    } catch (err) {
      console.error('Regenerate error:', err);
    } finally {
      updatedOutfits[index].isGeneratingImage = false;
      setAnalysisData({ ...analysisData, outfits: updatedOutfits });
    }
  };

  const toggleSaveLook = (outfit: OutfitOption) => {
    if (!analysisData) return;
    const exists = lookbook.some(l => l.outfit.title === outfit.title);
    if (exists) {
      setLookbook(lookbook.filter(l => l.outfit.title !== outfit.title));
    } else {
      setLookbook([...lookbook, {
        id: Math.random().toString(),
        item: analysisData,
        outfit,
        savedAt: new Date().toLocaleDateString()
      }]);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Casual': return <Sun className="w-5 h-5 text-amber-500" />;
      case 'Business': return <Briefcase className="w-5 h-5 text-indigo-500" />;
      case 'Night Out': return <Moon className="w-5 h-5 text-purple-500" />;
      default: return <Sparkles className="w-5 h-5 text-pink-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] font-sans antialiased selection:bg-stone-200">
      {/* Luxury Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FDFBF7]/90 border-b border-stone-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-900 text-[#FDFBF7] flex items-center justify-center font-serif text-xl shadow-sm">
            A
          </div>
          <div>
            <h1 className="font-serif text-xl font-medium tracking-wide">AuraStylist</h1>
            <p className="text-xs text-stone-500 tracking-wider uppercase font-mono">AI Virtual Wardrobe & Stylist</p>
          </div>
        </div>

        {/* Weather Bar in Header */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-stone-200 shadow-2xs">
          <MapPin className="w-4 h-4 text-amber-600" />
          <form onSubmit={handleCitySubmit} className="flex items-center gap-2">
            <input 
              type="text" 
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="City..." 
              className="text-xs font-medium text-stone-800 bg-transparent focus:outline-none w-24 sm:w-32"
            />
          </form>
          {weather && (
            <div className="flex items-center gap-2 text-xs font-medium text-stone-700 border-l border-stone-200 pl-3">
              <Thermometer className="w-3.5 h-3.5 text-rose-500" />
              <span>{Math.round(weather.temp)}{weather.unit}</span>
              <span className="text-stone-400">•</span>
              <span className="text-stone-600 truncate max-w-[100px]">{weather.condition}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('outfits')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'outfits' 
                ? 'bg-stone-900 text-[#FDFBF7] shadow-sm' 
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Style Generator
          </button>
          <button 
            onClick={() => setActiveTab('lookbook')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'lookbook' 
                ? 'bg-stone-900 text-[#FDFBF7] shadow-sm' 
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Lookbook ({lookbook.length})
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {activeTab === 'lookbook' ? (
          <div>
            <div className="mb-8">
              <h2 className="font-serif text-3xl font-medium mb-2">Saved Looks & Capsule Wardrobe</h2>
              <p className="text-stone-600">Your curated collection of AI-styled outfits ready for any occasion.</p>
            </div>

            {lookbook.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 p-8 shadow-xs">
                <Bookmark className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h3 className="font-serif text-xl font-medium text-stone-800 mb-2">Your lookbook is empty</h3>
                <p className="text-stone-500 max-w-md mx-auto mb-6">Explore the style generator and save your favorite outfit flat-lays to build your personal digital wardrobe.</p>
                <button 
                  onClick={() => setActiveTab('outfits')}
                  className="px-6 py-3 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 transition-all shadow-sm"
                >
                  Start Styling
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {lookbook.map((entry) => (
                  <motion.div 
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                      {entry.outfit.imageUrl ? (
                        <img 
                          src={entry.outfit.imageUrl} 
                          alt={entry.outfit.title} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">
                          <Sparkles className="w-8 h-8 animate-pulse" />
                        </div>
                      )}
                      <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-stone-800 shadow-xs">
                        {entry.outfit.category}
                      </span>
                      <button 
                        onClick={() => toggleSaveLook(entry.outfit)}
                        className="absolute top-3 right-3 w-9 h-9 bg-white/95 backdrop-blur-xs rounded-full flex items-center justify-center text-stone-900 hover:bg-white shadow-xs"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </button>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                          <span>Featuring: {entry.item.name}</span>
                        </div>
                        <h4 className="font-serif text-lg font-medium text-stone-900 mb-2">{entry.outfit.title}</h4>
                        <p className="text-sm text-stone-600 mb-4 line-clamp-2">{entry.outfit.description}</p>
                      </div>

                      {/* Styling Tip */}
                      <div className="mt-auto bg-[#FAF8F5] border-l-2 border-stone-900 p-3 rounded-r-lg">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900 uppercase tracking-wider mb-1">
                          <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                          Stylist Note
                        </div>
                        <p className="text-xs text-stone-700 italic">{entry.outfit.stylingTip}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Climate Adaptation Banner */}
            {weather && (
              <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 sm:p-8 mb-10 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400">
                    <CloudSun className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-amber-400 block mb-1">
                      Live Weather & Climate Adaptation ({weather.location})
                    </span>
                    <h3 className="font-serif text-xl font-medium">
                      {Math.round(weather.temp)}{weather.unit} • {weather.condition}
                    </h3>
                  </div>
                </div>

                <div className="bg-white/10 px-5 py-3 rounded-2xl border border-white/10 max-w-lg text-xs sm:text-sm text-stone-200">
                  <div className="font-semibold text-white mb-0.5 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                    Climate-Appropriate Styling Advice:
                  </div>
                  <p className="italic text-stone-300">{weather.climateAdvice}</p>
                </div>
              </div>
            )}

            {/* Hero Banner / Intro */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-medium uppercase tracking-widest mb-4 border border-stone-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                AI Wardrobe & Climate Stylist
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight text-stone-900 mb-4">
                "I don't know what to wear with this."
              </h2>
              <p className="text-stone-600 text-base sm:text-lg">
                Upload any difficult-to-match item or select a sample below. Our AI analyzes its color palette, pattern, silhouette, and current weather forecast to generate 3 climate-adapted outfit options with editorial flat-lays.
              </p>
            </div>

            {/* Input Section: Samples vs Upload */}
            <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-xs mb-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-stone-100">
                <div>
                  <h3 className="font-serif text-xl font-medium text-stone-900">1. Choose or Upload Your Item</h3>
                  <p className="text-sm text-stone-500">Pick one statement piece to build three weather-adapted looks around.</p>
                </div>

                {/* Upload Button */}
                <label className="cursor-pointer group flex items-center gap-3 px-6 py-3 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 transition-all shadow-sm">
                  <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                  <span>Upload Clothing Photo</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Sample Items Selector */}
              <div className="pt-6">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-4">
                  Or test with curated statement pieces:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { id: 'floral_skirt', name: 'Floral Silk Midi Skirt', icon: '🌸' },
                    { id: 'emerald_blazer', name: 'Emerald Corduroy Blazer', icon: '🧥' },
                    { id: 'silver_boots', name: 'Metallic Silver Boots', icon: '👢' },
                    { id: 'mustard_pants', name: 'Mustard Wide-Leg Trousers', icon: '👖' },
                    { id: 'cobalt_dress', name: 'Cobalt Blue Slip Dress', icon: '👗' }
                  ].map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleAnalyzeSample(sample.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                        selectedSample === sample.id 
                          ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900 shadow-xs' 
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <span className="text-2xl">{sample.icon}</span>
                      <span className="text-xs font-medium text-stone-800 leading-tight">{sample.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="py-24 text-center bg-white rounded-3xl border border-stone-200 shadow-xs my-8">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-6 text-stone-900 animate-spin">
                  <RefreshCw className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-2xl font-medium text-stone-900 mb-2">Styling with Weather Adaptation</h3>
                <p className="text-stone-600 animate-pulse">{loadingStep}</p>
              </div>
            )}

            {error && (
              <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl mb-8 text-center">
                {error}
              </div>
            )}

            {/* Analysis & Outfits Results */}
            {analysisData && !loading && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-12"
              >
                {/* Item Analysis Card */}
                <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row gap-8 items-center">
                  <div className="w-full md:w-72 aspect-square rounded-2xl bg-stone-100 overflow-hidden shadow-inner flex-shrink-0 relative">
                    <img 
                      src={analysisData.imageUrl} 
                      alt={analysisData.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white px-3 py-1 rounded-full text-xs font-medium">
                      {analysisData.category}
                    </span>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 uppercase tracking-wider">
                        {analysisData.styleVibe}
                      </span>
                      {weather && (
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 uppercase tracking-wider">
                          Climate Adapted for {weather.location}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900">
                      {analysisData.name}
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 pt-2">
                      <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
                        <span className="text-xs text-stone-500 uppercase tracking-wider block mb-1">Fabric & Texture</span>
                        <span className="text-sm font-medium text-stone-800">{analysisData.fabric}</span>
                      </div>
                      <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
                        <span className="text-xs text-stone-500 uppercase tracking-wider block mb-1">Pattern & Motif</span>
                        <span className="text-sm font-medium text-stone-800">{analysisData.pattern}</span>
                      </div>
                    </div>

                    {/* Color Palette Swatches */}
                    <div>
                      <span className="text-xs text-stone-500 uppercase tracking-wider block mb-2">Extracted Color Palette</span>
                      <div className="flex items-center gap-2">
                        {analysisData.colorPalette.map((color, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                            <span className="w-3 h-3 rounded-full shadow-xs" style={{ backgroundColor: color }} />
                            <span className="text-xs font-mono text-stone-700">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Outfit Options Header */}
                <div className="text-center max-w-xl mx-auto pt-4">
                  <h3 className="font-serif text-3xl font-normal text-stone-900 mb-2">3 Climate-Adapted Outfit Flat-Lays</h3>
                  <p className="text-stone-600">Styled for your {analysisData.name.toLowerCase()} with local weather modifications.</p>
                </div>

                {/* Outfit Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {analysisData.outfits.map((outfit, index) => {
                    const isSaved = lookbook.some(l => l.outfit.title === outfit.title);

                    return (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.15 }}
                        className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                      >
                        {/* Outfit Flat-Lay Image / Visual */}
                        <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                          {outfit.isGeneratingImage ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50 text-stone-500 p-6 text-center">
                              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-stone-800" />
                              <p className="text-xs font-medium tracking-wide">Generating editorial flat-lay visualization...</p>
                            </div>
                          ) : outfit.imageUrl ? (
                            <img 
                              src={outfit.imageUrl} 
                              alt={outfit.title} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400">
                              <span>Flat-lay unavailable</span>
                            </div>
                          )}

                          <div className="absolute top-4 left-4 flex items-center gap-2">
                            <span className="bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase text-stone-900 shadow-xs flex items-center gap-1.5">
                              {getCategoryIcon(outfit.category)}
                              {outfit.category}
                            </span>
                          </div>

                          <div className="absolute top-4 right-4 flex items-center gap-2">
                            <button 
                              onClick={() => regenerateOutfitImage(index)}
                              title="Regenerate flat-lay"
                              className="w-9 h-9 bg-white/95 backdrop-blur-xs rounded-full flex items-center justify-center text-stone-800 hover:bg-white shadow-xs transition-transform hover:rotate-180"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => toggleSaveLook(outfit)}
                              title={isSaved ? "Saved to lookbook" : "Save to lookbook"}
                              className={`w-9 h-9 backdrop-blur-xs rounded-full flex items-center justify-center shadow-xs transition-all ${
                                isSaved 
                                  ? 'bg-stone-900 text-white' 
                                  : 'bg-white/95 text-stone-800 hover:bg-white'
                              }`}
                            >
                              <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
                            </button>
                          </div>
                        </div>

                        {/* Outfit Details */}
                        <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                          <div>
                            <h4 className="font-serif text-xl font-medium text-stone-900 mb-2">{outfit.title}</h4>
                            <p className="text-sm text-stone-600 mb-4">{outfit.description}</p>

                            {/* Complete Outfit Items List */}
                            <div className="space-y-2 mb-6">
                              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Outfit Components:</span>
                              <ul className="space-y-1.5">
                                {outfit.items.map((itemStr, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <span>{itemStr}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* AI-Generated 'Styling Tip' Text Box */}
                          <div className="bg-[#FAF8F5] border-l-3 border-stone-900 p-4 rounded-r-2xl">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900 uppercase tracking-wider mb-1.5">
                              <Wand2 className="w-4 h-4 text-amber-600" />
                              Expert Styling & Weather Tip
                            </div>
                            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed italic">
                              "{outfit.stylingTip}"
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 mt-20 border-t border-stone-200 text-center text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 AuraStylist. AI Virtual Wardrobe, Flat-Lay Styling & Climate System.</p>
        <div className="flex items-center gap-6">
          <span className="hover:text-stone-800 cursor-pointer">Privacy Policy</span>
          <span className="hover:text-stone-800 cursor-pointer">Terms of Service</span>
          <span className="hover:text-stone-800 cursor-pointer">Stylist Concierge</span>
        </div>
      </footer>
    </div>
  );
}
