import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, UploadCloud, Link as LinkIcon, Check, Plus, X, Image as ImageIcon } from 'lucide-react';

export function BrandSetup() {
  const navigate = useNavigate();
  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [guidelinesText, setGuidelinesText] = useState('');
  const [socialUrls, setSocialUrls] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState('#000000');

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  const [industry, setIndustry] = useState('');
  const [category, setCategory] = useState('');
  
  const [automationMode, setAutomationMode] = useState<'manual' | 'auto'>('manual');
  const [postsPerPeriod, setPostsPerPeriod] = useState(1);
  const [periodUnit, setPeriodUnit] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    const fetchBrand = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'brands'),
          where('userId', '==', auth.currentUser.uid),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setBrand({ id: snapshot.docs[0].id, ...data });
          setName(data.name || '');
          setWebsiteUrl(data.websiteUrl || '');
          setGuidelinesText(data.guidelinesText || '');
          setSocialUrls(data.socialUrls ? data.socialUrls.join(', ') : '');
          setLogoUrl(data.logoUrl || '');
          setBrandColors(data.brandColors || []);
          
          if (data.automationSettings) {
            setAutomationMode(data.automationSettings.mode || 'manual');
            setPostsPerPeriod(data.automationSettings.postsPerPeriod || 1);
            setPeriodUnit(data.automationSettings.periodUnit || 'day');
          }

          if (data.brandTone) {
            setAnalysisResult({
              brandTone: data.brandTone,
              brandPersonality: data.brandPersonality,
              brandColors: data.brandColors,
              industry: data.industry,
              category: data.category
            });
            setIndustry(data.industry || '');
            setCategory(data.category || '');
          }
        }
      } catch (error) {
        console.error("Error fetching brand:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, []);

  const handleAnalyze = async () => {
    if (!websiteUrl && !guidelinesText) {
      alert("Please provide a website URL or brand guidelines text to analyze.");
      return;
    }
    setAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Analyze the following brand information to determine its industry, business category, tone, personality, and primary colors (in hex format).
      
      Brand Guidelines/Text: ${guidelinesText}
      
      Return a JSON object with the following structure:
      {
        "industry": "The broad industry (e.g., Technology, Healthcare, Fashion).",
        "category": "The specific business category (e.g., SaaS, E-commerce, Personal Training).",
        "brandTone": "A short description of the brand's tone of voice (e.g., Professional, Witty, Empathetic).",
        "brandPersonality": "A short description of the brand's personality traits.",
        "brandColors": ["#FFFFFF", "#000000"]
      }`;

      const config: any = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            industry: { type: Type.STRING },
            category: { type: Type.STRING },
            brandTone: { type: Type.STRING },
            brandPersonality: { type: Type.STRING },
            brandColors: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['industry', 'category', 'brandTone', 'brandPersonality', 'brandColors']
        }
      };

      let finalPrompt = prompt;
      if (websiteUrl) {
        config.tools = [{ urlContext: {} }];
        finalPrompt += `\n\nWebsite URL to analyze: ${websiteUrl}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: finalPrompt,
        config
      });

      const result = JSON.parse(response.text || '{}');
      setAnalysisResult(result);
      if (result.industry) setIndustry(result.industry);
      if (result.category) setCategory(result.category);
      if (result.brandColors) setBrandColors(result.brandColors);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze brand. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!name) {
      alert("Brand name is required.");
      return;
    }
    setSaving(true);
    try {
      const brandData = {
        userId: auth.currentUser?.uid,
        name,
        websiteUrl,
        socialUrls: socialUrls.split(',').map(s => s.trim()).filter(Boolean),
        guidelinesText,
        industry: analysisResult?.industry || industry || null,
        category: analysisResult?.category || category || null,
        logoUrl,
        brandTone: analysisResult?.brandTone || null,
        brandPersonality: analysisResult?.brandPersonality || null,
        brandColors: brandColors,
        automationSettings: {
          mode: automationMode,
          postsPerPeriod: postsPerPeriod,
          periodUnit: periodUnit
        },
        updatedAt: serverTimestamp()
      };

      if (brand) {
        await updateDoc(doc(db, 'brands', brand.id), brandData);
      } else {
        await addDoc(collection(db, 'brands'), {
          ...brandData,
          createdAt: serverTimestamp()
        });
      }
      
      setSaved(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error("Error saving brand:", error);
      alert("Failed to save brand.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addColor = () => {
    if (newColor && !brandColors.includes(newColor)) {
      setBrandColors([...brandColors, newColor]);
    }
  };

  const removeColor = (colorToRemove: string) => {
    setBrandColors(brandColors.filter(c => c !== colorToRemove));
  };

  const updateColor = (index: number, value: string) => {
    const updated = [...brandColors];
    updated[index] = value;
    setBrandColors(updated);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Brand Setup</h1>
        <p className="text-gray-500 mt-1">Define your brand so SocialVase can generate accurate content.</p>
      </header>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-8">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-gray-100 pb-2">Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Brand Name *</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                placeholder="e.g., Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Brand Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <label className="flex-1 cursor-pointer">
                  <div className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center">
                    {logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {logoUrl && (
                  <button onClick={() => setLogoUrl('')} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Website URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="url" 
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Social Media URLs (comma separated)</label>
            <input 
              type="text" 
              value={socialUrls}
              onChange={(e) => setSocialUrls(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
              placeholder="https://twitter.com/acme, https://linkedin.com/company/acme"
            />
          </div>
        </div>

        {/* Automation Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-gray-100 pb-2">AI Automation</h2>
          <p className="text-sm text-gray-500">Choose how SocialVase should handle content generation and posting.</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Posting Mode</label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setAutomationMode('manual')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${automationMode === 'manual' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Manual Approval
                </button>
                <button
                  onClick={() => setAutomationMode('auto')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${automationMode === 'auto' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Auto-Post
                </button>
              </div>
              <p className="text-xs text-gray-400">
                {automationMode === 'manual' 
                  ? 'AI will suggest content that you must approve before it is scheduled.' 
                  : 'AI will automatically generate and schedule posts based on your brand.'}
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Frequency</label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  min="1"
                  max="100"
                  value={postsPerPeriod}
                  onChange={(e) => setPostsPerPeriod(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                />
                <span className="text-sm text-gray-500">post(s) per</span>
                <select
                  value={periodUnit}
                  onChange={(e) => setPeriodUnit(e.target.value as any)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
              <p className="text-xs text-gray-400">
                SocialVase will {automationMode === 'auto' ? 'automatically post' : 'suggest'} {postsPerPeriod} content piece(s) every {periodUnit}.
              </p>
            </div>
          </div>
        </div>

        {/* Guidelines */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-gray-100 pb-2">Connected Accounts</h2>
          <div className="flex gap-2">
            {['twitter', 'linkedin'].map(platform => (
              <button
                key={platform}
                onClick={async () => {
                  const res = await fetch(`/api/auth/url/${platform}`);
                  const { url } = await res.json();
                  window.open(url, 'oauth_popup', 'width=600,height=700');
                }}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                Connect {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </button>
            ))}
          </div>

          <h2 className="text-lg font-semibold border-b border-gray-100 pb-2 mt-8">Brand Visuals & Guidelines</h2>
          
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Color Palette</label>
            <div className="flex flex-wrap gap-3">
              {brandColors.map((color, i) => (
                <div key={i} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-gray-200 shadow-xs group">
                  <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => updateColor(i, e.target.value)}
                    className="w-6 h-6 rounded-full border border-gray-200 shadow-sm shrink-0 cursor-pointer overflow-hidden p-0" 
                  />
                  <input 
                    type="text" 
                    value={color} 
                    onChange={(e) => updateColor(i, e.target.value)}
                    className="text-xs font-mono text-gray-600 w-16 outline-none"
                  />
                  <button onClick={() => removeColor(color)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={newColor} 
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm shrink-0 cursor-pointer p-0" 
                />
                <button 
                  onClick={addColor}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400">Add your brand colors manually or use AI analysis below to detect them from your website/guidelines.</p>
          </div>

          <p className="text-sm text-gray-500 mt-6">Paste your brand guidelines, mission statement, or any text that helps define your brand's voice.</p>
          <textarea 
            value={guidelinesText}
            onChange={(e) => setGuidelinesText(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all resize-none"
            placeholder="Our brand is focused on innovation and sustainability. We speak to our audience with a friendly, professional tone..."
          />
          
          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || (!websiteUrl && !guidelinesText)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {analyzing ? 'Analyzing Brand...' : 'Analyze Brand with AI'}
            </button>
          </div>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 space-y-4 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">AI Analysis Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="min-w-0">
                <div className="text-xs text-gray-500 mb-1">Industry</div>
                <div className="text-sm font-medium break-words">{analysisResult.industry}</div>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500 mb-1">Business Category</div>
                <div className="text-sm font-medium break-words">{analysisResult.category}</div>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500 mb-1">Brand Tone</div>
                <div className="text-sm font-medium break-words">{analysisResult.brandTone}</div>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500 mb-1">Brand Personality</div>
                <div className="text-sm font-medium break-words">{analysisResult.brandPersonality}</div>
              </div>
              <div className="col-span-full">
                <div className="text-xs text-gray-500 mb-2">Extracted Colors</div>
                <div className="flex flex-wrap gap-4">
                  {analysisResult.brandColors?.map((color: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-gray-200 shadow-xs">
                      <div className="w-6 h-6 rounded-full border border-gray-200 shadow-sm shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs font-mono text-gray-600">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`inline-flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-all ${
              saved 
                ? 'bg-emerald-500 text-white' 
                : 'bg-black text-white hover:bg-gray-800'
            } disabled:opacity-50`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saved ? <Check className="w-4 h-4" /> : null}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Brand Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
