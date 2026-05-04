import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getToken } from "../../api/authApi";

export default function RequirementsChoicePage() {
	const navigate = useNavigate();
	const location = useLocation();
	const { sessionId } = useParams();

	const [extractionState, setExtractionState] = useState(() => location.state || {});
	const [submittingType, setSubmittingType] = useState(null);
	const [regeneratingType, setRegeneratingType] = useState(null);
	const [sessionName, setSessionName] = useState(null);

	const {
		projectId,
		transcriptText,
		commonData,
		common_data,
		hybridRunId,
		hybridData,
		hybridOnlyData,
		Hybrid_only_data,
		Hybird_only_data,
		llmRunId,
		llmData,
		llmOnlyData,
		LLM_only_data,
	} = extractionState;

	const hasLLMResults = !!llmData;
	const hasHybridResults = !!hybridData;

	const normalizedLlm = useMemo(() => normalizeGrouped(llmData), [llmData]);
	const normalizedHybrid = useMemo(() => normalizeGrouped(hybridData), [hybridData]);
	const normalizedCommon = useMemo(() => normalizeGrouped(commonData || common_data), [commonData, common_data]);
	const normalizedLlmDiff = useMemo(() => normalizeGrouped(llmOnlyData || LLM_only_data), [llmOnlyData, LLM_only_data]);
	const normalizedHybridDiff = useMemo(
		() => normalizeGrouped(hybridOnlyData || Hybrid_only_data || Hybird_only_data),
		[hybridOnlyData, Hybrid_only_data, Hybird_only_data]
	);

	const summary = useMemo(() => {
		const commonCount = normalizedCommon.functional_requirements.length + normalizedCommon.nonfunctional_requirements.length;
		const hybridOnlyCount = normalizedHybridDiff.functional_requirements.length + normalizedHybridDiff.nonfunctional_requirements.length;
		const llmOnlyCount = normalizedLlmDiff.functional_requirements.length + normalizedLlmDiff.nonfunctional_requirements.length;
		const unionCount = commonCount + hybridOnlyCount + llmOnlyCount;
		const overlapPercent = unionCount > 0 ? Math.round((commonCount / unionCount) * 100) : 0;

		return {
			commonCount,
			hybridOnlyCount,
			llmOnlyCount,
			overlapPercent
		};
	}, [normalizedCommon, normalizedHybridDiff, normalizedLlmDiff]);

	useEffect(() => {
		setExtractionState(location.state || {});
	}, [location.state]);

	useEffect(() => {
		fetchSessionMeta();
	  }, [sessionId]);

	const fetchSessionMeta = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/sessions/${sessionId}`, {
	  headers: { Authorization: `Bearer ${getToken()}` } 
      });
      const data = await response.json();
        if (!response.ok) {
         throw new Error(data.detail || "Failed to load session data");
       }
      setSessionName(data.title ?? null);
		setExtractionState((prev) => ({
			...prev,
			transcriptText: prev.transcriptText || data.transcript_text || ""
		}));
    } catch (err) {
      console.error(err);
    }
  };

	const formatTranscriptForBackend = (segments) => {
	return segments
		.filter((item) => (item.name || item.speaker) && item.text)
		.map((item) => {
		const spk = (item.name || item.speaker || "").trim();
		return `${spk}: "${item.text.trim()}"`;
		})
		.join("\n");
	};

	const fetchTranscriptText = async () => {
	// 1. If the transcript text was passed in via navigation state, use it —
	//    it was already the translated version when TranscriptPage sent it.
	if (transcriptText && transcriptText.trim()) {
		return transcriptText;
	}

	// 2. Check whether a translation exists for this session.
	try {
		const translationRes = await fetch(
		`http://127.0.0.1:8000/api/sessions/${sessionId}/translation`,
		{ headers: { Authorization: `Bearer ${getToken()}` } }
		);
		if (translationRes.ok) {
		const translationData = await translationRes.json();
		if (
			translationData &&
			!translationData.is_english &&
			Array.isArray(translationData.translated_segments) &&
			translationData.translated_segments.length > 0
		) {
			// Use the translated segments — same format as the original extraction
			return translationData.translated_segments
			.filter((s) => s.text?.trim())
			.map((s) => {
				const spk = (s.speaker || s.name || "").trim();
				return spk ? `${spk}: "${s.text.trim()}"` : `"${s.text.trim()}"`;
			})
			.join("\n");
		}
		}
	} catch {
		// Translation fetch failed — fall through to original transcript below
	}

	// 3. Fall back to original transcript (English sessions or translation unavailable)
	const response = await fetch(
		`http://127.0.0.1:8000/api/sessions/${sessionId}/transcript`,
		{ headers: { Authorization: `Bearer ${getToken()}` } }
	);
	const data = await response.json();
	if (!response.ok) {
		throw new Error(data.detail || "Failed to load transcript");
	}
	const segments = Array.isArray(data.transcript) ? data.transcript : [];
	return formatTranscriptForBackend(segments);
	}

	const mergeExtractionResponse = (engine, responseData) => {
		setExtractionState((prev) => {
			const next = { ...prev };

			if (engine === "llm") {
				next.llmRunId = responseData.LLM_run_id ?? prev.llmRunId;
				next.llmData = responseData.LLM_data ?? prev.llmData;
				next.llmOnlyData = responseData.LLM_only_data ?? prev.llmOnlyData;
			} else {
				next.hybridRunId = responseData.Hybrid_run_id ?? prev.hybridRunId;
				next.hybridData = responseData.Hybrid_data ?? prev.hybridData;
				next.hybridOnlyData = responseData.Hybrid_only_data ?? prev.hybridOnlyData;
			}

			const currentLlm = normalizeGrouped(next.llmData || next.LLM_data);
			const currentHybrid = normalizeGrouped(next.hybridData || next.Hybrid_data);
			const comparison = compareGroupedRequirements(currentHybrid, currentLlm);

			next.commonData = comparison.commonData;
			next.common_data = comparison.commonData;
			next.llmOnlyData = comparison.llmOnlyData;
			next.LLM_only_data = comparison.llmOnlyData;
			next.hybridOnlyData = comparison.hybridOnlyData;
			next.Hybird_only_data = comparison.hybridOnlyData;
			next.Hybrid_only_data = comparison.hybridOnlyData;

			return next;
		});
	};

	const handlePrefer = async (type) => {
		const selectedData = type === "llm" ? normalizedLlm : normalizedHybrid;
		const srcRunId = type === "llm" ? llmRunId : hybridRunId;

		if (!projectId || !sessionId || !srcRunId) {
			alert("Missing project/session/run information. Please extract requirements again.");
			return;
		}

		setSubmittingType(type);

		try {
			const response = await fetch(
				`http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/choose-requirements`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${getToken()}`
					},
					body: JSON.stringify({
						requirements_json: selectedData,
						src_run_id: srcRunId
					})
				}
			);

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.detail || "Failed to save preferred requirements");
			}

			navigate(`/transcript/${sessionId}/requirements`, {
				state: {
                    projectId,
					requirementId: data.session_req_id,
					groupedData: selectedData,
					preferredType: data.preferred_type
				}
			});
		} catch (error) {
			console.error(error);
			alert(error.message);
		} finally {
			setSubmittingType(null);
		}
	};

	const handleRegenerate = async (engine) => {
		if (!projectId || !sessionId) {
			alert("Missing project/session information. Please try again.");
			return;
		}

		setRegeneratingType(engine);
		try {
			const transcriptText = await fetchTranscriptText();
			const response = await fetch(
				`http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/extract-requirements`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${getToken()}`
					},
					body: JSON.stringify({
						transcript: transcriptText,
						engine
					})
				}
			);

			const data = await response.json();
			if (!response.ok) {
				throw new Error(
					typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)
				);
			}

			mergeExtractionResponse(engine, data);
		} catch (error) {
			console.error(error);
			alert(error.message);
		} finally {
			setRegeneratingType(null);
		}
	};

	if (!projectId || !sessionId || (!llmData && !hybridData)) {
		return (
			<div className="px-4 pb-4">
            <div className="rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined">info</span>
              </div>
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-2">No requirements extracted yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                This session does not have extracted requirements yet. Go to the transcript page to extract and review requirements first.
              </p>
              <button
                onClick={() => navigate(`/transcript/${sessionId}`)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-bold text-white transition-colors hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-lg">description</span>
                Go To Transcript
              </button>
            </div>
          </div>
		);
	}

	return (
		<div className="w-full max-w-7xl mx-auto p-4 space-y-4">
			<div className="rounded-xl border border-[#d3cee8]/50 bg-white dark:bg-background-dark p-5">
				<h1 className="text-slate-900 dark:text-white text-3xl font-black leading-tight tracking-[-0.02em]">
					{sessionName} - Choose Preferred Extraction
				</h1>
				<p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
					Compare LLM and Hybrid outputs, then choose the result you want to continue with.
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
				<SummaryCard label="Common FR/NFR" value={summary.commonCount} tone="blue" />
				<SummaryCard label="Hybrid-only FR/NFR" value={summary.hybridOnlyCount} tone="green" />
				<SummaryCard label="LLM-only FR/NFR" value={summary.llmOnlyCount} tone="purple" />
				<SummaryCard label="Overlap" value={`${summary.overlapPercent}%`} tone="amber" />
			</div>

			<CommonPane grouped={normalizedCommon} />

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
				{hasLLMResults ? (
					<ResultPane
						title="LLM Differences"
						subtitle="Requirements found by LLM but not in Hybrid."
						grouped={normalizedLlm}
						diffGrouped={normalizedLlmDiff}
						accent="purple"
						buttonLabel="I prefer this"
						isLoading={submittingType === "llm"}
						onPrefer={() => handlePrefer("llm")}
					/>
				) : (
					<div className="px-4 pb-4">
						<div className="rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark p-8 text-center">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
							<span className="material-symbols-outlined">info</span>
						</div>
						<h3 className="text-slate-900 dark:text-white text-xl font-bold mb-2">No requirements extracted yet</h3>
						<p className="text-slate-500 dark:text-slate-400 mb-4">
							LLM requirement extraction failed.
						</p>
						<button
							onClick={() => handleRegenerate("llm")}
							disabled={regeneratingType === "llm"}
							className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
						>
							<span className="material-symbols-outlined text-lg">refresh</span>
							{regeneratingType === "llm" ? "Regenerating..." : "Regenerate with LLM"}
						</button>
						</div>
					</div>
				)}
				

				{hasHybridResults ? (
					<ResultPane
						title="Hybrid Differences"
						subtitle="Requirements found by Hybrid but not in LLM."
						grouped={normalizedHybrid}
						diffGrouped={normalizedHybridDiff}
						accent="purple"
						buttonLabel="I prefer this"
						isLoading={submittingType === "hybrid"}
						onPrefer={() => handlePrefer("hybrid")}
					/>
				) : (
					<div className="px-4 pb-4">
						<div className="rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark p-8 text-center">
							<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
								<span className="material-symbols-outlined">info</span>
							</div>
							<h3 className="text-slate-900 dark:text-white text-xl font-bold mb-2">No requirements extracted yet</h3>
							<p className="text-slate-500 dark:text-slate-400 mb-4">
								Hybrid requirement extraction failed.
							</p>
							<button
								onClick={() => handleRegenerate("hybrid")}
								disabled={regeneratingType === "hybrid"}
								className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
							>
								<span className="material-symbols-outlined text-lg">refresh</span>
								{regeneratingType === "hybrid" ? "Regenerating..." : "Regenerate with Hybrid"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function ResultPane({ title, subtitle, grouped, diffGrouped, accent, buttonLabel, isLoading, onPrefer }) {
	const buttonClass = "bg-primary text-white hover:bg-primary/90";
	const hasDiffs =
		diffGrouped.functional_requirements.length > 0 ||
		diffGrouped.nonfunctional_requirements.length > 0;

	return (
		<div className="rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark p-4 space-y-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h2 className="text-slate-900 dark:text-white text-xl font-bold">{title}</h2>
					<p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{subtitle}</p>
				</div>
				<button
					onClick={onPrefer}
					disabled={isLoading}
					className={`h-10 px-4 rounded-lg text-white text-sm font-bold transition-all ${buttonClass} disabled:opacity-60 disabled:cursor-not-allowed`}
				>
					{isLoading ? "Saving..." : buttonLabel}
				</button>
			</div>

			{hasDiffs ? (
				<>
					<SectionCard title="Functional Requirements" items={diffGrouped.functional_requirements} type="fr" />
					<SectionCard title="Non-Functional Requirements" items={diffGrouped.nonfunctional_requirements} type="nfr" />
				</>
			) : (
				<div className="rounded-xl border border-dashed border-[#d3cee8]/70 dark:border-white/20 p-4 text-sm text-slate-500 dark:text-slate-400">
					No differences found in FR/NFR for this extractor.
				</div>
			)}

			<SimpleList title="Actors" values={grouped.actors} idPrefix="A" />
			<SimpleList title="Features" values={grouped.features} idPrefix="F" />
		</div>
	);
}

function CommonPane({ grouped }) {
	const hasCommon =
		grouped.functional_requirements.length > 0 || grouped.nonfunctional_requirements.length > 0;

	return (
		<div className="rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark p-4 space-y-4">
			<div>
				<h2 className="text-slate-900 dark:text-white text-xl font-bold">Common Requirements</h2>
				<p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
					Requirements that both Hybrid and LLM extracted.
				</p>
			</div>

			{hasCommon ? (
				<>
					<SectionCard title="Common Functional Requirements" items={grouped.functional_requirements} type="fr" />
					<SectionCard title="Common Non-Functional Requirements" items={grouped.nonfunctional_requirements} type="nfr" />
				</>
			) : (
				<div className="rounded-xl border border-dashed border-[#d3cee8]/70 dark:border-white/20 p-4 text-sm text-slate-500 dark:text-slate-400">
					No common FR/NFR were found between Hybrid and LLM.
				</div>
			)}
		</div>
	);
}

function SummaryCard({ label, value, tone }) {
	const toneClasses = {
		blue: "bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800/40 text-blue-800 dark:text-blue-300",
		green: "bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800/40 text-green-800 dark:text-green-300",
		purple: "bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800/40 text-purple-800 dark:text-purple-300",
		amber: "bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800/40 text-amber-800 dark:text-amber-300"
	};

	return (
		<div className={`rounded-xl border p-4 ${toneClasses[tone] || toneClasses.blue}`}>
			<p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
			<p className="text-2xl font-black mt-1">{value}</p>
		</div>
	);
}

function SectionCard({ title, items, type }) {
	return (
		<details className="rounded-xl border border-[#d3cee8]/50 dark:border-white/10 px-4 group" open>
			<summary className="flex cursor-pointer items-center justify-between py-4 list-none">
				<p className="text-slate-900 dark:text-white text-base font-bold">{title}</p>
				<span className="material-symbols-outlined text-slate-500 dark:text-slate-400 group-open:rotate-180 transition-transform">
					expand_more
				</span>
			</summary>

			<div className="flex flex-col gap-3 pb-4">
				{items.length === 0 && (
					<p className="text-slate-500 dark:text-slate-400 text-sm">No items found.</p>
				)}
				{items.map((item, index) => (
					<div key={`${title}-${index}`} className="p-4 rounded-lg bg-background-light dark:bg-background-dark/50 border border-transparent dark:border-white/5">
						<p className="text-slate-500 dark:text-slate-400 font-mono text-xs mb-1">
							{type === "fr" ? `FR-${index + 1}` : `NFR-${index + 1}`}
						</p>
						<p className="text-slate-800 dark:text-slate-200 text-sm mb-2">{item.text}</p>
						<div className="flex gap-2 flex-wrap">
							{item.actor && (
								<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
									Actor: {item.actor}
								</span>
							)}
							{item.feature && (
								<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
									Feature: {item.feature}
								</span>
							)}
							{item.category && (
								<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
									Category: {item.category}
								</span>
							)}
						</div>
					</div>
				))}
			</div>
		</details>
	);
}

function SimpleList({ title, values, idPrefix }) {
	return (
		<details className="rounded-xl border border-[#d3cee8]/50 dark:border-white/10 px-4 group" open>
			<summary className="flex cursor-pointer items-center justify-between py-4 list-none">
				<p className="text-slate-900 dark:text-white text-base font-bold">{title}</p>
				<span className="material-symbols-outlined text-slate-500 dark:text-slate-400 group-open:rotate-180 transition-transform">
					expand_more
				</span>
			</summary>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
				{values.length === 0 && (
					<p className="text-slate-500 dark:text-slate-400 text-sm">No items found.</p>
				)}
				{values.map((value, index) => (
					<div key={`${title}-${index}`} className="p-4 rounded-lg bg-background-light dark:bg-background-dark/50 border border-transparent dark:border-white/5">
						<p className="text-slate-500 dark:text-slate-400 font-mono text-xs mb-1">
							{idPrefix}-{index + 1}
						</p>
						<p className="text-slate-800 dark:text-slate-200 text-sm">{value}</p>
					</div>
				))}
			</div>
		</details>
	);
}

function normalizeGrouped(grouped) {
	if (!grouped || typeof grouped !== "object") {
		return {
			functional_requirements: [],
			nonfunctional_requirements: [],
			actors: [],
			features: []
		};
	}

	const functional = Array.isArray(grouped.functional_requirements)
		? grouped.functional_requirements
		: [];
	const nonFunctional = Array.isArray(grouped.nonfunctional_requirements)
		? grouped.nonfunctional_requirements
		: Array.isArray(grouped.non_functional_requirements)
			? grouped.non_functional_requirements
			: [];

	const actors = Array.isArray(grouped.actors) ? grouped.actors : [];
	const features = Array.isArray(grouped.features) ? grouped.features : [];

	return {
		functional_requirements: functional,
		nonfunctional_requirements: nonFunctional,
		actors,
		features
	};
}

function compareGroupedRequirements(hybridGrouped, llmGrouped) {
	const hybridFunctional = Array.isArray(hybridGrouped.functional_requirements)
		? hybridGrouped.functional_requirements
		: [];
	const hybridNonFunctional = Array.isArray(hybridGrouped.nonfunctional_requirements)
		? hybridGrouped.nonfunctional_requirements
		: [];
	const llmFunctional = Array.isArray(llmGrouped.functional_requirements)
		? llmGrouped.functional_requirements
		: [];
	const llmNonFunctional = Array.isArray(llmGrouped.nonfunctional_requirements)
		? llmGrouped.nonfunctional_requirements
		: [];

	const hybridFunctionalMap = new Map(hybridFunctional.map((item) => [item.text.trim().toLowerCase(), item]));
	const hybridNonFunctionalMap = new Map(hybridNonFunctional.map((item) => [item.text.trim().toLowerCase(), item]));

	const commonFunctional = [];
	const llmOnlyFunctional = [];
	for (const item of llmFunctional) {
		const key = item.text.trim().toLowerCase();
		if (hybridFunctionalMap.has(key)) {
			commonFunctional.push(item);
		} else {
			llmOnlyFunctional.push(item);
		}
	}

	const commonNonFunctional = [];
	const llmOnlyNonFunctional = [];
	for (const item of llmNonFunctional) {
		const key = item.text.trim().toLowerCase();
		if (hybridNonFunctionalMap.has(key)) {
			commonNonFunctional.push(item);
		} else {
			llmOnlyNonFunctional.push(item);
		}
	}

	const hybridOnlyFunctional = hybridFunctional.filter(
		(item) => !commonFunctional.some((commonItem) => commonItem.text.trim().toLowerCase() === item.text.trim().toLowerCase())
	);
	const hybridOnlyNonFunctional = hybridNonFunctional.filter(
		(item) => !commonNonFunctional.some((commonItem) => commonItem.text.trim().toLowerCase() === item.text.trim().toLowerCase())
	);

	return {
		commonData: {
			functional_requirements: commonFunctional,
			nonfunctional_requirements: commonNonFunctional
		},
		llmOnlyData: {
			functional_requirements: llmOnlyFunctional,
			nonfunctional_requirements: llmOnlyNonFunctional
		},
		hybridOnlyData: {
			functional_requirements: hybridOnlyFunctional,
			nonfunctional_requirements: hybridOnlyNonFunctional
		}
	};
}
