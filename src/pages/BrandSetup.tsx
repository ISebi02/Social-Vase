import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, UploadCloud, Link as LinkIcon } from 'lucide-react';

export function BrandSetup() {
  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [guidelinesText, setGuidelinesText] = useState('');
  const [socialUrls, setSocialUrls] = useState('');
  const [clientInquiries, setClientInquiries] = useState('');

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
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
          setClientInquiries(data.clientInquiries ? data.clientInquiries.join('\n') : '');
          
          if (data.automationSettings) {
            setAutomationMode(data.automationSettings.mode || 'manual');
            setPostsPerPeriod(data.automationSettings.postsPerPeriod || 1);
            setPeriodUnit(data.automationSettings.periodUnit || 'day');
          }

          if (data.brandTone) {
            setAnalysisResult({
              brandTone: data.brandTone,
              brandPersonality: data.brandPersonality,
              brandColors: data.brandColors
            });
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
      
      const prompt = `Analyze the following brand information to determine its tone, personality, and primary colors (in hex format).
      
      Brand Guidelines/Text: ${guidelinesText}
      
      Return a JSON object with the following structure:
      {
        "brandTone": "A short description of the brand's tone of voice (e.g., Professional, Witty, Empathetic).",
        "brandPersonality": "A short description of the brand's personality traits.",
        "brandColors": ["#FFFFFF", "#000000"]
      }`;

      const config: any = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brandTone: { type: Type.STRING },
            brandPersonality: { type: Type.STRING },
            brandColors: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['brandTone', 'brandPersonality', 'brandColors']
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
        clientInquiries: clientInquiries.split('\n').map(s => s.trim()).filter(Boolean),
        brandTone: analysisResult?.brandTone || null,
        brandPersonality: analysisResult?.brandPersonality || null,
        brandColors: analysisResult?.brandColors || null,
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
      alert("Brand saved successfully!");
    } catch (error) {
      console.error("Error saving brand:", error);
      alert("Failed to save brand.");
    } finally {
      setSaving(false);
    }
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
          <h2 className="text-lg font-semibold border-b border-gray-100 pb-2">Brand Guidelines</h2>
          <p className="text-sm text-gray-500">Paste your brand guidelines, mission statement, or any text that helps define your brand's voice.</p>
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

        {/* Client Insights */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-gray-100 pb-2">Client Insights</h2>
          <p className="text-sm text-gray-500">What are your clients searching for or asking about? SocialVase will use these to suggest content topics. (One inquiry per line)</p>
          <textarea 
            value={clientInquiries}
            onChange={(e) => setClientInquiries(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all resize-none"
            placeholder="e.g. How do I reduce my energy bill?&#10;What are the best eco-friendly packaging options?&#10;How does your subscription model work?"
          />
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">AI Analysis Results</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-gray-500 mb-1">Brand Tone</div>
                <div className="text-sm font-medium">{analysisResult.brandTone}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Brand Personality</div>
                <div className="text-sm font-medium">{analysisResult.brandPersonality}</div>
              </div>
              <div className="col-span-full">
                <div className="text-xs text-gray-500 mb-2">Extracted Colors</div>
                <div className="flex gap-3">
                  {analysisResult.brandColors?.map((color: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: color }} />
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
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Brand Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
