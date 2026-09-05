import { useEffect, useState } from "react";
import ExplanationPanel from "./ExplanationPanel";
import LogicPanel from "./LogicPanel";
import TopicPanel from "./TopicPanel";
import { generateLocalSteps } from "../engines/explanationEngine";
import { parseProblemToSemantic } from "../engines/geometryValidator";
import { parseProblemSync } from "../engines/problemParser";
import "./ExplanationPanel.css";

function extractSolidParams(text) {
  const cuboid = text.match(
    /长\s*(\d+(?:\.\d+)?)\s*宽\s*(\d+(?:\.\d+)?)\s*高\s*(\d+(?:\.\d+)?)/,
  );
  if (cuboid) {
    const a = Number(cuboid[1]);
    const b = Number(cuboid[2]);
    const c = Number(cuboid[3]);
    return { size: a, params: { a, b, c, length: a, width: b, height: c } };
  }
  const cube = text.match(/棱长为\s*(\d+(?:\.\d+)?)/);
  if (cube) {
    const a = Number(cube[1]);
    return { size: a, params: { a } };
  }
  const pyr = text.match(/边长为\s*(\d+(?:\.\d+)?).*高为\s*(\d+(?:\.\d+)?)/);
  if (pyr) {
    const a = Number(pyr[1]);
    const h = Number(pyr[2]);
    return { size: a, params: { a, h, height: h } };
  }
  const fru = text.match(
    /上底半径\s*(\d+(?:\.\d+)?).*下底半径\s*(\d+(?:\.\d+)?).*高\s*(\d+(?:\.\d+)?)/,
  );
  if (fru) {
    const r = Number(fru[1]);
    const R = Number(fru[2]);
    const h = Number(fru[3]);
    return { size: R, params: { r, R, h, height: h } };
  }
  const cyl = text.match(/半径为\s*(\d+(?:\.\d+)?).*高为\s*(\d+(?:\.\d+)?)/);
  if (cyl) {
    const r = Number(cyl[1]);
    const h = Number(cyl[2]);
    return { size: r, params: { r, radius: r, h, height: h } };
  }
  const sph = text.match(/半径为\s*(\d+(?:\.\d+)?)/);
  if (sph) {
    const r = Number(sph[1]);
    return { size: r, params: { r, radius: r } };
  }
  return null;
}

function buildGeometryParsed(text, fallbackType, title) {
  const dims = extractSolidParams(text);
  try {
    const semantic = parseProblemToSemantic(text);
    return {
      type: semantic.shape || fallbackType || "cube",
      size: dims?.size ?? semantic.size,
      params: { ...(semantic.params || {}), ...(dims?.params || {}) },
      labels: semantic.points,
      vertices: semantic.points,
      relations: semantic.relations || [],
      planes: semantic.planes || [],
      importantPlanes: semantic.importantPlanes || [],
      highlightLines: (semantic.importantLines || []).map((l) => ({
        from: l[0],
        to: l[1],
        label: l,
      })),
      explanation: title || semantic.shape,
      semantic,
    };
  } catch {
    const parsed = parseProblemSync(text);
    return {
      ...parsed,
      size: dims?.size ?? parsed.size,
      params: { ...(parsed.params || {}), ...(dims?.params || {}) },
      explanation: title || parsed.explanation,
    };
  }
}

function TeachGeometryExplain({ leaf, onStepChange }) {
  const [steps, setSteps] = useState([]);
  const [parsedData, setParsedData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const parsed = buildGeometryParsed(leaf.text, leaf.model, leaf.label);
      const nextSteps = generateLocalSteps(leaf.text, parsed);
      setParsedData(parsed);
      setSteps(nextSteps);
      setCurrentStep(0);
      setError(null);
      onStepChange?.(0);
    } catch (err) {
      setSteps([]);
      setParsedData(null);
      setError(err?.message || "这道例题暂时讲不出来");
      onStepChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [leaf.id, leaf.model, leaf.text, onStepChange]);

  const go = (index) => {
    const next = Math.max(0, Math.min(steps.length - 1, index));
    setCurrentStep(next);
    onStepChange?.(next);
  };

  return (
    <ExplanationPanel
      steps={steps}
      currentStep={currentStep}
      onStepClick={go}
      onNext={() => go(currentStep + 1)}
      onPrev={() => go(currentStep - 1)}
      loading={loading}
      loadingStage={loading ? "reasoning" : "done"}
      parsedData={parsedData}
      problemText={leaf.text}
      error={error}
    />
  );
}

function topicBoot(leaf) {
  if (leaf.sampleKey) {
    return { type: "sample", key: leaf.sampleKey, nonce: 1 };
  }
  return { type: "text", text: leaf.text, nonce: 1 };
}

export default function TeachExplain({ leaf, onClose, onStepChange }) {
  if (!leaf?.subject || !leaf?.text) return null;

  if (leaf.subject === "geometry") {
    return (
      <div className="teach-explain teach-explain--geo">
        <TeachGeometryExplain leaf={leaf} onStepChange={onStepChange} />
      </div>
    );
  }

  if (leaf.subject === "combo") {
    return (
      <div className="teach-explain teach-explain--topic">
        <LogicPanel boot={topicBoot(leaf)} onBackToHub={onClose} />
      </div>
    );
  }

  return (
    <div className="teach-explain teach-explain--topic">
      <TopicPanel
        key={leaf.subject}
        topic={leaf.subject}
        boot={topicBoot(leaf)}
        onBackToHub={onClose}
      />
    </div>
  );
}
