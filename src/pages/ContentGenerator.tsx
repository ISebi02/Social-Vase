import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Image as ImageIcon, Video, Type as TypeIcon, Calendar, PenTool, Sparkles, TrendingUp, PartyPopper, RefreshCw, Twitter, Linkedin, Instagram, Facebook } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export function ContentGenerator() {
  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [topic, setTopic] = useState('');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState('1K');
  const [videoResolution, setVideoResolution] = useState('720p');
  
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['twitter', 'linkedin']);
  
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [generatedMediaUrl, setGeneratedMediaUrl] = useState('');
  
  const [scheduling, setScheduling] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [trendSearchQuery, setTrendSearchQuery] = useState('');
  const navigate = useNavigate();

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
          const brandData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          setBrand(brandData);
          fetchSuggestions(brandData);
        }
      } catch (error) {
        console.error("Error fetching brand:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, []);

  const fetchSuggestions = async (brandData: any, query?: string) => {
    setFetchingSuggestions(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const searchContext = query 
        ? `specifically related to "${query}"` 
        : `relevant for a brand in the ${brandData.industry || 'general'} industry and ${brandData.category || 'business'} category`;
      
      const prompt = `Using Google Search, identify 5 current trending topics, news stories, or viral discussions ${searchContext} that would be perfect for social media content.
      
      Brand Context:
      - Name: ${brandData.name}
      - Industry: ${brandData.industry || 'N/A'}
      - Category: ${brandData.category || 'N/A'}
      
      For each topic, provide:
      1. A catchy title.
      2. A brief explanation of why it's trending and how it relates to this brand.
      3. The type (trend, news, or holiday).
      
      IMPORTANT: Return ONLY a valid JSON array of objects. Do not include any markdown formatting or extra text.
      Format: [{"title": "...", "description": "...", "type": "..."}]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || '[]';
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanJson);
      setSuggestions(result);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setFetchingSuggestions(false);
    }
  };

  const handlePlanCalendar = async (days: number) => {
    if (!brand) return;
    setPlanning(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Act as a strategic social media manager. Create a ${days}-day content calendar for the following brand.
      
      Brand Context:
      - Name: ${brand.name}
      - Industry: ${brand.industry || 'N/A'}
      - Category: ${brand.category || 'N/A'}
      - Tone: ${brand.brandTone}
      - Personality: ${brand.brandPersonality}
      
      Instructions:
      1. Use Google Search to find current trends, upcoming holidays, and industry-specific topics for the next ${days} days.
      2. For each day, provide a content topic and a brief description of the post.
      3. Distribute the topics logically over the ${days} days.
      
      IMPORTANT: Return ONLY a valid JSON array of objects. Do not include markdown.
      Format: [{"day": 1, "topic": "...", "description": "...", "type": "..."}]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || '[]';
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const plan = JSON.parse(cleanJson);

      // Save each planned post to Firestore
      const batch = plan.map(async (item: any, index: number) => {
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + (index + 1));
        scheduledDate.setHours(10, 0, 0, 0);

        return addDoc(collection(db, 'posts'), {
          userId: auth.currentUser?.uid,
          brandId: brand.id,
          content: `${item.topic}\n\n${item.description}`,
          status: 'suggested',
          scheduledTime: scheduledDate,
          platforms: selectedPlatforms,
          mediaType: 'none',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isPlanned: true
        });
      });

      await Promise.all(batch);
      alert(`Successfully planned a ${days}-day calendar! You can review the suggestions in the Scheduler.`);
      navigate('/schedule');
    } catch (error) {
      console.error("Planning failed:", error);
      alert("Failed to plan calendar. Please try again.");
    } finally {
      setPlanning(false);
    }
  };

  const handleGenerate = async (customTopic?: string, isTrend = false) => {
    const finalTopic = customTopic || topic;
    if (!finalTopic) {
      alert("Please provide a topic or idea.");
      return;
    }
    if (!brand) {
      alert("Please set up your brand first.");
      return;
    }

    setGenerating(true);
    setGeneratedContent('');
    setGeneratedMediaUrl('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Generate Text Content with Grounding if it's a trend
      const textPrompt = `You are an expert social media manager. Write a highly engaging, humanized social media post about "${finalTopic}".
      
      Tailor the content specifically for the following platforms: ${selectedPlatforms.join(', ')}.
      
      ${isTrend ? 'This is a trending topic. Use Google Search to find the latest details, facts, or sentiment about this topic to ensure the post is accurate and timely.' : ''}
      
      Brand Context:
      - Name: ${brand.name}
      - Industry: ${brand.industry || 'N/A'}
      - Category: ${brand.category || 'N/A'}
      - Tone: ${brand.brandTone || 'Professional but approachable'}
      - Personality: ${brand.brandPersonality || 'Helpful and innovative'}
      
      The post should NOT sound like AI. Make it relatable, use appropriate spacing, and include relevant hashtags for each platform. If multiple platforms are selected, provide a single cohesive post that works well across all of them or slightly varied versions if necessary.`;

      const textResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: textPrompt,
        config: isTrend ? { tools: [{ googleSearch: {} }] } : undefined
      });
      
      setGeneratedContent(textResponse.text || '');

      // Generate Media if requested
      if (mediaType === 'image') {
        const imagePrompt = `A high-quality, professional social media graphic for a brand named ${brand.name}. Topic: ${finalTopic}. Brand colors: ${brand.brandColors?.join(', ') || 'neutral'}. Style: Modern, clean, relatable, no text overlays.`;
        
        const imageResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: { parts: [{ text: imagePrompt }] },
          config: {
            imageConfig: { 
              aspectRatio: aspectRatio as any, 
              imageSize: quality as any 
            }
          }
        });

        for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            const base64Image = `data:image/png;base64,${part.inlineData.data}`;
            
            if (brand.logoUrl) {
              // Overlay logo using Canvas
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const img = new Image();
              const logo = new Image();
              
              await new Promise((resolve) => {
                img.onload = resolve;
                img.src = base64Image;
              });
              
              await new Promise((resolve) => {
                logo.onload = resolve;
                logo.src = brand.logoUrl;
              });
              
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);
              
              // Draw logo in bottom right corner
              const logoWidth = canvas.width * 0.15; // 15% of image width
              const logoHeight = (logo.height / logo.width) * logoWidth;
              const padding = 20;
              ctx?.drawImage(logo, canvas.width - logoWidth - padding, canvas.height - logoHeight - padding, logoWidth, logoHeight);
              
              setGeneratedMediaUrl(canvas.toDataURL('image/png'));
            } else {
              setGeneratedMediaUrl(base64Image);
            }
            break;
          }
        }
      } else if (mediaType === 'video') {
        const videoPrompt = `A high-quality, professional short video clip for a brand named ${brand.name}. Topic: ${finalTopic}. Style: Cinematic, modern, clean.`;
        
        let operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: videoPrompt,
          config: {
            numberOfVideos: 1,
            resolution: videoResolution as any,
            aspectRatio: aspectRatio === '16:9' || aspectRatio === '9:16' ? aspectRatio : '16:9'
          }
        });

        // Poll for completion
        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          operation = await ai.operations.getVideosOperation({operation: operation});
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          const videoResponse = await fetch(downloadLink, {
            method: 'GET',
            headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY as string },
          });
          const blob = await videoResponse.blob();
          setGeneratedMediaUrl(URL.createObjectURL(blob));
        }
      }

    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate content. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSchedule = async () => {
    if (!generatedContent) return;
    
    setScheduling(true);
    try {
      // Default schedule for tomorrow at 10 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const status = brand.automationSettings?.mode === 'auto' ? 'scheduled' : 'suggested';

      await addDoc(collection(db, 'posts'), {
        userId: auth.currentUser?.uid,
        brandId: brand.id,
        content: generatedContent,
        mediaUrl: generatedMediaUrl || null,
        mediaType: mediaType,
        scheduledTime: tomorrow,
        status: status,
        platforms: selectedPlatforms,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      alert(status === 'scheduled' ? "Post scheduled successfully!" : "Post saved as suggestion for approval.");
      navigate('/schedule');
    } catch (error) {
      console.error("Scheduling failed:", error);
      alert("Failed to schedule post.");
    } finally {
      setScheduling(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform) 
        : [...prev, platform]
    );
  };

  if (loading) return <div className="p-8">Loading...</div>;

  if (!brand) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Setup Your Brand First</h2>
        <p className="text-gray-500 mb-4">You need to configure your brand settings before generating content.</p>
        <button onClick={() => navigate('/brand-setup')} className="px-4 py-2 bg-black text-white rounded-lg">Go to Brand Setup</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Content Generator</h1>
        <p className="text-gray-500 mt-1">Create brand-aligned posts, images, and videos.</p>
      </header>

      {/* Suggestions Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Trending Topics & Insights
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input 
                type="text"
                placeholder="Search trends (e.g. AI, Fashion)..."
                value={trendSearchQuery}
                onChange={(e) => setTrendSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchSuggestions(brand, trendSearchQuery)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none w-48 sm:w-64"
              />
              <TrendingUp className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <button 
              onClick={() => fetchSuggestions(brand, trendSearchQuery)}
              disabled={fetchingSuggestions}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
            >
              <RefreshCw className={cn("w-3 h-3", fetchingSuggestions && "animate-spin")} />
              {trendSearchQuery ? 'Search' : 'Refresh'}
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button 
              onClick={() => handlePlanCalendar(7)}
              disabled={planning}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            >
              {planning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
              Plan Week
            </button>
            <button 
              onClick={() => handlePlanCalendar(30)}
              disabled={planning}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            >
              {planning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
              Plan Month
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {fetchingSuggestions ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse"></div>
            ))
          ) : suggestions.length > 0 ? (
            suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setTopic(s.title);
                  handleGenerate(s.title, true);
                }}
                className="group relative bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-black transition-all shadow-sm flex flex-col h-full"
              >
                <div className="flex items-center gap-2 mb-2">
                  {s.type === 'trend' || s.type === 'news' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <PartyPopper className="w-3.5 h-3.5 text-orange-500" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {s.type}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">{s.title}</h3>
                <p className="text-[11px] text-gray-500 line-clamp-3 flex-1">{s.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Use Trend</span>
                  <PenTool className="w-3 h-3 text-gray-300 group-hover:text-black transition-colors" />
                </div>
              </button>
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-gray-400 text-sm italic">
              No trends found. Try searching for a specific topic above.
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6 h-fit">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">What do you want to post about?</label>
            <textarea 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all resize-none"
              placeholder="e.g., Announcing our new eco-friendly packaging initiative..."
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Target Platforms</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'twitter', name: 'Twitter', icon: Twitter },
                { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
                { id: 'instagram', name: 'Instagram', icon: Instagram },
                { id: 'facebook', name: 'Facebook', icon: Facebook },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                    selectedPlatforms.includes(p.id)
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  )}
                >
                  <p.icon className="w-3.5 h-3.5" />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Include Media?</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setMediaType('none')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border ${mediaType === 'none' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <TypeIcon className="w-6 h-6 mb-2 text-gray-700" />
                <span className="text-sm font-medium">Text Only</span>
              </button>
              <button
                onClick={() => setMediaType('image')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border ${mediaType === 'image' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <ImageIcon className="w-6 h-6 mb-2 text-gray-700" />
                <span className="text-sm font-medium">Image</span>
              </button>
              <button
                onClick={() => setMediaType('video')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border ${mediaType === 'video' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Video className="w-6 h-6 mb-2 text-gray-700" />
                <span className="text-sm font-medium">Video</span>
              </button>
            </div>
          </div>

          {mediaType !== 'none' && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Aspect Ratio</label>
                  <select 
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white"
                  >
                    {mediaType === 'image' ? (
                      <>
                        <option value="1:1">Square (1:1)</option>
                        <option value="4:3">Standard (4:3)</option>
                        <option value="3:4">Portrait (3:4)</option>
                        <option value="16:9">Widescreen (16:9)</option>
                        <option value="9:16">Story (9:16)</option>
                      </>
                    ) : (
                      <>
                        <option value="16:9">Widescreen (16:9)</option>
                        <option value="9:16">Story (9:16)</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Quality</label>
                  {mediaType === 'image' ? (
                    <select 
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white"
                    >
                      <option value="512px">Standard (512px)</option>
                      <option value="1K">High (1K)</option>
                      <option value="2K">Ultra (2K)</option>
                      <option value="4K">Max (4K)</option>
                    </select>
                  ) : (
                    <select 
                      value={videoResolution}
                      onChange={(e) => setVideoResolution(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white"
                    >
                      <option value="720p">HD (720p)</option>
                      <option value="1080p">Full HD (1080p)</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => handleGenerate()}
            disabled={generating || !topic}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenTool className="w-5 h-5" />}
            {generating ? 'Generating Content...' : 'Generate Content'}
          </button>
        </div>

        {/* Output Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px] flex flex-col">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Preview</h2>
          
          {!generatedContent && !generating ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <PenTool className="w-12 h-12 mb-4 opacity-20" />
              <p>Your generated content will appear here.</p>
            </div>
          ) : generating ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Crafting the perfect post...</p>
              {mediaType === 'video' && <p className="text-xs mt-2 text-gray-400">Video generation may take a few minutes.</p>}
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-6 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                      {brand.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{brand.name}</div>
                      <div className="text-xs text-gray-500">Just now</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <PenTool className="w-3 h-3" />
                    {isEditing ? 'Preview' : 'Edit Content'}
                  </button>
                </div>
                
                {isEditing ? (
                  <textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all resize-none mb-4"
                  />
                ) : (
                  <div className="text-sm text-gray-800 whitespace-pre-wrap mb-4">
                    {generatedContent}
                  </div>
                )}

                {generatedMediaUrl && mediaType === 'image' && (
                  <img src={generatedMediaUrl} alt="Generated content" className="w-full rounded-lg border border-gray-100" />
                )}
                
                {generatedMediaUrl && mediaType === 'video' && (
                  <video src={generatedMediaUrl} controls className="w-full rounded-lg border border-gray-100" />
                )}
              </div>

              <button
                onClick={handleSchedule}
                disabled={scheduling}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {scheduling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                {scheduling 
                  ? 'Processing...' 
                  : brand.automationSettings?.mode === 'auto' 
                    ? 'Schedule for Tomorrow' 
                    : 'Save for Approval'}
              </button>
              
              <button
                onClick={async () => {
                  await fetch('/api/post', {
                    method: 'POST',
                    body: JSON.stringify({ content: generatedContent, platforms: selectedPlatforms }),
                    headers: { 'Content-Type': 'application/json' }
                  });
                  alert('Posted successfully!');
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black border border-black font-medium rounded-xl hover:bg-gray-50 transition-colors mt-2"
              >
                Post Now
              </button>
              
              <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <span>Automation Mode</span>
                  <span className={brand.automationSettings?.mode === 'auto' ? 'text-green-600' : 'text-amber-600'}>
                    {brand.automationSettings?.mode === 'auto' ? 'Auto-Post' : 'Manual Approval'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {brand.automationSettings?.mode === 'auto' 
                    ? `SocialVase is set to automatically post ${brand.automationSettings?.postsPerPeriod} time(s) per ${brand.automationSettings?.periodUnit}.` 
                    : `SocialVase will suggest ${brand.automationSettings?.postsPerPeriod} post(s) per ${brand.automationSettings?.periodUnit} for your approval.`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
