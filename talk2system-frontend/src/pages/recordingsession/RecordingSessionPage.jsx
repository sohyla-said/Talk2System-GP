// import React, { useState, useRef, useEffect } from "react";
// import { useNavigate, useParams,useLocation } from "react-router-dom";

// export default function RecordingSessionPage() {
//   const [isRecording, setIsRecording] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [hours, setHours] = useState(0);
//   const [minutes, setMinutes] = useState(0);
//   const [seconds, setSeconds] = useState(0);

//   const mediaRecorderRef = useRef(null);
//   const audioChunksRef = useRef([]);
//   const fileInputRef = useRef(null);

//   const navigate = useNavigate();
//   const { id: projectId } = useParams();
//   const location = useLocation();
//   const sessionTitle = location.state?.sessionTitle || "Untitled Session";
//   // ========================
//   // ⏱ TIMER
//   // ========================
//   useEffect(() => {
//     let interval = null;
//     if (isRecording) {
//       interval = setInterval(() => {
//         setSeconds((s) => {
//           if (s === 59) {
//             setMinutes((m) => {
//               if (m === 59) {
//                 setHours((h) => h + 1);
//                 return 0;
//               }
//               return m + 1;
//             });
//             return 0;
//           }
//           return s + 1;
//         });
//       }, 1000);
//     } else {
//       clearInterval(interval);
//     }
//     return () => clearInterval(interval);
//   }, [isRecording]);

//   const handleReset = () => {
//     setIsRecording(false);
//     setHours(0);
//     setMinutes(0);
//     setSeconds(0);
//   };

//   const progress = isRecording
//     ? Math.min((seconds + minutes * 60 + hours * 3600) / 36, 100)
//     : 0;

//   // ========================
//   // 🎤 RECORDING
//   // ========================
//   const startRecording = async () => {
//     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//     const mediaRecorder = new MediaRecorder(stream);
//     audioChunksRef.current = [];

//     mediaRecorder.ondataavailable = (e) => {
//       audioChunksRef.current.push(e.data);
//     };

//     mediaRecorder.onstop = handleStop;
//     mediaRecorder.start();
//     mediaRecorderRef.current = mediaRecorder;
//     setIsRecording(true);
//   };

//   const stopRecording = () => {
//     const confirmed = window.confirm(
//       "Are you sure you want to stop recording and proceed to the transcript page?"
//     );
//     if (confirmed) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
//     }
//   };

//   const handleStop = async () => {
//     const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
//     uploadAudio(audioBlob);
//   };

//   // ========================
//   // 📤 UPLOAD FUNCTION (shared)
//   // ========================
//   const uploadAudio = async (audioBlobOrFile) => {
//     try {
//       setLoading(true);
//       const formData = new FormData();

//       if (audioBlobOrFile instanceof File) {
//         formData.append("file", audioBlobOrFile);
//         formData.append("title", sessionTitle);
//       } else {
//         formData.append("file", audioBlobOrFile, "recording.webm");
//         formData.append("title", sessionTitle);
//       }

//       const res = await fetch(`http://localhost:8000/api/projects/${projectId}/transcribe`, {
//         method: "POST",
//         body: formData,
//       });

//       if (!res.ok) throw new Error("Upload failed");

//       const data = await res.json();
//       navigate(`/transcript/${data.session_id}`);
//     } catch (err) {
//       console.error(err);
//       alert("Upload failed")
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ========================
//   // 📁 FILE UPLOAD HANDLER
//   // ========================
//   const handleFileUpload = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     uploadAudio(file);
//   };

//   return (
//     <div className="w-full flex flex-col min-h-screen">
//       <div className="flex flex-1 justify-center px-4 sm:px-10 md:px-20 lg:px-40 py-5">
//         <div className="layout-content-container flex flex-col w-full max-w-[960px]">
//           <main className="flex flex-col items-center py-10 px-4">
//             {/* Page Header */}
//             <div className="flex flex-wrap justify-between gap-3 p-4 w-full">
//               <div className="flex w-full flex-col gap-3 text-center">
//                 <p className="text-[#100d1c] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
//                   Start a New Session
//                 </p>
//                 <p className="text-[#57499c] dark:text-gray-400 text-base font-normal leading-normal">
//                   Choose an option below to start generating system requirements.
//                 </p>
//               </div>
//             </div>

