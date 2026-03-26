import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from "react-router-dom";

const TranscriptInputPage = () => {
  const [transcript, setTranscript] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();
  const { id: projectId } = useParams();

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  useEffect(() => {
    setCharCount(transcript.length);
  }, [transcript]);

  const handleTextChange = (e) => {
    setTranscript(e.target.value);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md'))) {
      readFile(file);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) readFile(file);
  };

  const readFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setTranscript(e.target.result);
      setUploadedFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    setTranscript('');
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!transcript.trim()) return;

    setIsSubmitting(true);

    try{
        const response = await fetch(
            `http://127.0.0.1:8000/api/projects/${projectId}/extract-requirements`,
            {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    transcript: transcript,
                }),
            }
        );
        const data = await response.json()
        console.log(data)

        if(!response.ok){
            throw new Error(data.detail || "Something went wrong");
        }

        setSubmitted(true)

        navigate(`/projects/${projectId}/requirements`,{
            state: {
                requirementId: data.requirement_id,
                version: data.version,
                approvalStatus: data.approval_status,
                groupedData: data.data
            }
        });
    }catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  return (
    <div
      style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif" }}
      className="min-h-screen bg-[#f5f4fc] dark:bg-[#0f0e1a]"
    >
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#c7c0f5]/30 blur-3xl" />
        <div className="absolute top-1/2 -right-20 w-72 h-72 rounded-full bg-[#a99df5]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-[#e0dcfc]/40 blur-3xl" />
      </div>

      <div className="relative z-10 px-4 sm:px-10 md:px-20 lg:px-40 flex justify-center py-8">
        <div className="flex flex-col w-full max-w-[960px] gap-8">

          {/* Header */}
          <div className="flex flex-col gap-2 text-center pt-4">
            <p className="text-[#100d1c] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
              Upload Transcript
            </p>
            <p className="text-[#57499c] dark:text-[#a99df5] text-base font-normal">
              Paste or upload a transcript to generate system requirements.
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white dark:bg-[#1a1830] rounded-2xl shadow-xl p-8 flex flex-col gap-8 border border-[#e9e7f4] dark:border-[#2e2a4a]">

            {/* Transcript Input Area */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#57499c] dark:text-[#a99df5]">
                  Transcript
                </label>
                {transcript && (
                  <div className="flex items-center gap-3 text-xs text-[#9b92c8]">
                    <span>{wordCount.toLocaleString()} words</span>
                    <span>·</span>
                    <span>{charCount.toLocaleString()} chars</span>
                    {uploadedFileName && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm leading-none">description</span>
                          {uploadedFileName}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Drag & drop / textarea zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-xl transition-all duration-200 ${
                  isDragging
                    ? 'ring-2 ring-[#7b6fd4] bg-[#edeaff] dark:bg-[#2a2650]'
                    : 'bg-[#f5f4fc] dark:bg-[#1e1c35]'
                } border-2 ${
                  isDragging
                    ? 'border-[#7b6fd4] border-dashed'
                    : 'border-[#ddd9f0] dark:border-[#312e55]'
                }`}
              >
                {isDragging && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-xl pointer-events-none">
                    <span className="material-symbols-outlined text-5xl text-[#7b6fd4]">upload_file</span>
                    <p className="text-[#7b6fd4] font-semibold mt-2">Drop your file here</p>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={transcript}
                  onChange={handleTextChange}
                  placeholder="Paste your transcript here, or drag & drop a .txt file above…"
                  rows={14}
                  className={`w-full resize-none bg-transparent px-5 py-4 text-[#100d1c] dark:text-white placeholder:text-[#b0a8d8] focus:outline-none text-sm leading-relaxed font-mono transition-opacity duration-200 ${
                    isDragging ? 'opacity-10' : 'opacity-100'
                  }`}
                />
              </div>
            </div>

            {/* Upload & Actions Row */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#ede9ff] dark:bg-[#2e2a4a] text-[#57499c] dark:text-[#c4bdf5] hover:bg-[#ddd9f7] dark:hover:bg-[#3a3565] transition font-semibold text-sm"
                >
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                  Upload .txt
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {transcript && (
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#fce9e9] dark:bg-[#3a1f1f] text-red-500 dark:text-red-400 hover:bg-[#fdd5d5] dark:hover:bg-[#4a2525] transition font-semibold text-sm"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Clear
                  </button>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!transcript.trim() || isSubmitting || submitted}
                className={`flex items-center gap-2 px-7 py-3 rounded-lg font-bold text-sm shadow-md transition-all duration-200 ${
                  transcript.trim() && !isSubmitting && !submitted
                    ? 'bg-[#6c5fc7] hover:bg-[#5a4fb5] text-white shadow-[#6c5fc7]/30 hover:shadow-lg'
                    : 'bg-[#d3cee8] dark:bg-[#312e55] text-[#9b92c8] cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Processing…
                  </>
                ) : submitted ? (
                  <>
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Submitted!
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                    Generate Requirements
                  </>
                )}
              </button>
            </div>

            {/* Stats bar */}
            {transcript && (
              <div className="rounded-xl bg-[#f0eeff] dark:bg-[#1e1c35] border border-[#ddd9f0] dark:border-[#2e2a4a] px-5 py-4 flex flex-wrap gap-6">
                {[
                  { icon: 'text_fields', label: 'Words', value: wordCount.toLocaleString() },
                  { icon: 'schedule', label: 'Est. read time', value: `~${Math.max(1, Math.round(wordCount / 200))} min` },
                  { icon: 'segment', label: 'Paragraphs', value: transcript.split(/\n\n+/).filter(Boolean).length },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#7b6fd4] text-xl">{icon}</span>
                    <div>
                      <p className="text-xs text-[#9b92c8] leading-none">{label}</p>
                      <p className="text-[#100d1c] dark:text-white font-bold text-sm mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: 'content_paste', title: 'Paste Text', desc: 'Copy your transcript directly into the text area above.' },
              { icon: 'upload_file', title: 'Upload File', desc: 'Drop a .txt file onto the text area or use the upload button.' },
              { icon: 'auto_awesome', title: 'Generate', desc: 'Click Generate Requirements to extract and analyze your transcript.' },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="bg-white dark:bg-[#1a1830] rounded-xl border border-[#e9e7f4] dark:border-[#2e2a4a] p-5 flex flex-col gap-2"
              >
                <span className="material-symbols-outlined text-2xl text-[#7b6fd4]">{icon}</span>
                <p className="font-bold text-[#100d1c] dark:text-white text-sm">{title}</p>
                <p className="text-[#57499c] dark:text-[#9b92c8] text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default TranscriptInputPage;