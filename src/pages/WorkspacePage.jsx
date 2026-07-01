import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import Canvas3D from "../features/solid-geometry/Canvas3D";
import GeometryMiniControls from "../components/GeometryMiniControls";
import ExplanationPanel from "../components/ExplanationPanel";
import TeacherModePanel from "../components/TeacherModePanel";
import { getLineDefinitions } from "../engines/lineDefinitions";
import { isPolyhedral } from "../engines/geometryEngine";
import { computeVerticesFromParams } from "../engines/constraintSolver";
import { computeVisualIntent } from "../engines/visualIntent";
import { createLabelMap, INTERNAL_LABELS } from "../engines/labelMapper";
import {
  generateShareUrl,
  detectShareParam,
  decodeShare,
} from "../engines/shareUtils";
import { useSubscription } from "../contexts/SubscriptionContext";
import { parseProblem } from "../engines/problemParser";
import { generateLocalSteps } from "../engines/explanationEngine";
import {
  buildBaseSceneIR,
  applyStepToSceneIR,
} from "../engines/sceneIRBuilder";
import "./WorkspacePage.css";

// ── Default constraint params ─────────────────────
function defaultConstraintParams(type) {
  if (type === "cuboid") {
    return {
      constraintMode: "cuboid",
      cubeSize: 2,
      cuboidA: 2,
      cuboidB: 1.2,
      cuboidC: 2,
      freeEdgeLengths: {},
    };
  }
  return {
    constraintMode: "cube",
    cubeSize: 2,
    cuboidA: 2,
    cuboidB: 1.2,
    cuboidC: 2,
    freeEdgeLengths: {},
  };
}

