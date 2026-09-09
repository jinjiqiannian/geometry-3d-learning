import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import StepList from "./StepList"
import AnswerPanel from "./AnswerPanel"
import { aiAPI } from "../services/api"
import { parseProblemSync } from "../engines/problemParser"
import { generateLocalSteps } from "../engines/explanationEngine"
import { parseProblemToSemantic, convertLegacyParsedToSemantic } from "../engines/geometryValidator"

const SUBJECT_COLORS = {
  physics: { primary: "#06b6d4", name: "物理" },
  math: { primary: "#E8551F", name: "数学" },
}

export default function SubjectSolver({ subject = "physics" }) {
  const colors = SUBJECT_COLORS[subject] || SUBJECT_COLORS.physics
  const navigate = useNavigate()
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState(null)
  const [parsedData, setParsedData] = useState({})
  const [solvedText, setSolvedText] = useState("")
  const [aiActive, setAiActive] = useState(false)
  const [finalAnswer, setFinalAnswer] = useState(null)
  const c = colors.primary

  const handleSolve = useCallback(async () => {
    const text = input.trim()
    if (text.length < 3 || loading) return
    setLoading(true)
    setAiActive(true)
    setError(null)
    setSteps([])
    setSolvedText("")

    try {
      const aiResult = await aiAPI.solve(text)
      if (aiResult && aiResult.success && aiResult.data) {
        const { parsed, steps, finalAnswer } = aiResult.data
        console.log('[SubjectSolver] AI返回的steps:', JSON.stringify(steps, null, 2));
        console.log('[SubjectSolver] AI返回的parsed:', JSON.stringify(parsed, null, 2));
        console.log('[SubjectSolver] AI返回的finalAnswer:', JSON.stringify(finalAnswer, null, 2));
        setParsedData(parsed)
        setSteps(steps)
        setFinalAnswer(finalAnswer)
        setSolvedText(text)
        setCurrentStep(0)

        try {
          sessionStorage.setItem("jidong_replay_steps", JSON.stringify(steps))
          sessionStorage.setItem("jidong_replay_parsed", JSON.stringify(parsed))
        } catch { /* */ }
      } else {
        throw new Error(aiResult?.error || 'AI 解析无返回结果')
      }
    } catch (err) {
      console.warn("AI 解题失败，降级到本地模板:", err.message)
      setAiActive(false)
      
      const semantic = parseProblemToSemantic(text)
      const fallbackParsed = {
        type: semantic.shape,
        size: semantic.size,
        labels: semantic.points,
        vertices: semantic.points,
        highlightLines: semantic.importantLines.map(l => ({
          from: l[0],
          to: l[1],
          label: l,
        })),
        explanation: semantic.shape,
        semantic,
      }
      const fallbackSteps = generateLocalSteps(text, fallbackParsed)
      
      setParsedData(fallbackParsed)
      setSteps(fallbackSteps)
      setSolvedText(text)
      setCurrentStep(0)

      try {
        sessionStorage.setItem("jidong_replay_steps", JSON.stringify(fallbackSteps))
        sessionStorage.setItem("jidong_replay_parsed", JSON.stringify(fallbackParsed))
      } catch { /* */ }
    } finally {
      setAiActive(false)
      setLoading(false)
    }
  }, [input, loading, subject])

  return (
    <div className="subject-solver">
      {/* Input area */}
      <div className="subject-solver-input-area" style={{ borderColor: `${c}20` }}>
        <textarea
          className="subject-solver-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`输入一道${colors.name}题，AI 将为你解析…`}
          rows={3}
          spellCheck={false}
        />
        <div className="subject-solver-input-footer">
          <button
            className="subject-solver-btn"
            style={{ background: c }}
            onClick={handleSolve}
            disabled={input.trim().length < 3 || loading}
          >
            {loading ? (aiActive ? "AI 推理中…" : "本地解析中…") : "开始解析"}
          </button>
        </div>
      </div>

      {error && (
        <div className="subject-solver-error">{error}</div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="subject-solver-steps">
          <div className="subject-solver-steps-inner">
            <StepList
              steps={steps}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
            />
            <AnswerPanel
              step={steps[currentStep]}
              parsedData={parsedData}
              steps={steps}
              finalAnswer={finalAnswer}
            />
          </div>
          {/* Step nav */}
          <div className="subject-solver-nav">
            <button
              className="subject-solver-nav-btn"
              style={{ borderColor: c, color: c }}
              onClick={() => setCurrentStep(p => Math.max(0, p - 1))}
              disabled={currentStep <= 0}
            >
              ◀ 上一步
            </button>
            <span className="subject-solver-nav-indicator">
              {currentStep + 1} / {steps.length}
            </span>
            <button
              className="subject-solver-nav-btn"
              style={{ borderColor: c, color: c }}
              onClick={() => setCurrentStep(p => Math.min(steps.length - 1, p + 1))}
              disabled={currentStep >= steps.length - 1}
            >
              下一步 ▶
            </button>
          </div>

          {/* Open in workspace with 3D */}
          <div className="subject-solver-workspace-row">
            <button
              className="subject-solver-workspace-btn"
              style={{ color: c }}
              onClick={() => {
                // Save solved data to sessionStorage for workspace sync
                try {
                  sessionStorage.setItem("jidong_replay_steps", JSON.stringify(steps))
                  sessionStorage.setItem("jidong_replay_parsed", JSON.stringify(parsedData))
                } catch { /* */ }
                navigate(`/workspace?q=${encodeURIComponent(solvedText)}&replay=1`)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              在 3D 工作台中打开
            </button>
          </div>
        </div>
      )}

      <style>{`
        .subject-solver { width: 100%; }
        .subject-solver-input-area {
          border: 1px solid; border-radius: 12px;
          background: rgba(255,255,255,0.02);
          overflow: hidden; margin-bottom: 16px;
        }
        :root[data-theme="light"] .subject-solver-input-area {
          background: rgba(0,0,0,0.02);
        }
        .subject-solver-input {
          width: 100%; padding: 14px 16px;
          background: transparent; border: none; outline: none;
          color: rgba(255,255,255,0.8); font-size: 14px;
          font-family: inherit; line-height: 1.6; resize: none;
        }
        :root[data-theme="light"] .subject-solver-input { color: rgba(0,0,0,0.7); }
        .subject-solver-input::placeholder { color: rgba(255,255,255,0.15); }
        :root[data-theme="light"] .subject-solver-input::placeholder { color: rgba(0,0,0,0.15); }
        .subject-solver-input-footer {
          display: flex; justify-content: flex-end;
          padding: 0 12px 12px;
        }
        .subject-solver-btn {
          padding: 9px 24px; border-radius: 999px;
          color: #fff; font-size: 13px; font-weight: 550;
          border: none; cursor: pointer; font-family: inherit;
          transition: opacity 0.2s;
        }
        .subject-solver-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .subject-solver-btn:hover:not(:disabled) { opacity: 0.88; }
        .subject-solver-error {
          padding: 10px 14px; border-radius: 8px;
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);
          color: #ef4444; font-size: 13px; margin-bottom: 16px;
        }
        .subject-solver-steps {
          margin-top: 8px; margin-bottom: 24px;
        }
        .subject-solver-steps-inner {
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px; overflow: hidden;
        }
        :root[data-theme="light"] .subject-solver-steps-inner {
          border-color: rgba(0,0,0,0.05);
        }
        .subject-solver-nav {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; padding: 10px 0;
        }
        .subject-solver-nav-btn {
          padding: 6px 16px; border-radius: 999px;
          border: 1px solid; background: transparent;
          font-size: 12px; font-weight: 500; cursor: pointer;
          font-family: inherit; transition: opacity 0.2s;
        }
        .subject-solver-nav-btn:disabled { opacity: 0.2; cursor: not-allowed; }
        .subject-solver-nav-btn:hover:not(:disabled) { opacity: 0.8; }
        .subject-solver-nav-indicator {
          font-size: 12px; color: rgba(255,255,255,0.3);
        }
        :root[data-theme="light"] .subject-solver-nav-indicator { color: rgba(0,0,0,0.3); }
        .subject-solver-workspace-row {
          display: flex; justify-content: center; margin-top: 8px;
        }
        .subject-solver-workspace-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 18px; border-radius: 999px;
          background: transparent; border: 1px solid currentColor;
          font-size: 12px; font-weight: 500; cursor: pointer;
          font-family: inherit; opacity: 0.7;
          transition: opacity 0.2s, background 0.2s;
          text-decoration: none;
        }
        .subject-solver-workspace-btn:hover {
          opacity: 1;
          background: rgba(255,255,255,0.05);
        }
        :root[data-theme="light"] .subject-solver-workspace-btn:hover {
          background: rgba(0,0,0,0.04);
        }
      `}</style>
    </div>
  )
}