//             <div className="w-full max-w-2xl bg-white dark:bg-background-dark/50 rounded-xl shadow-lg p-8 mt-6 space-y-8">
//               {/* Session Name */}
//               <div className="text-center">
//                 <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
//                   SESSION NAME
//                 </p>
//                 <h3 className="text-xl font-bold text-[#100d1c] dark:text-white mt-1">
//                   {/* My Brainstorming Session -{" "}
//                   {new Date().toLocaleDateString("en-US", {
//                     month: "short",
//                     day: "numeric",
//                     year: "numeric",
//                   })} */}
//                   {sessionTitle}

//                 </h3>
//               </div>

//               {/* Audio Waveform Visualization */}
//               <div className="flex w-full h-32 items-center justify-center">
//                 <img
//                   alt="Audio waveform visualization"
//                   className="w-full h-auto object-contain"
//                   src="https://lh3.googleusercontent.com/aida-public/AB6AXuBazhg5tKg4U9XbHXb_DaMNFbL9xob4H_GuNLPe1qoWWwR5c7rBTGwjYcwRepG4ei080_Y4tcFl5oPF0iqAv8KCJpsF3ZjOxoj8az-MmWSbAm7QtJUp60_c9mkXWoP3QAkmEMJSCiKho7BkL-5lxJaUp1JWUoKcSGwjAcwdNE5gDxK7UzTjnLi6t_Ss0bDuG8f_pXq0iHB16-l9Et3CxdZOc_uiP0x8WdJSS5G295u-_ymf7jN8foRzuQD_QP3jarGdeu3hG5Tb8TFo"
//                 />
//               </div>

//               {/* Timer Display */}
//               <div className="flex gap-4">
//                 {[
//                   { value: hours, label: "Hours" },
//                   { value: minutes, label: "Minutes" },
//                   { value: seconds, label: "Seconds" },
//                 ].map(({ value, label }) => (
//                   <div key={label} className="flex grow basis-0 flex-col items-stretch gap-2">
//                     <div className="flex h-16 grow items-center justify-center rounded-lg px-3 bg-[#e9e7f4] dark:bg-primary/20">
//                       <p className="text-[#100d1c] dark:text-white text-3xl font-bold leading-tight tracking-[-0.015em]">
//                         {String(value).padStart(2, "0")}
//                       </p>
//                     </div>
//                     <div className="flex items-center justify-center">
//                       <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">
//                         {label}
//                       </p>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               {/* Action Buttons */}
//               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
//                 {/* Record Audio */}
//                 <button
//                   onClick={isRecording ? stopRecording : startRecording}
//                   disabled={loading}
//                   className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg shadow-lg transition-colors duration-200 h-28 ${
//                     isRecording
//                       ? "bg-red-500 text-white hover:bg-red-600"
//                       : loading
//                       ? "bg-gray-400 cursor-not-allowed text-white"
//                       : "bg-primary text-white hover:bg-primary/90"
//                   }`}
//                 >
//                   <span className="material-symbols-outlined text-3xl">
//                     {isRecording ? "stop" : "mic"}
//                   </span>
//                   <span className="font-semibold text-sm">
//                     {isRecording ? "Stop Recording" : "Record Audio"}
//                   </span>
//                 </button>

//                 {/* Upload Audio */}
//                 <button
//                   onClick={() => fileInputRef.current?.click()}
//                   disabled={isRecording || loading}
//                   className="flex flex-col items-center justify-center gap-2 p-4 bg-[#e9e7f4] dark:bg-primary/20 text-primary dark:text-indigo-300 rounded-lg hover:bg-[#dcd9f0] dark:hover:bg-primary/30 transition-colors duration-200 h-28 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <span className="material-symbols-outlined text-3xl">upload_file</span>
//                   <span className="font-semibold text-sm">Upload Audio</span>
//                 </button>
//                 <input
//                   ref={fileInputRef}
//                   type="file"
//                   accept="audio/*"
//                   onChange={handleFileUpload}
//                   className="hidden"
//                 />

//                 {/* Upload Transcript */}
//                 <button
//                   onClick={() => navigate(`/projects/${projectId}/transcript-input`, { state: { sessionTitle } })}
//                   disabled={isRecording || loading}
//                   className="flex flex-col items-center justify-center gap-2 p-4 bg-[#e9e7f4] dark:bg-primary/20 text-primary dark:text-indigo-300 rounded-lg hover:bg-[#dcd9f0] dark:hover:bg-primary/30 transition-colors duration-200 h-28 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <span className="material-symbols-outlined text-3xl">description</span>
//                   <span className="font-semibold text-sm">Upload Transcript</span>
//                 </button>
//               </div>

