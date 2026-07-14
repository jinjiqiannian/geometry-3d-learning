import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import Canvas3D from "../features/solid-geometry/Canvas3D";
import GeometryMiniControls from "../components/GeometryMiniControls";
import { MEASURE_MODES } from "../features/solid-geometry/MeasureTool";
import { ANNOTATION_MODES } from "../features/solid-geometry/AnnotationTool";
import { VIEW_PRESETS } from "../features/solid-geometry/ViewControl";
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
import { useSupabase } from "../contexts/SupabaseContext";
import { useTheme } from "../contexts/ThemeContext";
import { parseProblemSync } from "../engines/problemParser";
import { generateLocalSteps } from "../engines/explanationEngine";
import { aiAPI } from "../services/api";
import {
  buildBaseSceneIR,
  applyStepToSceneIR,
  buildSceneIRFromSemantic,
  buildSceneIRSequenceFromSemantic,
} from "../engines/sceneIRBuilder";
import {
  validateAndCompleteSemantic,
  convertLegacyParsedToSemantic,
  parseProblemToSemantic,
} from "../engines/geometryValidator";
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

/**
 * 将 AI sceneState 转换为 sceneOps 格式
 * sceneState 来自后端 DeepSeek 推理结果
 * sceneOps 是 sceneIRBuilder 可消费的格式
 */
function convertSceneStateToOps(sceneState) {
  if (!sceneState) return null;
  const ops = {
    highlightLines: [],
    addAuxLines: [],
    fadeLines: [],
    showLabels: [],
  };

  // 高亮边：{from, to} → id
  if (sceneState.highlightEdges) {
    ops.highlightLines = sceneState.highlightEdges.map(e => {
      if (typeof e === 'string') return e;
      return `${e.from}${e.to}`;
    });
  }

  // 辅助线
  if (sceneState.showAuxiliaryLines) {
    ops.addAuxLines = sceneState.showAuxiliaryLines.map(aux => ({
      from: { pointId: aux.from },
      to: { pointId: aux.to },
      dashed: aux.dashed !== false,
      color: aux.color || '#8b5cf6',
    }));
  }

  // 标签
  if (sceneState.showLabels) {
    ops.showLabels = sceneState.showLabels;
  }

  return ops;
}

