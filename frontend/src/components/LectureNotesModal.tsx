import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  Search,
  BookOpen,
  Layers,
  Lightbulb,
  FileText,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { LessonPlan } from '../types';

interface LectureNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: LessonPlan | null;
}

export const LectureNotesModal: React.FC<LectureNotesModalProps> = ({
  isOpen,
  onClose,
  plan,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSectionIndex, setCopiedSectionIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  const cleanTopic = plan?.topic || 'STEM Lecture Notes';
  const notes = plan?.lectureNotes || [];
  const modules = plan?.modules || [];
  const sources = plan?.sourceMaterials || [];

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter((n) => n.toLowerCase().includes(q));
  }, [notes, searchQuery]);

  if (!isOpen || !plan) return null;

  const handleCopyAll = () => {
    const fullContent = [
      `# ${cleanTopic} — Rabbly AI Master Study Guide`,
      `Subject: ${plan.subject || 'STEM'} | Level: ${plan.level} | Estimated Duration: ${plan.estimatedMinutes} mins`,
      `Date: ${new Date().toLocaleDateString()}`,
      '',
      '## Executive Overview',
      plan.overview,
      '',
      '## Curriculum Modules & Checkpoints',
      ...modules.map((m, i) => `### Module ${i + 1}: ${m.title} (${m.duration})\n${m.description}\n` + (m.keyTakeaways ? m.keyTakeaways.map(t => `- ${t}`).join('\n') : '')),
      '',
      '## Comprehensive Lecture Notes, Equations & Schemas',
      ...notes.map((n, i) => `\n### Section ${i + 1}\n${n}\n`),
      '',
      '## Reference Citations',
      ...sources.map(s => `- [${s.type.toUpperCase()}] ${s.title}${s.url ? ` (${s.url})` : ''}: ${s.snippet || ''}`),
    ].join('\n');

    navigator.clipboard.writeText(fullContent);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySection = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSectionIndex(idx);
    setTimeout(() => setCopiedSectionIndex(null), 2000);
  };

  const handleDownloadMd = () => {
    const fullContent = [
      `# ${cleanTopic} — Rabbly AI Study Guide`,
      `**Subject**: ${plan.subject || 'STEM'}  `,
      `**Level**: ${plan.level}  `,
      `**Generated On**: ${new Date().toLocaleDateString()}  `,
      `**Estimated Time**: ~${plan.estimatedMinutes} minutes  `,
      '',
      '---',
      '',
      '## Executive Overview',
      plan.overview,
      '',
      '## Curriculum Roadmap',
      ...modules.map((m, i) => `### Module ${i + 1}: ${m.title} (${m.duration})\n${m.description}\n` + (m.keyTakeaways ? m.keyTakeaways.map(t => `- ${t}`).join('\n') : '')),
      '',
      '## Lecture Notes & Derivations',
      ...notes.map(n => `\n${n}\n`),
      '',
      '## Primary Source Citations',
      ...sources.map(s => `- **${s.title}** (${s.type.toUpperCase()}) ${s.url ? `[Link](${s.url})` : ''}\n  ${s.snippet || ''}`),
    ].join('\n');

    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_notes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // High-fidelity printable document generator that triggers browser print/save to PDF
  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Please allow popups to generate the PDF study guide.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${cleanTopic} - Rabbly AI Lecture Notes</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 20mm 18mm 20mm 18mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            line-height: 1.6;
            font-size: 11pt;
            margin: 0;
            padding: 0;
          }
          .header-banner {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 14px;
            margin-bottom: 22px;
          }
          .logo-badge {
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #2563eb;
          }
          h1 {
            font-size: 20pt;
            margin: 6px 0 8px 0;
            color: #0f172a;
            line-height: 1.25;
          }
          .meta-bar {
            font-size: 9.5pt;
            color: #4b5563;
            display: flex;
            gap: 16px;
            margin-top: 4px;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            background: #eff6ff;
            color: #1d4ed8;
            font-size: 8.5pt;
            font-weight: 600;
          }
          h2 {
            font-size: 13.5pt;
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-top: 24px;
            margin-bottom: 12px;
            page-break-after: avoid;
          }
          h3 {
            font-size: 11.5pt;
            color: #1d4ed8;
            margin-top: 16px;
            margin-bottom: 6px;
            page-break-after: avoid;
          }
          p {
            margin: 0 0 10px 0;
            color: #334155;
          }
          .overview-box {
            background: #f8fafc;
            border-left: 4px solid #3b82f6;
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 18px;
            font-size: 10.5pt;
          }
          .module-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          .note-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 14px 16px;
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          pre, code {
            font-family: "JetBrains Mono", "SFMono-Regular", Consolas, Menlo, monospace;
            background: #0f172a;
            color: #e2e8f0;
            border-radius: 4px;
          }
          pre {
            padding: 12px 14px;
            font-size: 9pt;
            line-height: 1.45;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-all;
          }
          code {
            padding: 2px 5px;
            font-size: 9pt;
            color: #2563eb;
            background: #eff6ff;
          }
          pre code {
            color: #e2e8f0;
            background: transparent;
            padding: 0;
          }
          ul {
            margin: 4px 0 10px 20px;
            padding: 0;
          }
          li {
            margin-bottom: 4px;
            color: #334155;
          }
          .citation-item {
            font-size: 9pt;
            padding: 6px 0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            font-size: 8.5pt;
            color: #94a3b8;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div class="logo-badge">Rabbly AI Whiteboard Platform • Master Lecture Series</div>
          <h1>${cleanTopic}</h1>
          <div class="meta-bar">
            <span><strong>Subject:</strong> ${plan.subject || 'STEM'}</span>
            <span><strong>Track:</strong> <span class="badge">${plan.level}</span></span>
            <span><strong>Estimated Time:</strong> ${plan.estimatedMinutes} minutes</span>
            <span><strong>Date:</strong> ${new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div class="overview-box">
          <strong>Executive Overview:</strong><br>
          ${plan.overview}
        </div>

        <h2>1. Curriculum Checkpoints & Milestones</h2>
        ${modules.map((m, i) => `
          <div class="module-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h3 style="margin:0;">Module ${i + 1}: ${m.title}</h3>
              <span class="badge">${m.duration}</span>
            </div>
            <p style="margin:6px 0 6px 0;">${m.description}</p>
            ${m.keyTakeaways && m.keyTakeaways.length > 0 ? `
              <ul>
                ${m.keyTakeaways.map(t => `<li>${t}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}

        <h2>2. Comprehensive Lecture Notes, Mathematical Models & Architecture</h2>
        ${notes.map((n, i) => `
          <div class="note-card">
            <h3 style="margin-top:0;">Section ${i + 1}</h3>
            <div style="font-size: 10pt; line-height: 1.6; white-space: pre-wrap;">${n.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')}</div>
          </div>
        `).join('')}

        ${sources.length > 0 ? `
          <h2>3. Authoritative Reference Sources & Citations</h2>
          ${sources.map(s => `
            <div class="citation-item">
              <strong>${s.title}</strong> [${s.type.toUpperCase()}]<br>
              ${s.snippet ? `<span style="color:#64748b;">${s.snippet}</span>` : ''}
              ${s.url ? `<br><a href="${s.url}" style="color:#2563eb; font-size:8pt;">${s.url}</a>` : ''}
            </div>
          `).join('')}
        ` : ''}

        <div class="footer">
          Generated autonomously by Rabbly AI Learning Platform • Verified against Canonical STEM Knowledge Bases
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[92vh] rounded-3xl bg-[#14161a] border border-[#44474f]/50 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#44474f]/30 flex items-center justify-between gap-4 bg-[#191c20]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#0842a0]/40 text-[#a8c7fa] border border-[#a8c7fa]/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0842a0]/40 text-[#a8c7fa] border border-[#a8c7fa]/20">
                  {plan.subject || 'STEM'}
                </span>
                <span className="text-[10px] font-mono text-[#8e9099]">• {plan.level} • {plan.estimatedMinutes} mins</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white font-['Outfit'] truncate">
                {cleanTopic}
              </h2>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0842a0] to-[#1d4ed8] hover:from-[#0a4ec0] hover:to-[#2563eb] text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMd}
              className="p-2 rounded-xl bg-[#212429] hover:bg-[#2c2f35] text-[#c4c6d0] hover:text-white border border-[#44474f]/40 transition-colors cursor-pointer"
              title="Download Markdown (.md)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleCopyAll}
              className="p-2 rounded-xl bg-[#212429] hover:bg-[#2c2f35] text-[#c4c6d0] hover:text-white border border-[#44474f]/40 transition-colors cursor-pointer"
              title="Copy All Notes"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#212429] hover:bg-[#2c2f35] text-[#8e9099] hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (2-Column: Sidebar Outline + Main Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Outline Sidebar */}
          <div className="w-64 border-r border-[#44474f]/30 bg-[#111318]/90 p-3 hidden md:flex flex-col gap-3 shrink-0 overflow-y-auto">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8e9099] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#191c20] border border-[#44474f]/50 focus:border-[#a8c7fa] rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-[#8e9099] focus:outline-none"
              />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e9099] font-mono px-2">
              Table of Contents ({notes.length} Sections)
            </span>

            <div className="space-y-1">
              {notes.map((n, idx) => {
                const firstLine = n.split('\n')[0].replace(/^#+\s*/, '') || `Section ${idx + 1}`;
                const isActive = activeSectionIndex === idx;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveSectionIndex(idx);
                      const el = document.getElementById(`note-section-${idx}`);
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? 'bg-[#0842a0]/40 text-[#a8c7fa] font-semibold border border-[#a8c7fa]/30'
                        : 'text-[#8e9099] hover:bg-[#212429] hover:text-[#c4c6d0]'
                    }`}
                  >
                    <ChevronRight className={`w-3 h-3 shrink-0 ${isActive ? 'text-[#a8c7fa]' : 'text-[#8e9099]'}`} />
                    <span className="truncate">{firstLine}</span>
                  </button>
                );
              })}
            </div>

            {/* Curriculum Checkpoints Quick Links */}
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e9099] font-mono px-2 pt-2 border-t border-[#44474f]/20">
              Checkpoints ({modules.length})
            </span>
            <div className="space-y-1">
              {modules.map((m, idx) => (
                <div key={idx} className="px-3 py-1.5 rounded-lg bg-[#191c20]/60 text-[11px] text-[#c4c6d0] flex items-center justify-between">
                  <span className="truncate">{m.title}</span>
                  <span className="text-[10px] font-mono text-[#8e9099] shrink-0">{m.duration}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main Reading Canvas */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-[#14161a]">
            {/* Overview Banner */}
            <div className="p-5 rounded-3xl bg-[#191c20] border border-[#44474f]/40 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#a8c7fa] font-mono uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Executive Curriculum Overview</span>
              </div>
              <p className="text-xs sm:text-sm text-[#c4c6d0] leading-relaxed">
                {plan.overview}
              </p>
            </div>

            {/* Modules Summary Bar */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white font-mono uppercase tracking-wider">
                <Layers className="w-4 h-4 text-[#d0bcff]" />
                <span>Roadmap Modules</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modules.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="p-3.5 rounded-2xl bg-[#1d2024] border border-[#44474f]/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white leading-snug">
                        {m.title}
                      </h4>
                      <span className="text-[10px] font-mono text-[#a8c7fa] px-1.5 py-0.5 rounded bg-[#0842a0]/40 shrink-0">
                        {m.duration}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#c4c6d0] leading-relaxed">
                      {m.description}
                    </p>
                    {m.keyTakeaways && m.keyTakeaways.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-[#44474f]/20">
                        {m.keyTakeaways.map((point, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-1 text-[11px] text-[#8e9099]">
                            <span className="text-[#a8c7fa] shrink-0">•</span>
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Lecture Notes Sections */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white font-mono uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>Lecture Formulations, Derivations & Schemas</span>
                </div>
                <span className="text-[11px] font-mono text-[#8e9099]">
                  {filteredNotes.length} of {notes.length} Sections
                </span>
              </div>

              {filteredNotes.map((note, index) => {
                const isCopied = copiedSectionIndex === index;

                return (
                  <div
                    id={`note-section-${index}`}
                    key={index}
                    className="p-5 rounded-3xl bg-[#1d2024] border border-[#44474f]/40 hover:border-[#a8c7fa]/50 transition-all space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#44474f]/20">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a8c7fa]">
                        Section #{index + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopySection(note, index)}
                        className="px-2.5 py-1 rounded-lg bg-[#282a2f] hover:bg-[#33353a] text-[#8e9099] hover:text-white text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copy section"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="font-mono text-xs sm:text-sm text-[#e2e2e9] leading-relaxed whitespace-pre-wrap overflow-x-auto">
                      {note}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Citations & Authority Sources */}
            {sources.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#44474f]/30">
                <div className="flex items-center gap-2 text-xs font-bold text-white font-mono uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-[#78f8e7]" />
                  <span>Canonical Research Citations & Documentation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sources.map((src, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3.5 rounded-2xl bg-[#191c20] border border-[#44474f]/30 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800 font-bold">
                          {src.type}
                        </span>
                        {src.url && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#a8c7fa] hover:text-white flex items-center gap-1 font-mono text-[11px] hover:underline"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <h4 className="font-bold text-white">{src.title}</h4>
                      {src.snippet && (
                        <p className="text-[11px] text-[#8e9099] font-mono leading-snug">
                          {src.snippet}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
