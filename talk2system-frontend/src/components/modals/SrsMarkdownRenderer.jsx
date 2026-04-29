function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-bold text-[#1E105F] dark:text-indigo-300">{part.slice(2, -2)}</strong>
      : part
  );
}

// Maps section number prefix → anchor id
// Section 4 is now Non-Functional Requirements (External Interfaces removed)
const SECTION_IDS = {
  "1.": "s1",
  "2.": "s2",
  "3.": "s3",
  "4.": "s4",
};

export default function SrsMarkdownRenderer({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      elements.push(<div key={key++} className="h-3" />);
      continue;
    }

    const sectionKey = Object.keys(SECTION_IDS).find(k =>
      line.replace(/^#+\s*/, "").startsWith(k)
    );
    const anchorId = sectionKey ? SECTION_IDS[sectionKey] : undefined;

    // ── Headings ──────────────────────────────────────────
    if (line.startsWith("#### ")) {
      elements.push(
        <h4 key={key++} className="text-base font-bold mt-4 mb-1 text-[#1E105F] dark:text-indigo-300">
          {renderInline(line.slice(5))}
        </h4>
      );

    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-lg font-bold mt-5 mb-2 text-[#1E105F] dark:text-indigo-300">
          {renderInline(line.slice(4))}
        </h3>
      );

    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} id={anchorId} className="text-xl font-bold mt-6 mb-2 text-[#100d1c] dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1 scroll-mt-28">
          {renderInline(line.slice(3))}
        </h2>
      );

    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={key++} id={anchorId} className="text-2xl font-black mt-8 mb-3 text-[#1E105F] dark:text-indigo-200 scroll-mt-28">
          {renderInline(line.slice(2))}
        </h1>
      );

    // ── FR lines: **FR-N** | Actor: [...] | Feature: [...] ──
    } else if (/^\*\*FR-\d+\*\*/.test(line)) {
      const frMatch = line.match(/^\*\*(FR-\d+)\*\*\s*\|?\s*(.*)/);
      const frId = frMatch ? frMatch[1] : "";
      const rest = frMatch ? frMatch[2] : line;
      const chips = rest.split("|").map(s => s.trim()).filter(Boolean);

      elements.push(
        <div key={key++} className="mt-4 mb-1 flex flex-wrap items-center gap-2">
          <span className="inline-block bg-[#1E105F] text-white text-xs font-bold px-2.5 py-1 rounded-md">
            {frId}
          </span>
          {chips.map((chip, ci) => (
            <span key={ci} className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded">
              {chip}
            </span>
          ))}
        </div>
      );

    // ── "The system shall" requirement body ──────────────
    } else if (/^The system shall/i.test(line)) {
      elements.push(
        <p key={key++} className="ml-4 pl-3 border-l-2 border-[#1E105F]/30 dark:border-indigo-500/30 text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
          {renderInline(line)}
        </p>
      );

    // ── Bullet list ───────────────────────────────────────
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={key++} className="ml-5 list-disc text-gray-700 dark:text-gray-300 mb-1">
          {renderInline(line.slice(2))}
        </li>
      );

    // ── Numbered list ─────────────────────────────────────
    } else if (/^\d+\./.test(line)) {
      elements.push(
        <li key={key++} className="ml-5 list-decimal text-gray-700 dark:text-gray-300 mb-1">
          {renderInline(line)}
        </li>
      );

    // ── Table rows ────────────────────────────────────────
    } else if (line.startsWith("|") && line.includes("|")) {
      const cells = line.split("|").filter(c => c.trim() !== "");
      const isHeader = lines[i + 1]?.includes("---");
      if (line.includes("---")) continue;
      elements.push(
        <div
          key={key++}
          className={`grid gap-px mb-px text-sm font-mono ${isHeader ? "bg-[#1E105F] text-white rounded-t" : "bg-gray-50 dark:bg-gray-800/50"}`}
          style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}
        >
          {cells.map((c, ci) => (
            <div
              key={ci}
              className={`px-3 py-1.5 ${isHeader ? "font-bold text-white" : "text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"}`}
            >
              {c.trim()}
            </div>
          ))}
        </div>
      );

    // ── Horizontal rule ───────────────────────────────────
    } else if (line.startsWith("---")) {
      elements.push(<hr key={key++} className="my-6 border-gray-200 dark:border-gray-700" />);

    // ── Default paragraph ─────────────────────────────────
    } else {
      elements.push(
        <p key={key++} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
          {renderInline(line)}
        </p>
      );
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}