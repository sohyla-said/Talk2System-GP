import React, { useState, useEffect } from 'react';

const RecordingSessionPage = () => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds(seconds => {
          if (seconds === 59) {
            setMinutes(minutes => {
              if (minutes === 59) {
                setHours(hours => hours + 1);
                return 0;
              }
              return minutes + 1;
            });
            return 0;
          }
          return seconds + 1;
        });
      }, 1000);
    } else if (!isRecording && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording, seconds]);

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleReset = () => {
    setIsRecording(false);
    setHours(0);
    setMinutes(0);
    setSeconds(0);
  };

  const progress = isRecording ? Math.min((seconds + minutes * 60 + hours * 3600) / 36, 100) : 0;

  return (
    <div className="w-full">
      <div className="px-4 sm:px-10 md:px-20 lg:px-40 flex flex-1 justify-center py-5">
        <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
          <main className="flex flex-col items-center py-10 px-4">
            <div className="flex flex-wrap justify-between gap-3 p-4 w-full">
              <div className="flex w-full flex-col gap-3 text-center">
                <p className="text-[#100d1c] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">Start a New Session</p>
                <p className="text-[#57499c] dark:text-gray-400 text-base font-normal leading-normal">Choose an option below to start generating system requirements.</p>
              </div>
            </div>

            <div className="w-full max-w-2xl bg-white dark:bg-background-dark/50 rounded-xl shadow-lg p-8 mt-6 space-y-8">
              {/* Session Name */}
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SESSION NAME</p>
                <h3 className="text-xl font-bold text-[#100d1c] dark:text-white mt-1">My Brainstorming Session - Oct 26, 2023</h3>
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
                <div className="flex grow basis-0 flex-col items-stretch gap-2">
                  <div className="flex h-16 grow items-center justify-center rounded-lg px-3 bg-[#e9e7f4] dark:bg-primary/20">
                    <p className="text-[#100d1c] dark:text-white text-3xl font-bold leading-tight tracking-[-0.015em]">
                      {String(hours).padStart(2, '0')}
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">Hours</p>
                  </div>
                </div>
                <div className="flex grow basis-0 flex-col items-stretch gap-2">
                  <div className="flex h-16 grow items-center justify-center rounded-lg px-3 bg-[#e9e7f4] dark:bg-primary/20">
                    <p className="text-[#100d1c] dark:text-white text-3xl font-bold leading-tight tracking-[-0.015em]">
                      {String(minutes).padStart(2, '0')}
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">Minutes</p>
                  </div>
                </div>
                <div className="flex grow basis-0 flex-col items-stretch gap-2">
                  <div className="flex h-16 grow items-center justify-center rounded-lg px-3 bg-[#e9e7f4] dark:bg-primary/20">
                    <p className="text-[#100d1c] dark:text-white text-3xl font-bold leading-tight tracking-[-0.015em]">
                      {String(seconds).padStart(2, '0')}
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">Seconds</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <button 
                  onClick={handleStartRecording}
                  disabled={isRecording}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg shadow-lg transition-colors duration-200 h-28 ${
                    isRecording 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">mic</span>
                  <span className="font-semibold text-sm">Record Audio</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 p-4 bg-[#e9e7f4] dark:bg-primary/20 text-primary dark:text-indigo-300 rounded-lg hover:bg-[#dcd9f0] dark:hover:bg-primary/30 transition-colors duration-200 h-28">
                  <span className="material-symbols-outlined text-3xl">upload_file</span>
                  <span className="font-semibold text-sm">Upload Audio</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 p-4 bg-[#e9e7f4] dark:bg-primary/20 text-primary dark:text-indigo-300 rounded-lg hover:bg-[#dcd9f0] dark:hover:bg-primary/30 transition-colors duration-200 h-28">
                  <span className="material-symbols-outlined text-3xl">description</span>
                  <span className="font-semibold text-sm">Upload Transcript</span>
                </button>
              </div>

              {/* Control Buttons (Stop/Reset) */}
              {isRecording && (
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={handleStopRecording}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <span className="material-symbols-outlined">stop</span>
                    <span className="font-semibold">Stop Recording</span>
                  </button>
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
                  <p className="text-[#100d1c] dark:text-white text-base font-medium leading-normal">Session Timeline</p>
                </div>
                <div className="rounded-full bg-[#d3cee8] dark:bg-gray-700 h-2">
                  <div 
                    className="h-2 rounded-full bg-primary transition-all duration-1000" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-[#57499c] dark:text-gray-400 text-sm font-normal leading-normal">
                  {isRecording ? 'Recording in progress...' : 'Ready to record'}
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default RecordingSessionPage;