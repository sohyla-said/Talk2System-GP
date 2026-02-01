import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen font-display bg-background-light dark:bg-background-dark">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-blue-500/5 dark:from-primary/10 dark:via-purple-500/10 dark:to-blue-500/10"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="text-center space-y-8">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 dark:bg-primary/20 rounded-full border border-primary/20 dark:border-primary/30">
              <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
              <span className="text-sm font-bold text-primary">Transform Conversations into Documentation</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
              Talk2System
            </h1>
            
            {/* Subheading */}
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              AI-powered requirements engineering that converts your conversations into professional software artifacts
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                to="/login"
                className="group flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
              >
                Get Started
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
              
              <Link
                to="/projects"
                className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold text-lg transition-all shadow-md border border-gray-200 dark:border-gray-700"
              >
                View Projects
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            From recording to delivery, we've got you covered
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Feature Card 1 - Recording */}
          <Link
            to="/transcript"
            className="group bg-white dark:bg-[#1C192B] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-primary/30 dark:hover:border-primary/30 transition-all"
          >
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl inline-flex mb-6">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[32px]">mic</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Record Meeting Sessions
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Capture stakeholder conversations with crystal-clear audio transcription powered by AI
            </p>
          </Link>

          {/* Feature Card 2 - Requirements */}
          <Link
            to="/requirements"
            className="group bg-white dark:bg-[#1C192B] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-primary/30 dark:hover:border-primary/30 transition-all"
          >
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl inline-flex mb-6">
              <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[32px]">checklist</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Smart Requirements
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Automatically extract and organize functional and non-functional requirements
            </p>
          </Link>

          {/* Feature Card 3 - SRS */}
          <Link
            to="/artifacts/srs"
            className="group bg-white dark:bg-[#1C192B] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-primary/30 dark:hover:border-primary/30 transition-all"
          >
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl inline-flex mb-6">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[32px]">description</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              SRS Documents
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Generate IEEE-standard Software Requirements Specifications automatically
            </p>
          </Link>

          {/* Feature Card 4 - UML */}
          <Link
            to="/artifacts/uml"
            className="group bg-white dark:bg-[#1C192B] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-primary/30 dark:hover:border-primary/30 transition-all"
          >
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl inline-flex mb-6">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[32px]">account_tree</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              UML Diagrams
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Create use case, class, and sequence diagrams from your requirements
            </p>
          </Link>

          {/* Feature Card 5 - Projects */}
          <Link
            to="/projects"
            className="group bg-white dark:bg-[#1C192B] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-primary/30 dark:hover:border-primary/30 transition-all"
          >
            <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-xl inline-flex mb-6">
              <span className="material-symbols-outlined text-pink-600 dark:text-pink-400 text-[32px]">folder_open</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Project Management
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Organize multiple projects with version control and team collaboration
            </p>
          </Link>

          {/* Feature Card 6 - Dashboard */}
          <Link
            to="/dashboard"
            className="group bg-white dark:bg-[#1C192B] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-primary/30 dark:hover:border-primary/30 transition-all"
          >
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl inline-flex mb-6">
              <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[32px]">dashboard</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Analytics Dashboard
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Track progress, monitor statistics, and visualize project insights
            </p>
          </Link>

        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-br from-primary via-primary to-purple-600 dark:from-primary/90 dark:via-primary/90 dark:to-purple-600/90">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center text-white">
            
            <div className="space-y-2">
              <div className="text-5xl font-black">10x</div>
              <div className="text-lg font-medium opacity-90">Faster Documentation</div>
            </div>

            <div className="space-y-2">
              <div className="text-5xl font-black">98%</div>
              <div className="text-lg font-medium opacity-90">Accuracy Rate</div>
            </div>

            <div className="space-y-2">
              <div className="text-5xl font-black">500+</div>
              <div className="text-lg font-medium opacity-90">Hours Saved</div>
            </div>

          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-12 md:p-16 text-center border border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-6">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Join teams who are already saving hundreds of hours on requirements documentation
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
          >
            Start Your First Project
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