export default function WorkspacePage() {
  const { isGuest } = useSupabase();
  const { checkCanGenerate, recordUsage, remaining, isPro, triggerPaywall } =
    useSubscription();
  const { isDark } = useTheme();
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

  // ── Tool states ──────────────────────────────────
  const [measureMode, setMeasureMode] = useState(MEASURE_MODES.NONE);
  const [measurements, setMeasurements] = useState([]);
  const [annotationMode, setAnnotationMode] = useState(ANNOTATION_MODES.NONE);
  const [annotations, setAnnotations] = useState([]);
  const [labelText, setLabelText] = useState("");
  const [activeCut, setActiveCut] = useState(null);
  const [viewPreset, setViewPreset] = useState(VIEW_PRESETS.DEFAULT);

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

  // ── Streaming state ────────────────────────────────
  const [streamingReasoning, setStreamingReasoning] = useState("");
  const [streamingDone, setStreamingDone] = useState(false);
  const abortStreamRef = useRef(null);
  const streamingReasoningRef = useRef(""); // 跟踪最新推理文本，避免闭包陈旧

  // ── 常驻搜索栏 state ───────────────────────────────
  const [searchInput, setSearchInput] = useState("");

  // ── WebGL 支持检测（同步，无状态切换） ──────────
  const [hasWebGL] = useState(() => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch {
      return false;
    }
  });

  // ── 首次使用引导 ────────────────────────────────
  const FIRST_VISIT_KEY = 'mathviz:first_visit'
  const [showGuide, setShowGuide] = useState(() => {
    try { return !localStorage.getItem(FIRST_VISIT_KEY) } catch { return false }
  })
  const dismissGuide = useCallback(() => {
    try { localStorage.setItem(FIRST_VISIT_KEY, '1') } catch { /* ignore */ }
    setShowGuide(false)
  }, [])

  // ── Mobile ──────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => {
    try {
      return window.innerWidth <= 767;
    } catch {
      return false;
    }
  });
  const [show3D, setShow3D] = useState(true);
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

  // ── cleanup: abort stream on unmount ──────────────
  useEffect(() => {
    return () => {
      if (abortStreamRef.current) {
        abortStreamRef.current();
        abortStreamRef.current = null;
      }
    };
  }, []);

  // ── Auto-parse from URL query / share link ────────
  useEffect(() => {
    const q = searchParams.get("q");
    const replay = searchParams.get("replay");
    const shareParam = detectShareParam();

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
            sessionStorage.removeItem("mathviz_replay_steps");
            sessionStorage.removeItem("mathviz_replay_parsed");
            return;
          }
        } catch {
          /* fall through to normal parse */
        }
      }
      handleParseProblem(q.trim(), { useLocalOnly: false });
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

  // ── Parse problem: useLocalOnly=true → 本地模板, false → AI 流式 ──
  const handleParseProblem = useCallback(
    async (text, { useLocalOnly = false } = {}) => {
      if (loading) return;

      setProblemText(text);
      setLoading(true);
      setLoadingStage("parsing");
      setError(null);
      setFollowUpAnswer(null);
      setStreamingReasoning("");
      setStreamingDone(false);

      const totalStart = performance.now();

      try {
        // ── 例题模式：仅本地引擎（不调 AI）──
        if (useLocalOnly) {
          setLoadingStage("parsing");
          const semantic = parseProblemToSemantic(text);
          const parsedData = {
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
          };
          const resultSteps = generateLocalSteps(text, parsedData);
          applyResults(parsedData, resultSteps);
          try { await recordUsage("generate", text); } catch {}
          saveToHistory(text, parsedData, resultSteps);
          console.log(`[perf] Total solve (local only): ${(performance.now() - totalStart).toFixed(0)}ms`);
          setLoadingStage("done");
          setLoading(false);
          return;
        }

        // ── 用户搜题模式：仅 AI 流式解题（不降级到本地模板）──
        setLoadingStage("reasoning");
        setStreamingReasoning("");
        setStreamingDone(false);

        const abort = aiAPI.solveStream(text, {
          onParsed: (parsed) => {
            setParsedData(parsed);
            setGeometry({
              type: parsed.type || "cube",
              params: { size: parsed.size || 2 },
              ...defaultConstraintParams(parsed.type || "cube"),
            });
          },
          onReasoning: (chunk) => {
            streamingReasoningRef.current += chunk;
            setStreamingReasoning(streamingReasoningRef.current);
          },
          onComplete: ({ parsed, steps: resultSteps }) => {
            setStreamingDone(true);

            if (parsed) {
              // 保存推理过程到 parsedData，让 collapsible "AI 推理过程" 能显示
              const parsedWithReasoning = {
                ...parsed,
                aiReasoning: streamingReasoningRef.current || parsed.aiReasoning || '',
              };
              setParsedData(parsedWithReasoning);
              setGeometry({
                type: parsed.type || "cube",
                params: { size: parsed.size || 2 },
                ...defaultConstraintParams(parsed.type || "cube"),
              });
              setSteps(resultSteps);
              setCurrentStep(0);

              if (parsed?.highlightLines?.length > 0) {
                const { lines: predefinedLines } = getLineDefinitions(
                  parsed.type || "cube", { size: parsed.size || 2 }
                );
                const newCustomLines = [];
                parsed.highlightLines.forEach((hl) => {
                  const exists = predefinedLines.some(
                    (l) => l.id === hl.label && l.category === "AI高亮"
                  );
                  if (!exists) {
                    newCustomLines.push({
                      id: hl.label || `${hl.from}${hl.to}`,
                      category: "AI高亮", from: hl.from, to: hl.to,
                      dashed: false, custom: true,
                    });
                  }
                });
                if (newCustomLines.length > 0) {
                  setCustomLines(newCustomLines);
                  setVisibleLines((prev) => {
                    const next = new Set(prev);
                    newCustomLines.forEach((l) => next.add(`${l.id}|${l.category}`));
                    return next;
                  });
                }
              }

              setLoadingStage("done");
              console.log(`[perf] Total solve (AI stream): ${(performance.now() - totalStart).toFixed(0)}ms`);
              try { recordUsage("generate", text); } catch {}
              saveToHistory(text, parsed, resultSteps);
            }
            setLoading(false);
          },
          onError: (err) => {
            setError(null);
            console.warn("AI 解题失败，降级到本地模板:", err.message);
            const semantic = parseProblemToSemantic(text);
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
            };
            const fallbackSteps = generateLocalSteps(text, fallbackParsed);
            applyResults(fallbackParsed, fallbackSteps);
            saveToHistory(text, fallbackParsed, fallbackSteps);
            setLoadingStage("done");
            setLoading(false);
          },
        });

        abortStreamRef.current = abort;
      } catch (err) {
        const msg = err.message || "";
        setError(null);
        console.warn("解析异常，降级到本地模板:", msg);
        const semantic = parseProblemToSemantic(text);
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
        };
        const fallbackSteps = generateLocalSteps(text, fallbackParsed);
        applyResults(fallbackParsed, fallbackSteps);
        saveToHistory(text, fallbackParsed, fallbackSteps);
        setLoadingStage("done");
        setLoading(false);
      }
    },
    [loading, recordUsage]
  );

  // ── Helper: Apply parsed data + steps to state ──
  function applyResults(parsedData, resultSteps) {
    setParsedData(parsedData);
    setGeometry({
      type: parsedData.type || "cube",
      params: { size: parsedData.size || 2 },
      ...defaultConstraintParams(parsedData.type || "cube"),
    });
    setSteps(resultSteps);
    setCurrentStep(0);

    if (parsedData?.highlightLines?.length > 0) {
      const { lines: predefinedLines } = getLineDefinitions(
        parsedData.type || "cube", { size: parsedData.size || 2 }
      );
      const newCustomLines = [];
      parsedData.highlightLines.forEach((hl) => {
        const exists = predefinedLines.some(
          (l) => l.id === hl.label && l.category === "AI高亮"
        );
        if (!exists) {
          newCustomLines.push({
            id: hl.label || `${hl.from}${hl.to}`,
            category: "AI高亮", from: hl.from, to: hl.to,
            dashed: false, custom: true,
          });
        }
      });
      if (newCustomLines.length > 0) {
        setCustomLines(newCustomLines);
        setVisibleLines((prev) => {
          const next = new Set(prev);
          newCustomLines.forEach((l) => next.add(`${l.id}|${l.category}`));
          return next;
        });
      }
    }
  }

  // ── Helper: Save to localStorage history ──
  function saveToHistory(text, parsedData, resultSteps) {
    try {
      const saved = JSON.parse(localStorage.getItem("mathviz_history") || "[]");
      saved.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 10),
        date: new Date().toISOString(),
        text,
        type: parsedData?.type || "cube",
        steps: resultSteps || [],
        parsedData: parsedData || {},
      });
      if (saved.length > 50) saved.length = 50;
      localStorage.setItem("mathviz_history", JSON.stringify(saved));
    } catch (err) {
      console.warn("WorkspacePage: Failed to save to history", err);
    }
  }

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
    
    const semantic = convertLegacyParsedToSemantic(parsedData, steps);
    const irSequence = buildSceneIRSequenceFromSemantic(semantic);
    
    if (irSequence.length > 0) {
      const index = Math.min(currentStep, irSequence.length - 1);
      return irSequence[index];
    }
    
    const base = buildBaseSceneIR(
      parsedData.type,
      { size: parsedData.size || 2 },
      semantic.roleMap,
      semantic.pointPositions,
      semantic.edges
    );
    const step = steps[currentStep];
    if (step) {
      const ops = step.sceneState ? convertSceneStateToOps(step.sceneState) : step.sceneOps;
      if (ops) {
        return applyStepToSceneIR(currentStep, step.type, ops, base);
      }
    }
    return base;
  }, [steps, currentStep, parsedData]);

  // ── (3b) 有效标签显示 — 渐进披露：第一步隐藏标签 ──
  const effectiveShowLabels = useMemo(() => {
    if (visualIntent?.hideLabels) return false;
    return showLabels;
  }, [visualIntent?.hideLabels, showLabels]);

  // ── (3c) cameraTarget — 步骤类型对应的 3D 相机自动飞行目标 ──
  const STEP_CAMERA_PRESETS = {
    observation:  [4, 4, 6],
    conceptual:   [4, 4, 6],
    construction: [2.5, 2, 3.5],
    calculation:  [1, 3, 5],
    conclusion:   [5, 3, 5],
  };
  const cameraTarget = useMemo(() => {
    const step = steps[currentStep];
    if (!step) return null;
    return STEP_CAMERA_PRESETS[step.type] || STEP_CAMERA_PRESETS.observation;
  }, [steps, currentStep]);

  // ── (4) mergedLines — 合并的边定义 ─────────────────
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

  // ── 常驻搜索栏提交 ──
  const handleSearchSubmit = useCallback(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length < 3 || loading) return;
    handleParseProblem(trimmed, { useLocalOnly: false });
  }, [searchInput, loading, handleParseProblem]);

  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSearchSubmit();
      }
    },
    [handleSearchSubmit]
  );

  // ── Quick input submit (workspace empty state) ──
  const handleQuickSubmit = useCallback(() => {
    const trimmed = quickInput.trim();
    if (trimmed.length < 3 || loading) return;
    handleParseProblem(trimmed, { useLocalOnly: false });
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
        const parseResult = parseProblemSync(combinedText);
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

  // ── 再来一题 ──
  const PRACTICE_EXAMPLES = [
    { text: "正方体棱长为2，求体对角线AG的长度", label: "正方体对角线" },
    { text: "球体半径为3，求体积和表面积", label: "球体体积" },
    { text: "正四棱锥底面边长4，高6，求体积", label: "棱锥体积" },
    { text: "圆柱底面半径2，高5，求侧面积和体积", label: "圆柱体积" },
    { text: "圆锥底面半径3，高4，求体积和母线长", label: "圆锥体积" },
  ]
  const handlePracticeMore = useCallback(() => {
    const others = PRACTICE_EXAMPLES.filter(ex => ex.text !== problemText)
    const pick = others[Math.floor(Math.random() * others.length)]
    if (pick) handleParseProblem(pick.text)
  }, [problemText, handleParseProblem])

  // ── 键盘快捷键 ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          handlePrevStep()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNextStep()
          break
        case ' ':
          if (steps.length > 0) {
            e.preventDefault()
            handleTogglePlay()
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrevStep, handleNextStep, handleTogglePlay, steps.length])

  // ── 截图导出 ──
  const handleScreenshot = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2,
        backgroundColor: isDark ? "#161616" : "#f8f9fb",
      });
      const link = document.createElement("a");
      link.download = `几何维度-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      const canvas = canvasRef.current?.querySelector("canvas");
      if (canvas) {
        const link = document.createElement("a");
        link.download = `几何维度-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    }
  }, [isDark]);

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
      setShareToast(url);
    }
    setTimeout(() => setShareToast(""), 3000);
  }, [problemText, geometry, steps, parsedData]);

  return (
    <div className="workspace-page">

      {/* ── 搜索栏 ── */}
      <div className="wp-search-bar">
        <div className="wp-search-row">
          <Link to="/math" className="wp-search-back" title="返回首页">←</Link>
          <textarea
            className="wp-search-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="输入一道几何题，AI 将为你解析…"
            rows={1}
            spellCheck={false}
            disabled={loading}
          />
          <button
            className="wp-search-submit"
            onClick={handleSearchSubmit}
            disabled={searchInput.trim().length < 3 || loading}
          >
            {loading ? (loadingStage === "reasoning" ? "AI 推理中…" : "解析中…") : "解析"}
          </button>
          {isMobile && (
            <button
              className="wp-search-3d-toggle"
              onClick={() => setShow3D((prev) => !prev)}
              title={show3D ? "隐藏 3D" : "显示 3D"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
                <path d="M2 7l10 5 10-5" />
                <path d="M12 22V12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── 升级引导条 ── */}
      {!isPro && problemText && !loading && remaining <= 5 && remaining > 0 && (
        <div className="wp-upgrade-banner">
          <span className="wp-upgrade-banner-text">
            今日还剩 <strong>{remaining}</strong> 次免费使用
          </span>
          {isGuest ? (
            <button
              className="wp-upgrade-banner-btn"
              onClick={() => document.dispatchEvent(new CustomEvent('mathviz:show-auth'))}
            >
              登录增加额度 →
            </button>
          ) : (
            <button
              className="wp-upgrade-banner-btn"
              onClick={() => triggerPaywall("免费额度即将用完，升级解锁无限使用")}
            >
              升级无限使用 →
            </button>
          )}
        </div>
      )}
      {!isPro && remaining === 0 && (
        <div className="wp-upgrade-banner danger">
          <span className="wp-upgrade-banner-text">今日免费次数已用完</span>
          <div className="wp-upgrade-banner-actions">
            {isGuest && (
              <button
                className="wp-upgrade-banner-btn"
                onClick={() => document.dispatchEvent(new CustomEvent('mathviz:show-auth'))}
              >
                登录继续使用
              </button>
            )}
            <button
              className={`wp-upgrade-banner-btn ${isGuest ? 'secondary' : ''}`}
              onClick={() => triggerPaywall("已达每日使用上限，升级继续使用")}
            >
              升级{isGuest ? ' →' : '继续使用 →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Quick input: workspace 空状态（仅示例按钮） ── */}
      {!problemText && !loading && (
        <div className="wp-empty-state">
          <div className="wp-empty-examples">
            <span className="wp-empty-examples-label">快速体验（本地模板）</span>
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
                  onClick={() => handleParseProblem(ex.text, { useLocalOnly: true })}
                >
                  {ex.label} ✦
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Unified layout: single Canvas, CSS-driven responsive ── */}
      <div className={`wp-main ${isMobile ? "wp-main--mobile" : ""}`}>
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
            streamingReasoning={streamingReasoning}
            streamingDone={streamingDone}
            onPracticeMore={handlePracticeMore}
          />
        </div>

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
                cameraTarget={cameraTarget}
                isDark={isDark}
                measureMode={measureMode}
                measurements={measurements}
                annotationMode={annotationMode}
                annotations={annotations}
                activeCut={activeCut}
                viewPreset={viewPreset}
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

      {/* ── 首次使用引导 ── */}
      {showGuide && (
        <div className="wp-guide-overlay" onClick={dismissGuide}>
          <div className="wp-guide-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="wp-guide-title">👋 欢迎来到几何维度</h2>
            <p className="wp-guide-subtitle">三步开始学习：</p>
            <div className="wp-guide-steps">
              <div className="wp-guide-step">
                <span className="wp-guide-step-num">1</span>
                <div>
                  <strong>输入题目</strong>
                  <p>在上方输入框中输入一道几何题，点击"解析"</p>
                </div>
              </div>
              <div className="wp-guide-step">
                <span className="wp-guide-step-num">2</span>
                <div>
                  <strong>查看步骤</strong>
                  <p>AI 将分步讲解，每步都有公式和计算过程</p>
                </div>
              </div>
              <div className="wp-guide-step">
                <span className="wp-guide-step-num">3</span>
                <div>
                  <strong>探索 3D</strong>
                  <p>右侧的 3D 模型可以旋转缩放，直观理解空间关系</p>
                </div>
              </div>
            </div>
            <button className="wp-guide-btn" onClick={dismissGuide}>
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