//               {/* Processing indicator */}
//               {loading && (
//                 <div className="flex items-center justify-center gap-3 py-2 text-primary dark:text-indigo-300">
//                   <svg
//                     className="animate-spin h-5 w-5"
//                     xmlns="http://www.w3.org/2000/svg"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                   >
//                     <circle
//                       className="opacity-25"
//                       cx="12"
//                       cy="12"
//                       r="10"
//                       stroke="currentColor"
//                       strokeWidth="4"
//                     />
//                     <path
//                       className="opacity-75"
//                       fill="currentColor"
//                       d="M4 12a8 8 0 018-8v8H4z"
//                     />
//                   </svg>
//                   <span className="font-medium text-sm">Processing audio...</span>
//                 </div>
//               )}

//               {/* Reset button (only while recording) */}
//               {isRecording && (
//                 <div className="flex gap-4 justify-center">
//                   <button
//                     onClick={handleReset}
//                     className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
//                   >
//                     <span className="material-symbols-outlined">restart_alt</span>
//                     <span className="font-semibold">Reset</span>
//                   </button>
//                 </div>
//               )}

//               {/* Session Timeline */}
//               <div className="flex flex-col gap-3 p-4">
//                 <div className="flex gap-6 justify-between">
//                   <p className="text-[#100d1c] dark:text-white text-base font-medium leading-normal">
//                     Session Timeline
//                   </p>
//                 </div>
//                 <div className="rounded-full bg-[#d3cee8] dark:bg-gray-700 h-2">
//                   <div
//                     className="h-2 rounded-full bg-primary transition-all duration-1000"
//                     style={{ width: `${progress}%` }}
//                   />
//                 </div>
//                 <p className="text-[#57499c] dark:text-gray-400 text-sm font-normal leading-normal">
//                   {isRecording ? "Recording in progress..." : "Ready to record"}
//                 </p>
//               </div>
//             </div>
//           </main>
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams,useLocation } from "react-router-dom";

