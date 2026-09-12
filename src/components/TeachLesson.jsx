import { useCallback, useState } from "react";
import KnowledgeModel from "./KnowledgeModel";
import TeachExplain from "./TeachExplain";
import "./KnowledgeModel.css";
import "./TeachLesson.css";

function accentFor(leaf, playing, step) {
  // 知识点专属图：metrics / perp 与播放状态无关，始终展示
  if (leaf.modelAccent === "metrics" || leaf.modelAccent === "perp") {
    return leaf.modelAccent;
  }
  // 未播放时优先用知识点专属的高亮（区分共用同一几何体的不同知识点）
  if (!playing && leaf.modelAccent) return leaf.modelAccent;
  const model = leaf.model;
  if (model === "cube" || model === "cuboid" || model === "prism") {
    if (!playing || step <= 0) return "diag";
    if (step === 1) return "face-diag";
    return "diag";
  }
  if (model === "pyramid" || model === "cone" || model === "frustum") {
    return "height";
  }
  if (model === "cylinder") return playing && step > 0 ? "height" : "radius";
  if (model === "sphere") return "radius";
  return "";
}

export default function TeachLesson({ leaf, onBack }) {
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [lessonId, setLessonId] = useState(leaf?.id);

  if (leaf && leaf.id !== lessonId) {
    setLessonId(leaf.id);
    setPlaying(false);
    setStep(0);
  }

  const handleStepChange = useCallback((index) => {
    setStep(index);
  }, []);

  if (!leaf) return null;

  const playable = Boolean(leaf.subject && leaf.text);
  const formulas = leaf.formulas || [];
  const steps = leaf.steps || [];
  const accent = accentFor(leaf, playing, step);

  return (
    <div className={`teach-lesson${playing ? " is-playing" : ""}`}>
      <div className="teach-lesson-bar">
        <button type="button" className="teach-lesson-back" onClick={onBack}>
          ← 换知识点
        </button>
      </div>

      <div className="teach-lesson-stage">
        <div className="teach-lesson-poster">
          <KnowledgeModel
            key={leaf.id}
            type={leaf.model}
            accent={accent}
            animate={playing}
          />
        </div>

        <div className="teach-lesson-copy">
          {playing && playable ? (
            <>
              <div className="teach-explain-head">
                <button
                  type="button"
                  className="teach-lesson-back"
                  onClick={() => setPlaying(false)}
                >
                  ← 模型和公式
                </button>
                <h2 className="teach-lesson-title">{leaf.label}</h2>
              </div>
              <TeachExplain
                key={leaf.id}
                leaf={leaf}
                onClose={() => setPlaying(false)}
                onStepChange={handleStepChange}
              />
            </>
          ) : (
            <>
              <p className="teach-lesson-kicker">{leaf.hint || "知识点"}</p>
              <h2 className="teach-lesson-title">{leaf.label}</h2>
              {leaf.idea && <p className="teach-lesson-idea">{leaf.idea}</p>}

              {formulas.length > 0 && (
                <ul className="teach-lesson-formulas">
                  {formulas.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}

              {steps.length > 0 && (
                <ol className="teach-lesson-steps">
                  {steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              )}

              {Array.isArray(leaf.explain) && leaf.explain.length > 0 && (
                <div className="teach-lesson-explain">
                  {leaf.explain.map((p, i) => (
                    <p key={i} className="teach-lesson-explain-p">{p}</p>
                  ))}
                </div>
              )}

              {playable ? (
                <button
                  type="button"
                  className="teach-lesson-play"
                  onClick={() => setPlaying(true)}
                >
                  开讲这道例题
                </button>
              ) : (
                <p className="teach-lesson-note">
                  先看清模型和公式，再去搜题模式练同类题。
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