export default function WorkspacePage() {
  const { checkCanGenerate, recordUsage, remaining, isPro, triggerPaywall } =
    useSubscription();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef(null);

  // ── Geometry state (from SolidGeometryPage) ──────
  const [geometry, setGeometry] = useState({
    type: "cube",
    params: { size: 2 },
    ...defaultConstraintParams("cube"),
  });
  const [showFaces, setShowFaces] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [visibleLines, setVisibleLines] = useState(() => new Set());
  const [hoveredLine, setHoveredLine] = useState(null);
  const [customLines, setCustomLines] = useState([]);
  const [shownLengthLabels, setShownLengthLabels] = useState(() => new Set());
  const [searchedLine, setSearchedLine] = useState("");
  const [edgeColorOverrides, setEdgeColorOverrides] = useState({});
  const [selectedEdge, setSelectedEdge] = useState(null);

  // ── Workspace state ──────────────────────────────
  const [problemText, setProblemText] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("idle"); // idle|preview|parsing|reasoning|done
  const [error, setError] = useState(null);
  const [pptLoading, setPptLoading] = useState(false);
  const [quickInput, setQuickInput] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState(null);
  const [cameraResetKey, setCameraResetKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef(null);
  const [shareToast, setShareToast] = useState("");

  // ── WebGL 支持检测（同步，无状态切换） ──────────
  const [hasWebGL] = useState(() => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch {
      return false;
    }
  });

  // ── Mobile ──────────────────────────────────────
  // Debounced resize to prevent Canvas remount on orientation change
  const [isMobile, setIsMobile] = useState(() => {
    try {
      return window.innerWidth <= 767;
    } catch {
      return false;
    }
  });
  const [show3D, setShow3D] = useState(true);
  // 移动端加载完成后默认折叠 3D，让学生先看讲解
  const [mobile3DAutoCollapsed, setMobile3DAutoCollapsed] = useState(false);
  useEffect(() => {
    if (
      isMobile &&
      loadingStage === "done" &&
      steps.length > 0 &&
      !mobile3DAutoCollapsed
    ) {
      setShow3D(false);
      setMobile3DAutoCollapsed(true);
    }
  }, [isMobile, loadingStage, steps.length, mobile3DAutoCollapsed]);

  useEffect(() => {
    let timer = null;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsMobile(window.innerWidth <= 767);
      }, 500);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(timer);
    };
  }, []);

  // ── Auto-parse from URL query / share link ────────
  useEffect(() => {
    const q = searchParams.get("q");
    const replay = searchParams.get("replay");
    const shareParam = detectShareParam();

    // 分享链接加载
    if (shareParam && !q) {
      const shared = decodeShare(shareParam);
      if (shared) {
        setProblemText(shared.text || "");
        if (shared.geometry) {
          setGeometry({
            type: shared.geometry.type || "cube",
            params: {
              size: shared.geometry.size || shared.geometry.params?.size || 2,
            },
            ...defaultConstraintParams(shared.geometry.type || "cube"),
          });
        }
        if (shared.steps) {
          setSteps(shared.steps);
          setParsedData(shared.parsedData || null);
          setCurrentStep(0);
          setLoadingStage("done");
        } else if (shared.text) {
          handleParseProblem(shared.text);
        }
        setShareToast("已加载分享的几何场景");
        setTimeout(() => setShareToast(""), 2500);
        return;
      }
    }

    if (q && q.trim()) {
      // 检查是否有历史回放数据（sessionStorage）
      if (replay === "1") {
        try {
          const savedSteps = sessionStorage.getItem("mathviz_replay_steps");
          const savedParsed = sessionStorage.getItem("mathviz_replay_parsed");
          if (savedSteps) {
            const steps = JSON.parse(savedSteps);
            const parsed = savedParsed ? JSON.parse(savedParsed) : null;
            setProblemText(q.trim());
            setSteps(steps);
            setParsedData(parsed);
            setCurrentStep(0);
            if (parsed) {
              setGeometry({
                type: parsed.type || "cube",
                params: { size: parsed.size || 2 },
                ...defaultConstraintParams(parsed.type || "cube"),
              });
            }
            setLoadingStage("done");
            // 清除回放数据
            sessionStorage.removeItem("mathviz_replay_steps");
            sessionStorage.removeItem("mathviz_replay_parsed");
            return;
          }
        } catch {
          /* fall through to normal parse */
        }
      }
      handleParseProblem(q.trim());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Custom vertices (free mode) ──────────────────
  const customVertices = useMemo(() => {
    if (!isPolyhedral(geometry.type)) return null;
    if (geometry.constraintMode === "free") {
      const modeParams = {
        size: geometry.params.size ?? 2,
        freeEdgeLengths: geometry.freeEdgeLengths || {},
      };
      return computeVerticesFromParams(geometry.type, "free", modeParams);
    }
    return null;
  }, [
    geometry.type,
    geometry.constraintMode,
    geometry.params.size,
    geometry.freeEdgeLengths,
  ]);

  // ── Reset on geometry type change ────────────────
  useEffect(() => {
    const { lines } = getLineDefinitions(
      geometry.type,
      geometry.params,
      customVertices
    );
    const defaults = new Set(
      lines
        .filter(
          (l) =>
            ["棱", "底面边", "顶面边", "侧棱"].includes(l.category) && !l.dashed
        )
        .map((l) => `${l.id}|${l.category}`)
    );
    setVisibleLines(defaults);
    setHoveredLine(null);
    setCustomLines([]);
    setShownLengthLabels(new Set());
    setSearchedLine("");
    setSelectedEdge(null);
    setEdgeColorOverrides({});
  }, [geometry.type]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Parse problem with local engine ──
  const handleParseProblem = useCallback(
    async (text) => {
      if (loading) return;

      setProblemText(text);
      setLoading(true);
      setLoadingStage("parsing");
      setError(null);
      setFollowUpAnswer(null);

      const totalStart = performance.now();

      try {
        // ── Phase 1: Local Parse — geometry via local engine ──
        const parseResult = parseProblem(text);
        console.log(
          `[perf] parseProblem: ${(performance.now() - totalStart).toFixed(0)}ms`
        );

        if (parseResult) {
          const parsedData = parseResult;
          setParsedData(parsedData);
          setGeometry({
            type: parsedData.type || "cube",
            params: { size: parsedData.size || 2 },
            ...defaultConstraintParams(parsedData.type || "cube"),
          });

          // ── Phase 2: Generate Steps — local step generation ──
          setLoadingStage("reasoning");
          const stepsStart = performance.now();
          const resultSteps = generateLocalSteps(text, parsedData);
          console.log(
            `[perf] generateLocalSteps: ${(performance.now() - stepsStart).toFixed(0)}ms`
          );

          setSteps(resultSteps);
          setCurrentStep(0);

          if (parsedData?.highlightLines?.length > 0) {
            const { lines: predefinedLines } = getLineDefinitions(
              parsedData.type || "cube",
              { size: parsedData.size || 2 }
            );
            const newCustomLines = [];
            parsedData.highlightLines.forEach((hl) => {
              const exists = predefinedLines.some(
                (l) => l.id === hl.label && l.category === "AI高亮"
              );
              if (!exists) {
                newCustomLines.push({
                  id: hl.label || `${hl.from}${hl.to}`,
                  category: "AI高亮",
                  from: hl.from,
                  to: hl.to,
                  dashed: false,
                  custom: true,
                });
              }
            });
            if (newCustomLines.length > 0) {
              setCustomLines(newCustomLines);
              setVisibleLines((prev) => {
                const next = new Set(prev);
                newCustomLines.forEach((l) =>
                  next.add(`${l.id}|${l.category}`)
                );
                return next;
              });
            }
          }

          await recordUsage("generate", text);
          console.log(
            `[perf] Total solve: ${(performance.now() - totalStart).toFixed(0)}ms`
          );

          try {
            const saved = JSON.parse(
              localStorage.getItem("mathviz_history") || "[]"
            );
            saved.unshift({
              date: new Date().toISOString(),
              text,
              type: parsedData.type || "cube",
              steps: resultSteps || [],
              parsedData,
            });
            if (saved.length > 50) saved.length = 50;
            localStorage.setItem("mathviz_history", JSON.stringify(saved));
          } catch (err) {
            console.warn(
              "WorkspacePage: Failed to save parse result to history",
              err
            );
          }
        } else {
          setError("题目解析失败，请尝试不同的描述方式。");
        }

        setLoadingStage("done");
      } catch (err) {
        const msg = err.message || "";
        let userError = "解析失败，请重试";
        if (
          msg.includes("fetch") ||
          msg.includes("network") ||
          msg.includes("Network")
        ) {
          userError = "网络连接失败，请检查网络后重试";
        } else if (msg.includes("timeout") || msg.includes("Timeout")) {
          userError = "处理超时，请尝试简化题目描述";
        } else if (msg) {
          userError = msg;
        }
        setError(userError);

        try {
          const fallbackParsed = {
            type: "cube",
            size: 2,
            labels: [],
            highlightLines: [],
            explanation: "",
          };
          setParsedData(fallbackParsed);
          const fallbackSteps = generateLocalSteps(text, fallbackParsed);
          setSteps(fallbackSteps);
          setCurrentStep(0);
          setGeometry({
            type: "cube",
            params: { size: 2 },
            ...defaultConstraintParams("cube"),
          });
          setError(null);

          try {
            const saved = JSON.parse(
              localStorage.getItem("mathviz_history") || "[]"
            );
            saved.unshift({
              date: new Date().toISOString(),
              text,
              type: "cube",
              steps: fallbackSteps,
              parsedData: fallbackParsed,
            });
            if (saved.length > 50) saved.length = 50;
            localStorage.setItem("mathviz_history", JSON.stringify(saved));
          } catch (err) {
            console.warn(
              "WorkspacePage: Failed to save fallback result to history",
              err
            );
          }
        } catch (fallbackErr) {
          console.warn(
            "WorkspacePage: Fallback parse also failed",
            fallbackErr
          );
          setError("题目解析失败，请尝试不同的描述方式。");
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, recordUsage]
  );

  // ── Geometry change (from GeometryMiniControls) ──

  const handleGeometryChange = useCallback((type, params) => {
    setGeometry({
      type,
      params: { size: params?.size ?? 2 },
      ...defaultConstraintParams(type),
    });
  }, []);

  const polyhedral = isPolyhedral(geometry.type);

  // ═══════════════════════════════════════════════════════
  //  以下变量严格按照依赖顺序声明 —— 前面的变量不能引用后面的变量
  // ═══════════════════════════════════════════════════════

  // ── (1) labelMap — 题目标签 → 内部索引映射 ─────────
  //  依赖: parsedData
  const labelMap = useMemo(() => {
    if (!parsedData?.vertices && !parsedData?.labels) return null;
    const userLabels = parsedData.vertices || parsedData.labels || null;
    const internalLabels =
      INTERNAL_LABELS[parsedData.type] || INTERNAL_LABELS.cube;
    return createLabelMap(userLabels, internalLabels);
  }, [parsedData]);

  // ── (2) vertexLabels — 自定义顶点标签（从题目解析）──
  //  依赖: labelMap
  const vertexLabels = useMemo(() => {
    if (!labelMap) return null;
    return labelMap.displayLabels;
  }, [labelMap]);

  // ── (3) visualIntent — Step→3D deterministic mapping ──
  //  依赖: steps, parsedData, problemText, labelMap
  const visualIntent = useMemo(() => {
    const step = steps[currentStep];
    if (!step || !parsedData) return null;
    return computeVisualIntent(step, parsedData, problemText, labelMap);
  }, [currentStep, steps, parsedData, problemText, labelMap]);

  // ── (3a) sceneIR — Step→3D 场景状态机 ──────────
  //  依赖: steps, parsedData
  const sceneIR = useMemo(() => {
    if (!steps.length || !parsedData?.type) return null;
    const base = buildBaseSceneIR(
      parsedData.type,
      { size: parsedData.size || 2 },
      parsedData.vertices || parsedData.labels || null
    );
    // 对当前步骤应用场景操作
    const step = steps[currentStep];
    if (step && step.sceneOps) {
      return applyStepToSceneIR(currentStep, step.type, step.sceneOps, base);
    }
    return base;
  }, [steps, currentStep, parsedData]);

  // ── (3b) 有效标签显示 — 渐进披露：第一步隐藏标签 ──
  const effectiveShowLabels = useMemo(() => {
    if (visualIntent?.hideLabels) return false;
    return showLabels;
  }, [visualIntent?.hideLabels, showLabels]);

  // ── (4) mergedLines — 合并的边定义 ─────────────────
  //  依赖: geometry, customVertices, vertexLabels, customLines, edgeColorOverrides
  const mergedLines = useMemo(() => {
    const { lines } = getLineDefinitions(
      geometry.type,
      geometry.params,
      customVertices,
      vertexLabels
    );
    const merged = [...lines, ...customLines];
    if (Object.keys(edgeColorOverrides).length > 0) {
      return merged.map((l) => {
        const key = `${l.id}|${l.category}`;
        return edgeColorOverrides[key]
          ? { ...l, colorOverride: edgeColorOverrides[key] }
          : l;
      });
    }
    return merged;
  }, [
    geometry.type,
    geometry.params.size,
    customLines,
    edgeColorOverrides,
    customVertices,
    vertexLabels,
  ]);

  // ── Step navigation ──────────────────────────────
  const handleStepClick = useCallback((index) => {
    setCurrentStep(index);
  }, []);

  const handleNextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // ── Quick input submit (workspace empty state) ──
  const handleQuickSubmit = useCallback(() => {
    const trimmed = quickInput.trim();
    if (trimmed.length < 3 || loading) return;
    handleParseProblem(trimmed);
  }, [quickInput, loading, handleParseProblem]);

  const handleQuickKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleQuickSubmit();
      }
    },
    [handleQuickSubmit]
  );

  // ── PPT 导出 ───────────────────────────────────
  const handleExportPPT = useCallback(async () => {
    if (!canvasRef.current) return;
    setPptLoading(true);
    try {
      const { generatePPT } = await import("../engines/pptExporter");
      await generatePPT(
        { problemText, steps, parsedData, geometry },
        canvasRef.current
      );
    } catch (err) {
      console.error("PPT export failed:", err);
    } finally {
      setPptLoading(false);
    }
  }, [problemText, steps, parsedData, geometry]);

  // ── 追问 ──
  const handleAskFollowUp = useCallback(
    async (question) => {
      setFollowUpLoading(true);
      setFollowUpAnswer(null);
      try {
        const combinedText = `${problemText}\n\n追问：${question}`;
        const parseResult = parseProblem(combinedText);
        if (parseResult) {
          const steps = generateLocalSteps(combinedText, parseResult);
          if (steps.length > 0) {
            setFollowUpAnswer(
              steps[0].content || steps[0].title || "抱歉，无法回答这个问题。"
            );
          } else {
            setFollowUpAnswer("抱歉，无法回答这个问题，请尝试换一种方式提问。");
          }
        } else {
          setFollowUpAnswer("抱歉，无法回答这个问题，请尝试换一种方式提问。");
        }
      } catch {
        setFollowUpAnswer("追问失败，请重试。");
      } finally {
        setFollowUpLoading(false);
      }
    },
    [problemText]
  );

  // ── 重置视角 ──
  const handleResetCamera = useCallback(() => {
    setCameraResetKey((k) => k + 1);
  }, []);

  // ── 自动回放 ──
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (prev) {
        // 停止
        if (playTimerRef.current) clearTimeout(playTimerRef.current);
        return false;
      }
      return true;
    });
  }, []);

  useEffect(() => {
    if (!isPlaying || steps.length === 0) return;
    const advance = () => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next >= steps.length) {
          setIsPlaying(false);
          return prev;
        }
        playTimerRef.current = setTimeout(advance, 3500);
        return next;
      });
    };
    playTimerRef.current = setTimeout(advance, 2000);
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, steps.length]);

  // ── 重试 ──
  const handleRetry = useCallback(() => {
    if (!problemText || loading) return;
    setError(null);
    setLoadingStage("idle");
    handleParseProblem(problemText);
  }, [problemText, loading, handleParseProblem]);

  // ── 截图导出 ──
  const handleScreenshot = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2,
        backgroundColor: "#f8f9fb",
      });
      const link = document.createElement("a");
      link.download = `几何维度-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Fallback: canvas.toDataURL
      const canvas = canvasRef.current?.querySelector("canvas");
      if (canvas) {
        const link = document.createElement("a");
        link.download = `几何维度-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    }
  }, []);

  // ── 分享链接 ──
  const handleShare = useCallback(async () => {
    const shareData = {
      text: problemText,
      geometry: { type: geometry.type, params: geometry.params },
      steps: steps.length > 0 ? steps : undefined,
      parsedData: parsedData,
    };
    const url = generateShareUrl(shareData);
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setShareToast("链接已复制，可发送给朋友");
    } catch {
      // Fallback: show in prompt
      setShareToast(url);
    }
    setTimeout(() => setShareToast(""), 3000);
  }, [problemText, geometry, steps, parsedData]);

  return (
    <div className="workspace-page">
      <div className="wp-top-bar">
        <Link to="/" className="wp-back-link">
          ← 返回首页
        </Link>
        <span className="wp-top-title">
          {problemText
            ? problemText.slice(0, 50) + (problemText.length > 50 ? "…" : "")
            : "几何维度"}
        </span>
        <div className="wp-top-actions">
          {/* 移动端 3D 切换 */}
          {isMobile && (
            <button
              className="wp-toggle-3d"
              onClick={() => setShow3D((prev) => !prev)}
            >
              {show3D ? "隐藏 3D" : "显示 3D"}
            </button>
          )}
        </div>
      </div>

      {/* ── 升级引导条（免费用户剩余不足时） ── */}
      {!isPro && problemText && !loading && remaining <= 5 && remaining > 0 && (
        <div className="wp-upgrade-banner">
          <span className="wp-upgrade-banner-text">
            今日还剩 <strong>{remaining}</strong> 次免费使用
          </span>
          <button
            className="wp-upgrade-banner-btn"
            onClick={() => triggerPaywall("免费额度即将用完，升级解锁无限使用")}
          >
            升级无限使用 →
          </button>
        </div>
      )}
      {!isPro && remaining === 0 && (
        <div className="wp-upgrade-banner danger">
          <span className="wp-upgrade-banner-text">今日免费次数已用完</span>
          <button
            className="wp-upgrade-banner-btn"
            onClick={() => triggerPaywall("已达每日使用上限，升级继续使用")}
          >
            升级继续使用 →
          </button>
        </div>
      )}

      {/* ── Quick input: workspace 空状态 ── */}
      {!problemText && !loading && (
        <div className="wp-empty-state">
          <div className="wp-quick-input-bar">
            <textarea
              className="wp-quick-input"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={handleQuickKeyDown}
              placeholder="输入一道几何题开始解析…"
              rows={2}
              spellCheck={false}
            />
            <button
              className="wp-quick-submit"
              onClick={handleQuickSubmit}
              disabled={quickInput.trim().length < 3}
            >
              解析
            </button>
          </div>
          <div className="wp-empty-examples">
            <span className="wp-empty-examples-label">快速体验</span>
            <div className="wp-empty-examples-row">
              {[
                {
                  text: "正方体棱长为2，求体对角线AG的长度",
                  label: "正方体对角线",
                },
                { text: "球体半径为3，求体积和表面积", label: "球体体积" },
                { text: "正四棱锥底面边长4，高6，求体积", label: "棱锥体积" },
              ].map((ex) => (
                <button
                  key={ex.label}
                  className="wp-empty-example-btn"
                  onClick={() => handleParseProblem(ex.text)}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Unified layout: single Canvas, CSS-driven responsive ── */}
      <div className={`wp-main ${isMobile ? "wp-main--mobile" : ""}`}>
        {/* 讲解面板（左侧/上方） */}
        <div className="wp-explain-col">
          <ExplanationPanel
            steps={steps}
            currentStep={currentStep}
            onStepClick={handleStepClick}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            loading={loading}
            loadingStage={loadingStage}
            parsedData={parsedData}
            problemText={problemText}
            error={error}
            onRetry={handleRetry}
            onAskFollowUp={handleAskFollowUp}
            followUpLoading={followUpLoading}
            followUpAnswer={followUpAnswer}
            onPlay={steps.length > 0 ? handleTogglePlay : undefined}
            isPlaying={isPlaying}
          />
        </div>

        {/* 3D 场景（右侧/下方）— 全生命周期只 mount 一次，用 CSS display 控制显隐 */}
        <div
          className={`wp-canvas-col ${isMobile && !show3D ? "wp-canvas--hidden" : ""}`}
          ref={canvasRef}
        >
          {hasWebGL ? (
            <Canvas
              style={{ width: "100%", height: "100%" }}
              gl={{
                preserveDrawingBuffer: true,
                antialias: true,
                powerPreference: "high-performance",
              }}
              dpr={[1, 2]}
            >
              <Canvas3D
                geometry={geometry}
                showFaces={showFaces}
                showLabels={effectiveShowLabels}
                visibleLines={visibleLines}
                hoveredLine={hoveredLine}
                setHoveredLine={setHoveredLine}
                allLines={mergedLines}
                shownLengthLabels={shownLengthLabels}
                searchedLine={searchedLine}
                selectedEdge={selectedEdge}
                onEdgeClick={setSelectedEdge}
                edgeColorOverrides={edgeColorOverrides}
                customVertices={customVertices}
                sceneIR={sceneIR}
                highlightEdgeIds={visualIntent?.highlightEdgeIds || []}
                highlightColor={visualIntent?.highlightColor || "#FF6B6B"}
                auxLines={visualIntent?.auxLines || []}
                faceOpacity={visualIntent?.faceOpacity ?? 0.42}
                nonHighlightOpacity={visualIntent?.nonHighlightOpacity ?? 0.25}
                vertexLabels={vertexLabels}
                cameraResetKey={cameraResetKey}
                sphereOverlay={visualIntent?.sphereOverlay || null}
              />
            </Canvas>
          ) : (
            <div className="wp-webgl-fallback">
              <span className="wp-webgl-fallback-icon">⚠️</span>
              <p>您的浏览器不支持 WebGL，无法显示 3D 场景</p>
              <p className="wp-webgl-fallback-hint">
                请使用最新版 Chrome、Edge 或 Firefox
              </p>
            </div>
          )}
          <GeometryMiniControls
            geometry={geometry}
            onGeometryChange={handleGeometryChange}
            showFaces={showFaces}
            onToggleFaces={() => setShowFaces((prev) => !prev)}
            showLabels={effectiveShowLabels}
            onToggleLabels={() => setShowLabels((prev) => !prev)}
            onResetCamera={handleResetCamera}
            onScreenshot={handleScreenshot}
            onShare={handleShare}
          />
        </div>
      </div>

      {typeof TeacherModePanel !== "undefined" ? (
        <TeacherModePanel
          totalSteps={steps.length}
          currentStep={currentStep}
          onStepChange={handleStepClick}
          onExportPPT={handleExportPPT}
          pptLoading={pptLoading}
        />
      ) : null}
      {/* ── Share toast ── */}
      {shareToast && (
        <div className="wp-share-toast">
          <span className="wp-share-toast-text">{shareToast}</span>
          {shareToast.startsWith("http") && (
            <button
              className="wp-share-toast-copy"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareToast);
                  setShareToast("链接已复制！");
                } catch {
                  /* */
                }
                setTimeout(() => setShareToast(""), 2000);
              }}
            >
              点此复制
            </button>
          )}
        </div>
      )}
    </div>
  );
}
