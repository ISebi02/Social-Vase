import { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, PenTool, Settings, BarChart3, TrendingUp } from 'lucide-react';

export function Dashboard() {
  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          setBrand({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }
      } catch (error) {
        console.error("Error fetching brand:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, []);

  if (loading) {
    return <div className="animate-pulse flex space-x-4 p-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your brand and content.</p>
        </div>
      </header>

      {!brand ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Setup Your Brand</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            Before we can generate content, SocialVase needs to understand your brand's tone, personality, and guidelines.
          </p>
          <Link
            to="/brand-setup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
          >
            Start Brand Setup <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Brand Summary Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm col-span-full md:col-span-1">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Active Brand</h3>
            <div className="text-2xl font-semibold mb-2">{brand.name}</div>
            <div className="space-y-3 mt-6">
              <div>
                <div className="text-xs text-gray-500 mb-1">Tone</div>
                <div className="text-sm font-medium">{brand.brandTone || 'Not set'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Personality</div>
                <div className="text-sm font-medium">{brand.brandPersonality || 'Not set'}</div>
              </div>
              {brand.brandColors && brand.brandColors.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-2">Colors</div>
                  <div className="flex gap-2">
                    {brand.brandColors.map((color: string, i: number) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: color }} title={color} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100">
              <Link to="/brand-setup" className="text-sm font-medium text-black hover:underline">
                Edit Brand Settings &rarr;
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-span-full md:col-span-2 grid sm:grid-cols-2 gap-6">
            <Link to="/generate" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-black/20 transition-colors group">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Trending Topics</h3>
              <p className="text-sm text-gray-500">Explore real-time trends and generate timely content for your brand.</p>
            </Link>

            <Link to="/generate" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-black/20 transition-colors group">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                <PenTool className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Generate Content</h3>
              <p className="text-sm text-gray-500">Create new posts, images, and videos based on your brand guidelines.</p>
            </Link>

            <Link to="/schedule" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-black/20 transition-colors group">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">View Schedule</h3>
              <p className="text-sm text-gray-500">Manage your upcoming posts and review your content calendar.</p>
            </Link>

            <Link to="/analytics" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-black/20 transition-colors group col-span-full">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Performance Analytics</h3>
                  <p className="text-sm text-gray-500">Track engagement and get AI-powered insights on your content.</p>
                </div>
                <ArrowRight className="w-5 h-5 ml-auto text-gray-300 group-hover:text-black transition-colors" />
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
