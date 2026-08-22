import KnowledgeModel from "./KnowledgeModel";
import "./KnowledgeModel.css";
import "./TeachLesson.css";

export default function TeachLesson({ leaf, onPlay, onBack }) {
  if (!leaf) return null;
  const playable = Boolean(leaf.subject && leaf.text);
  const formulas = leaf.formulas || [];
  const steps = leaf.steps || [];

  return (
    <div className="teach-lesson">
      <div className="teach-lesson-bar">
        <button type="button" className="teach-lesson-back" onClick={onBack}>
          ← 换知识点
        </button>
      </div>

      <div className="teach-lesson-stage">
        <div className="teach-lesson-poster">
          <KnowledgeModel type={leaf.model} />
        </div>

        <div className="teach-lesson-copy">
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

          {playable ? (
            <button type="button" className="teach-lesson-play" onClick={onPlay}>
              开讲这道例题
            </button>
          ) : (
            <p className="teach-lesson-note">先看清模型和公式，再去搜题模式练同类题。</p>
          )}
        </div>
      </div>
    </div>
  );
}
