import React from 'react';
import { ArrowRight, Zap, Globe, MessageSquare, BarChart3, Shield, Mic, Calendar, CheckCircle, Search, Lightbulb, LayoutDashboard } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-brand-600 text-white rounded-lg font-bold text-lg">AI</span>
              <span className="font-bold text-xl text-slate-800">SocialAI</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-brand-600 transition-colors">How it Works</a>
              <a href="#pricing" className="hover:text-brand-600 transition-colors">Pricing</a>
            </div>
            <button 
              onClick={onGetStarted}
              className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-md font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm"
            >
              Get Started <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 lg:pt-48 lg:pb-32 relative overflow-hidden bg-slate-50">
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] bg-brand-100 rounded-full blur-3xl opacity-50 mix-blend-multiply filter"></div>
        <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[600px] h-[600px] bg-indigo-100 rounded-full blur-3xl opacity-50 mix-blend-multiply filter"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold uppercase tracking-wide mb-6">
            <Zap size={14} className="fill-current" /> Powered by Gemini 3.0 Pro
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
            The Only Social Media<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-700">Manager You Need</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-10 leading-relaxed font-light">
            Automate your entire marketing workflow. From market research and strategy to content creation and scheduling—SocialAI does it all.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={onGetStarted}
              className="px-8 py-4 bg-brand-600 text-white rounded-md font-bold text-lg hover:bg-brand-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Start Free Trial <ArrowRight size={18}/>
            </button>
            <button className="px-8 py-4 bg-white text-slate-700 border border-slate-300 rounded-md font-bold text-lg hover:bg-slate-50 transition-all shadow-sm">
              View Demo
            </button>
          </div>
          
          {/* Hero Image Mockup - Replaced with Dashboard UI */}
          <div className="mt-16 relative mx-auto max-w-6xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 text-left">
             {/* Browser Bar */}
             <div className="bg-slate-900 p-2 flex items-center gap-2">
                 <div className="flex gap-1.5 ml-2">
                     <div className="w-3 h-3 rounded-full bg-red-500"></div>
                     <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                     <div className="w-3 h-3 rounded-full bg-green-500"></div>
                 </div>
                 <div className="bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-md mx-auto w-1/3 text-center truncate">socialai.app/dashboard</div>
             </div>
             
             {/* App Interface Mockup */}
             <div className="bg-slate-50 flex h-[600px] overflow-hidden">
                 
                 {/* Sidebar */}
                 <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 hidden md:flex">
                    <div className="p-6 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
                         <span className="p-1 bg-brand-600 text-white rounded">AI</span> SocialAI
                      </div>
                    </div>
                    <div className="flex-1 p-4 space-y-1">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-brand-50 text-brand-700">
                         <LayoutDashboard size={20}/> Dashboard
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600">
                         <Search size={20}/> Market Research
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600">
                         <Lightbulb size={20}/> Strategy (Reasoning)
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600">
                         <Calendar size={20}/> Content Calendar
                      </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 space-y-4">
                       <div className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white p-3 rounded-xl shadow-lg">
                          <Mic size={20} /> Live Consultant
                       </div>
                       <div className="flex items-center gap-2 text-slate-500 px-2 py-1 text-sm">
                          <ArrowRight size={16} className="rotate-180"/> Logout / Reset
                       </div>
                    </div>
                 </div>

                 {/* Main Content */}
                 <div className="flex-1 p-8 overflow-y-auto">
                    <header className="mb-10">
                      <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                      <p className="text-slate-500">Welcome back, shakes travel.</p>
                    </header>

                    {/* Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4"><Search size={24} /></div>
                        <h3 className="text-lg font-semibold mb-1">Market Research</h3>
                        <p className="text-sm text-slate-500">View latest trends and competitor analysis powered by Google Search.</p>
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4"><Lightbulb size={24} /></div>
                        <h3 className="text-lg font-semibold mb-1">Strategic Plan</h3>
                        <p className="text-sm text-slate-500">Deep-dive marketing strategy generated by reasoning models.</p>
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4"><Calendar size={24} /></div>
                        <h3 className="text-lg font-semibold mb-1">Content Calendar</h3>
                        <p className="text-sm text-slate-500">Manage posts, generate content, and schedule for platforms.</p>
                      </div>
                    </div>

                    {/* Banner */}
                    <div className="bg-brand-900 rounded-2xl p-8 text-white relative overflow-hidden">
                      <div className="relative z-10">
                        <h2 className="text-2xl font-bold mb-2">Need real-time advice?</h2>
                        <p className="mb-6 opacity-90 max-w-lg">Talk directly to your AI marketing consultant using Gemini Live Native Audio.</p>
                        <div className="bg-white text-brand-900 px-6 py-2 rounded-lg font-semibold inline-flex items-center gap-2">
                          <Mic size={18} /> Start Conversation
                        </div>
                      </div>
                      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-800 to-transparent"></div>
                    </div>
                 </div>
             </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-20">
                <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-4">Everything You Need to Grow</h2>
                <p className="text-lg text-slate-500">Our AI agents work 24/7 to research, plan, and execute your social media strategy.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={<Search className="w-6 h-6 text-brand-600" />}
                    title="Market Research"
                    description="Automatically analyze industry trends, competitor activities, and audience sentiment using real-time Google Search data."
                    action="See Research"
                />
                <FeatureCard 
                    icon={<Lightbulb className="w-6 h-6 text-brand-600" />}
                    title="Strategic Planning"
                    description="Gemini 3 Pro generates comprehensive marketing strategies, content pillars, and KPIs tailored to your business goals."
                    action="View Strategy"
                />
                <FeatureCard 
                    icon={<Zap className="w-6 h-6 text-brand-600" />}
                    title="Auto-Pilot Mode"
                    description="Set your cadence and let SocialAI automatically generate, caption, and schedule posts for all your platforms."
                    action="Enable Auto-Pilot"
                />
                 <FeatureCard 
                    icon={<Calendar className="w-6 h-6 text-brand-600" />}
                    title="Smart Scheduling"
                    description="A visual content calendar that optimizes posting times for maximum engagement across Instagram, LinkedIn, and more."
                    action="Open Calendar"
                />
                <FeatureCard 
                    icon={<Mic className="w-6 h-6 text-brand-600" />}
                    title="Live Consultant"
                    description="Talk to your AI marketing expert in real-time using voice to brainstorm ideas or get immediate advice."
                    action="Talk Now"
                />
                <FeatureCard 
                    icon={<BarChart3 className="w-6 h-6 text-brand-600" />}
                    title="Performance Analytics"
                    description="Track growth and engagement with automated reporting that helps you refine your strategy over time."
                    action="View Report"
                />
            </div>
        </div>
      </section>

      {/* Trust / Process */}
      <section id="how-it-works" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold mb-4 text-slate-900">From Zero to Posted in Seconds</h2>
                  <p className="text-slate-500">How SocialAI transforms your workflow.</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8 text-center">
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 relative">
                      <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                      <h3 className="font-bold text-lg mb-2">Onboard Business</h3>
                      <p className="text-slate-500 text-sm">Tell us about your brand, audience, and goals. We build your profile.</p>
                  </div>
                   <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 relative">
                      <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                      <h3 className="font-bold text-lg mb-2">Generate Strategy</h3>
                      <p className="text-slate-500 text-sm">AI analyzes the market and creates a tailored content plan.</p>
                  </div>
                   <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 relative">
                      <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                      <h3 className="font-bold text-lg mb-2">Auto-Pilot Execution</h3>
                      <p className="text-slate-500 text-sm">Approve generated content batches and watch your accounts grow.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* CTA - Dark Navy Background */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
              <h2 className="text-4xl font-extrabold text-white mb-6">Ready to Scale Your Marketing?</h2>
              <p className="text-slate-300 text-xl mb-10 max-w-2xl mx-auto">Join thousands of businesses using SocialAI to save time and grow faster.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={onGetStarted}
                    className="px-8 py-4 bg-brand-600 text-white rounded-md font-bold text-lg shadow-xl hover:bg-brand-500 transition-all hover:-translate-y-1"
                  >
                      Start Free Trial
                  </button>
                  <div className="bg-white rounded-md flex items-center px-4 w-full sm:w-auto min-w-[300px]">
                      <span className="text-slate-400 text-sm">Enter your email...</span>
                  </div>
              </div>
          </div>
      </section>

      {/* Footer - Dark Navy Background */}
      <footer className="bg-slate-900 pt-16 pb-8 border-t border-slate-800 text-slate-300">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              <div className="col-span-1 md:col-span-1">
                  <div className="flex items-center gap-2 mb-6">
                      <span className="p-1 bg-brand-600 text-white rounded font-bold text-sm">AI</span>
                      <span className="font-bold text-xl text-white">SocialAI</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-400">
                      The intelligent marketing assistant that helps businesses research, plan, and automate their social media growth.
                  </p>
              </div>

              <div>
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Product</h4>
                  <ul className="space-y-3 text-sm">
                      <li><a href="#" className="hover:text-brand-400 transition-colors">Features</a></li>
                      <li><a href="#" className="hover:text-brand-400 transition-colors">Pricing</a></li>
                      <li><a href="#" className="hover:text-brand-400 transition-colors">Auto-Pilot</a></li>
                      <li><a href="#" className="hover:text-brand-400 transition-colors">Case Studies</a></li>
                  </ul>
              </div>

              <div>
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Company</h4>
                  <ul className="space-y-3 text-sm">
                      <li><a href="#" className="hover:text-brand-400 transition-colors">About Us</a></li>
                      <li><a href="#" className="hover:text-brand-400 transition-colors">Careers</a></li>
                      <li><a href="#" className="hover:text-brand-400 transition-colors">Blog</a></li>
                      <li><a href="#" className="hover:text-brand-400 transition-colors">Contact</a></li>
                  </ul>
              </div>

              <div>
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Legal</h4>
                  <ul className="space-y-3 text-sm">
                      <li><a href="#" className="hover:text-brand-400 transition-colors">Privacy Policy</a></li>
                      <li><a href="#" className="hover:text-brand-400 transition-colors">Terms of Service</a></li>
                      <li><a href="#" className="hover:text-brand-400 transition-colors">Cookie Policy</a></li>
                  </ul>
              </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
              <p>© 2025 SocialAI Inc. All rights reserved.</p>
              <div className="flex gap-6 mt-4 md:mt-0">
                  <a href="#" className="hover:text-white transition-colors">Twitter</a>
                  <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
                  <a href="#" className="hover:text-white transition-colors">Instagram</a>
              </div>
          </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, action: string }> = ({ icon, title, description, action }) => (
    <div className="bg-white rounded-lg p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-4">{title}</h3>
        <p className="text-slate-600 text-sm leading-relaxed mb-6">{description}</p>
        <button className="mt-auto px-6 py-2 border border-brand-500 text-brand-600 font-medium rounded hover:bg-brand-50 transition-colors text-sm w-full">
            {action}
        </button>
    </div>
);