// import ReactMarkdown from "react-markdown";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function CheckoutSummary() {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { sessionId } = useParams(); // 👈 important

  // 🔥 Fetch first if not found, then Generate Summary
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);

        // 1️⃣ Try to get existing summary
        let res = await fetch(`http://localhost:8000/api/summary/${sessionId}`);

        if (res.ok) {
          const data = await res.json();
          if (data.summary) {
            setSummary(data.summary);
            setLoading(false);
            return;
          }
        }

        // 2️⃣ If not found → generate it
        res = await fetch(`http://localhost:8000/api/summarize/${sessionId}`, {
          method: "POST",
        });

        const data = await res.json();
        setSummary(data.summary);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [sessionId]);


  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#100d1c] dark:text-white min-h-screen flex flex-col items-center py-12 px-4 md:px-10 lg:px-20 xl:px-40">
      
      {/* Breadcrumb */}
      <div className="flex flex-col gap-6 text-center items-center mb-10">
        <div className="flex flex-wrap gap-2 text-sm w-full max-w-[1200px]">
            <button onClick={() => navigate("/projects")}
                className="text-primary-accent dark:text-secondary-accent font-medium">
                Projects
            </button>
            <span className="text-text-dark/50 dark:text-text-light/50">/</span>
            <button onClick={() => navigate(`/projects/1`)}
                className="text-primary-accent dark:text-secondary-accent font-medium">
                Project
            </button>
            <span className="text-text-dark/50 dark:text-text-light/50">/</span>
            <span className="text-text-dark dark:text-text-light font-medium">Summary</span>
        </div>

        <div className="flex flex-col gap-3 items-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black">
            Brainstorming Session Summary
          </h1>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white dark:bg-[#1a1728] rounded-2xl p-8 md:p-12 shadow-lg border border-[#e9e7f4] dark:border-white/5 relative overflow-hidden group w-full max-w-[800px]">

        <div className="absolute -top-6 -right-6 opacity-[0.03] pointer-events-none">
          <span className="material-symbols-outlined text-[200px] text-primary">
            format_quote
          </span>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          
          <div className="flex items-center gap-4 border-b border-[#e9e7f4] dark:border-white/10 pb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[24px]">
                auto_awesome
              </span>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">
                Executive Summary
              </h2>
              <p className="text-sm text-gray-500">
                Key takeaways and action items
              </p>
            </div>
          </div>

          {/* 🔥 Dynamic Content */}
          <div className="prose prose-lg max-w-none leading-relaxed">

            {loading ? (
              <p>Generating summary...</p>
            ) : summary ? (
              <div className="whitespace-pre-line">
                {summary}
              </div>
            ) : (
              <p>No summary available.</p>
            )}

          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-6">
        
        <button 
          onClick={() => navigate(`/transcript/${sessionId}`)}
          className="group flex items-center gap-2 text-sm font-semibold text-[#57499c]"
        >
          <div className="p-2 rounded-full group-hover:bg-[#e9e7f4]">
            <span className="material-symbols-outlined text-[20px]">
              description
            </span>
          </div>
          View Full Transcript
        </button>

      </div>
    </div>
  );
}
