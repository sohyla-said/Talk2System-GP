import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getToken } from "../../api/authApi";

export default function RequirementsChoicePage() {
	const navigate = useNavigate();
	const location = useLocation();
	const { sessionId } = useParams();

	const [submittingType, setSubmittingType] = useState(null);
	const [sessionName, setSessionName] = useState(null);

	const {
		projectId,
		llmRunId,
		llmData,
		hybridRunId,
		hybridData
	} = location.state || {};

	const hasLLMResults = !!llmData;
	const hasHybridResults = !!hybridData;

	const normalizedLlm = useMemo(() => normalizeGrouped(llmData), [llmData]);
	const normalizedHybrid = useMemo(() => normalizeGrouped(hybridData), [hybridData]);

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
    } catch (err) {
      console.error(err);
    }
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
					preferredType: data.preferred_type,
					projectId
				}
			});
		} catch (error) {
			console.error(error);
			alert(error.message);
		} finally {
			setSubmittingType(null);
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
					{sessionName} session - Choose Preferred Extraction
				</h1>
				<p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
					Compare LLM and Hybrid outputs, then choose the result you want to continue with.
				</p>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
				{hasLLMResults ? (
					<ResultPane
						title="LLM Extraction"
						grouped={normalizedLlm}
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
						<p className="text-slate-500 dark:text-slate-400 mb-6">
							LLM requirement extraction failed.
						</p>
						</div>
					</div>
				)}
				

				{hasHybridResults ? (
					<ResultPane
						title="Hybrid Extraction"
						grouped={normalizedHybrid}
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
							<p className="text-slate-500 dark:text-slate-400 mb-6">
								Hybrid requirement extraction failed.
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function ResultPane({ title, grouped, accent, buttonLabel, isLoading, onPrefer }) {
	const buttonClass = "bg-primary text-white hover:bg-primary/90";

	return (
		<div className="rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark p-4 space-y-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-slate-900 dark:text-white text-xl font-bold">{title}</h2>
				<button
					onClick={onPrefer}
					disabled={isLoading}
					className={`h-10 px-4 rounded-lg text-white text-sm font-bold transition-all ${buttonClass} disabled:opacity-60 disabled:cursor-not-allowed`}
				>
					{isLoading ? "Saving..." : buttonLabel}
				</button>
			</div>

			<SectionCard title="Functional Requirements" items={grouped.functional_requirements} type="fr" />
			<SectionCard title="Non-Functional Requirements" items={grouped.nonfunctional_requirements} type="nfr" />
			<SimpleList title="Actors" values={grouped.actors} idPrefix="A" />
			<SimpleList title="Features" values={grouped.features} idPrefix="F" />
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