export default function RecordingSessionPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const location = useLocation();
  const sessionTitle = location.state?.sessionTitle || "Untitled Session";
  // ========================
  // ⏱ TIMER
  // ========================
  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds((s) => {
          if (s === 59) {
            setMinutes((m) => {
              if (m === 59) {
                setHours((h) => h + 1);
                return 0;
              }
              return m + 1;
            });
            return 0;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleReset = () => {
    setIsRecording(false);
    setHours(0);
    setMinutes(0);
    setSeconds(0);
  };

  const progress = isRecording
    ? Math.min((seconds + minutes * 60 + hours * 3600) / 36, 100)
    : 0;

  // ========================
  // 🎤 RECORDING
  // ========================
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = handleStop;
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    const confirmed = window.confirm(
      "Are you sure you want to stop recording and proceed to the transcript page?"
    );
    if (confirmed) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleStop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    uploadAudio(audioBlob);
  };

  // ========================
  // 📤 UPLOAD FUNCTION (shared)
  // ========================
  const uploadAudio = async (audioBlobOrFile) => {
    try {
      setLoading(true);
      const formData = new FormData();

      if (audioBlobOrFile instanceof File) {
        formData.append("file", audioBlobOrFile);
        formData.append("title", sessionTitle);
      } else {
        formData.append("file", audioBlobOrFile, "recording.webm");
        formData.append("title", sessionTitle);
      }

      const res = await fetch(`http://localhost:8000/api/projects/${projectId}/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      navigate(`/transcript/${data.session_id}`);
    } catch (err) {
      console.error(err);
      alert("Upload failed")
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // 📁 FILE UPLOAD HANDLER
  // ========================
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadAudio(file);
  };

  return (
    <div className="w-full flex flex-col min-h-screen">
      <div className="flex flex-1 justify-center px-4 sm:px-10 md:px-20 lg:px-40 py-5">
        <div className="layout-content-container flex flex-col w-full max-w-[960px]">
          <main className="flex flex-col items-center py-10 px-4">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between gap-3 p-4 w-full">
              <div className="flex w-full flex-col gap-3 text-center">
                <p className="text-[#100d1c] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                  Start a New Session
                </p>
                <p className="text-[#57499c] dark:text-gray-400 text-base font-normal leading-normal">
                  Choose an option below to start generating system requirements.
                </p>
              </div>
            </div>

            <div className="w-full max-w-2xl bg-white dark:bg-background-dark/50 rounded-xl shadow-lg p-8 mt-6 space-y-8">
              {/* Session Name */}
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  SESSION NAME
                </p>
                <h3 className="text-xl font-bold text-[#100d1c] dark:text-white mt-1">
                  {/* My Brainstorming Session -{" "}
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })} */}
                  {sessionTitle}

                </h3>
              </div>

              {/* Audio Waveform Visualization */}
              <div className="flex w-full h-32 items-center justify-center">
                <img
                  alt="Audio waveform visualization"
                  className="w-full h-auto object-contain"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBazhg5tKg4U9XbHXb_DaMNFbL9xob4H_GuNLPe1qoWWwR5c7rBTGwjYcwRepG4ei080_Y4tcFl5oPF0iqAv8KCJpsF3ZjOxoj8az-MmWSbAm7QtJUp60_c9mkXWoP3QAkmEMJSCiKho7BkL-5lxJaUp1JWUoKcSGwjAcwdNE5gDxK7UzTjnLi6t_Ss0bDuG8f_pXq0iHB16-l9Et3CxdZOc_uiP0x8WdJSS5G295u-_ymf7jN8foRzuQD_QP3jarGdeu3hG5Tb8TFo"
                />
              </div>

              {/* Timer Display */}
              <div className="flex gap-4">
                {[
                  { value: hours, label: "Hours" },
                  { value: minutes, label: "Minutes" },
                  { value: seconds, label: "Seconds" },
                ].map(({ value, label }) => (
                  <div key={label} className="flex grow basis-0 flex-col items-stretch gap-2">
                    <div className="flex h-16 grow items-center justify-center rounded-lg px-3 bg-[#e9e7f4] dark:bg-primary/20">
                      <p className="text-[#100d1c] dark:text-white text-3xl font-bold leading-tight tracking-[-0.015em]">
                        {String(value).padStart(2, "0")}
                      </p>
                    </div>
                    <div className="flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">
                        {label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                {/* Record Audio */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg shadow-lg transition-colors duration-200 h-28 ${
                    isRecording
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : loading
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">
                    {isRecording ? "stop" : "mic"}
                  </span>
                  <span className="font-semibold text-sm">
                    {isRecording ? "Stop Recording" : "Record Audio"}
                  </span>
                </button>

                {/* Upload Audio */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRecording || loading}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-[#e9e7f4] dark:bg-primary/20 text-primary dark:text-indigo-300 rounded-lg hover:bg-[#dcd9f0] dark:hover:bg-primary/30 transition-colors duration-200 h-28 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-3xl">upload_file</span>
                  <span className="font-semibold text-sm">Upload Audio</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Upload Transcript */}
                <button
                  onClick={() => navigate(`/projects/${projectId}/transcript-input`, { state: { sessionTitle } })}
                  disabled={isRecording || loading}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-[#e9e7f4] dark:bg-primary/20 text-primary dark:text-indigo-300 rounded-lg hover:bg-[#dcd9f0] dark:hover:bg-primary/30 transition-colors duration-200 h-28 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-3xl">description</span>
                  <span className="font-semibold text-sm">Upload Transcript</span>
                </button>
              </div>

              {/* Processing indicator */}
              {loading && (
                <div className="flex items-center justify-center gap-3 py-2 text-primary dark:text-indigo-300">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span className="font-medium text-sm">Processing audio...</span>
                </div>
              )}

              {/* Reset button (only while recording) */}
              {isRecording && (
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <span className="material-symbols-outlined">restart_alt</span>
                    <span className="font-semibold">Reset</span>
                  </button>
                </div>
              )}

              {/* Session Timeline */}
              <div className="flex flex-col gap-3 p-4">
                <div className="flex gap-6 justify-between">
                  <p className="text-[#100d1c] dark:text-white text-base font-medium leading-normal">
                    Session Timeline
                  </p>
                </div>
                <div className="rounded-full bg-[#d3cee8] dark:bg-gray-700 h-2">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[#57499c] dark:text-gray-400 text-sm font-normal leading-normal">
                  {isRecording ? "Recording in progress..." : "Ready to record"}
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
