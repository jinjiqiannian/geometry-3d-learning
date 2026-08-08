import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import Canvas3D from "../features/solid-geometry/Canvas3D";
import GeometryMiniControls from "../components/GeometryMiniControls";
import { MEASURE_MODES } from "../features/solid-geometry/MeasureTool";
import { ANNOTATION_MODES } from "../features/solid-geometry/AnnotationTool";
import { VIEW_PRESETS } from "../features/solid-geometry/ViewControl";
import ExplanationPanel from "../components/ExplanationPanel";
import LogicPanel from "../components/LogicPanel";
import TopicPanel from "../components/TopicPanel";
import TeacherModePanel from "../components/TeacherModePanel";
import { getLineDefinitions } from "../engines/lineDefinitions";
import { isPolyhedral } from "../engines/geometryEngine";
import { applyConstraints } from "../engines/geometryValidator";
import { computeVisualIntent } from "../engines/visualIntent";
import { AnimationController } from "../engines/animationController";

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
import { mergeVisionHints } from "../engines/mergeVisionHints";
import {
  mergeConsecutiveSteps,
  mapCurrentStepToMergedIndex,
} from "../components/mergeConsecutiveSteps";
import {
  detectSubject,
  resolveSubjectNav,
  HUB_SAMPLES,
  getSubjectLabel,
} from "../engines/subjectRouter.js";
import "./WorkspacePage.css";
import "../components/LogicPanel.css";

function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

/** 浏览器本地 OCR（CDN 加载 tesseract，不新增 npm 依赖） */
function loadTesseractFromCdn() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("非浏览器环境"));
  }
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-tesseract]");
    if (existing) {
      if (window.Tesseract) {
        resolve(window.Tesseract);
        return;
      }
      // 脚本已失败或卡住时，监听不会再触发 → 直接拒绝，避免永久挂起
      if (existing.dataset.tesseractFailed === "1") {
        reject(new Error("OCR 脚本加载失败"));
        return;
      }
      const onLoad = () => {
        if (window.Tesseract) resolve(window.Tesseract);
        else reject(new Error("OCR 引擎未就绪"));
      };
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener(
        "error",
        () => {
          existing.dataset.tesseractFailed = "1";
          reject(new Error("OCR 脚本加载失败"));
        },
        { once: true }
      );
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    s.async = true;
    s.dataset.tesseract = "1";
    s.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else reject(new Error("OCR 引擎未就绪"));
    };
    s.onerror = () => {
      s.dataset.tesseractFailed = "1";
      reject(new Error("OCR 脚本加载失败"));
    };
    document.head.appendChild(s);
  });
}

async function runLocalImageOcr(dataUrl) {
  const Tesseract = await withTimeout(
    loadTesseractFromCdn(),
    12000,
    "本地 OCR 引擎加载超时"
  );
  const result = await withTimeout(
    Tesseract.recognize(dataUrl, "chi_sim+eng", { logger: () => {} }),
    25000,
    "本地识别超时（中文模型下载较慢或网络受限）"
  );
  return (result?.data?.text || "").replace(/\s+\n/g, "\n").trim();
}

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
    ops.highlightLines = sceneState.highlightEdges.map((e) => {
      if (typeof e === "string") return e;
      return `${e.from}${e.to}`;
    });
  }

  // 辅助线
  if (sceneState.showAuxiliaryLines) {
    ops.addAuxLines = sceneState.showAuxiliaryLines.map((aux) => ({
      from: { pointId: aux.from },
      to: { pointId: aux.to },
      dashed: aux.dashed !== false,
      color: aux.color || "#8b5cf6",
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
  const { checkCanGenerate, recordUsage, remaining, isPro, triggerPaywall, checkCanExportPpt } =
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

  // ── 领域平级：数学 | 物理；物理 大组 → 专题 ──
  const [domain, setDomain] = useState("math"); // math | physics
  const [mathTopic, setMathTopic] = useState("combo"); // combo | geometry | derivative | conic
  const [physicsGroup, setPhysicsGroup] = useState("mechanics"); // mechanics | electro
  const [physicsTopic, setPhysicsTopic] = useState("phys_motion");
  const subject = domain === "physics" ? physicsTopic : mathTopic;

  /** 统一入口：首屏 Hub；解题后才强调专题 Tab */
  const [hubActive, setHubActive] = useState(true);
  const [showTopicNav, setShowTopicNav] = useState(false);
  const [panelBoot, setPanelBoot] = useState(null);
  const [routeHint, setRouteHint] = useState("");

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
  const [cameraResetKey, setCameraResetKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef(null);
  const [shareToast, setShareToast] = useState("");
  const animationControllerRef = useRef(null);

  // ── Streaming state ────────────────────────────────
  const [streamingReasoning, setStreamingReasoning] = useState("");
  const [streamingDone, setStreamingDone] = useState(false);
  const abortStreamRef = useRef(null);
  const streamingReasoningRef = useRef(""); // 跟踪最新推理文本，避免闭包陈旧

  // ── 常驻搜索栏 / 拍照识题 ─────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [composeImage, setComposeImage] = useState(null);
  const [ocrHint, setOcrHint] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  /** 智谱 VL 构图 hint；合并时文字优先 */
  const visionHintsRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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
  const FIRST_VISIT_KEY = "mathviz:first_visit";
  const [showGuide, setShowGuide] = useState(() => {
    try {
      return !localStorage.getItem(FIRST_VISIT_KEY);
    } catch {
      return false;
    }
  });
  const dismissGuide = useCallback(() => {
    try {
      localStorage.setItem(FIRST_VISIT_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowGuide(false);
  }, []);

  // ── Mobile ──────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => {
    try {
      return window.innerWidth <= 767;
    } catch {
      return false;
    }
  });
  const [show3D, setShow3D] = useState(true);

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
      return applyConstraints(geometry.type, "free", modeParams);
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
            (["棱", "底面边", "顶面边", "侧棱"].includes(l.category) &&
              !l.dashed) ||
            l.category === "空间对角线"
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
      setStreamingReasoning("");
      setStreamingDone(false);

      const totalStart = performance.now();

      try {
        // ── 例题模式：仅本地引擎（不调 AI、不占免费额度）──
        if (useLocalOnly) {
          setLoadingStage("parsing");
          const semantic = parseProblemToSemantic(text);
          const parsedData = {
            type: semantic.shape,
            size: semantic.size,
            labels: semantic.points,
            vertices: semantic.points,
            relations: semantic.relations || [],
            planes: semantic.planes || [],
            importantPlanes: semantic.importantPlanes || [],
            highlightLines: semantic.importantLines.map((l) => ({
              from: l[0],
              to: l[1],
              label: l,
            })),
            explanation: semantic.shape,
            semantic,
          };
          const resultSteps = generateLocalSteps(text, parsedData);
          applyResults(parsedData, resultSteps);
          saveToHistory(text, parsedData, resultSteps);
          console.log(
            `[perf] Total solve (local only): ${(performance.now() - totalStart).toFixed(0)}ms`
          );
          setLoadingStage("done");
          setLoading(false);
          return;
        }

        if (!checkCanGenerate()) {
          setLoading(false);
          setLoadingStage("idle");
          return;
        }

        // ── 用户搜题模式：仅 AI 流式解题（不降级到本地模板）──
        setLoadingStage("reasoning");
        setStreamingReasoning("");
        setStreamingDone(false);

        // 构图走本地 semantic（约束如 PA⊥底面），图 hint 仅补缺；AI 只负责推理步骤
        let localSemantic = null;
        try {
          localSemantic = parseProblemToSemantic(text);
          if (visionHintsRef.current) {
            localSemantic = mergeVisionHints(
              localSemantic,
              visionHintsRef.current
            );
            localSemantic = validateAndCompleteSemantic(localSemantic);
          }
        } catch (e) {
          console.warn("[geometry] local semantic failed:", e);
        }

        const abort = aiAPI.solveStream(text, {
          onParsed: (parsed) => {
            const shape = localSemantic?.shape || parsed.type || "cube";
            const size = localSemantic?.size || parsed.size || 2;
            setParsedData({
              ...parsed,
              type: shape,
              size,
              labels: localSemantic?.points || parsed.labels,
              relations: localSemantic?.relations || parsed.relations,
              semantic: localSemantic || undefined,
            });
            setGeometry({
              type: shape,
              params: { size },
              ...defaultConstraintParams(shape),
            });
          },
          onReasoning: (chunk) => {
            streamingReasoningRef.current += chunk;
            setStreamingReasoning(streamingReasoningRef.current);
          },
          onComplete: ({ parsed, steps: resultSteps }) => {
            setStreamingDone(true);

            if (parsed) {
              const shape = localSemantic?.shape || parsed.type || "cube";
              const size = localSemantic?.size || parsed.size || 2;
              // 保存推理过程到 parsedData；构图以本地 semantic 为准
              const parsedWithReasoning = {
                ...parsed,
                type: shape,
                size,
                labels: localSemantic?.points || parsed.labels,
                vertices: localSemantic?.points || parsed.vertices,
                relations: localSemantic?.relations || parsed.relations,
                semantic: localSemantic || undefined,
                aiReasoning:
                  streamingReasoningRef.current || parsed.aiReasoning || "",
              };
              setParsedData(parsedWithReasoning);
              setGeometry({
                type: shape,
                params: { size },
                ...defaultConstraintParams(shape),
              });
              setSteps(resultSteps);
              setCurrentStep(0);

              if (parsed?.highlightLines?.length > 0) {
                const { lines: predefinedLines } = getLineDefinitions(
                  parsed.type || "cube",
                  { size: parsed.size || 2 }
                );
                const newCustomLines = [];
                parsed.highlightLines.forEach((hl) => {
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

              setLoadingStage("done");
              console.log(
                `[perf] Total solve (AI stream): ${(performance.now() - totalStart).toFixed(0)}ms`
              );
              try {
                recordUsage("generate", text);
              } catch {}
              saveToHistory(text, parsed, resultSteps);
            }
            setLoading(false);
          },
          onError: (err) => {
            setError(null);
            console.warn("AI 解题失败，降级到本地模板:", err.message);
            let semantic = parseProblemToSemantic(text);
            if (visionHintsRef.current) {
              semantic = mergeVisionHints(semantic, visionHintsRef.current);
              semantic = validateAndCompleteSemantic(semantic);
            }
            const fallbackParsed = {
              type: semantic.shape,
              size: semantic.size,
              labels: semantic.points,
              vertices: semantic.points,
              relations: semantic.relations || [],
              planes: semantic.planes || [],
              importantPlanes: semantic.importantPlanes || [],
              highlightLines: semantic.importantLines.map((l) => ({
                from: l[0],
                to: l[1],
                label: l,
              })),
              explanation: semantic.shape,
              semantic,
              goal: semantic.goal,
              goals: semantic.goals,
              baseShape: semantic.baseShape,
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
        let semantic = parseProblemToSemantic(text);
        if (visionHintsRef.current) {
          semantic = mergeVisionHints(semantic, visionHintsRef.current);
          semantic = validateAndCompleteSemantic(semantic);
        }
        const fallbackParsed = {
          type: semantic.shape,
          size: semantic.size,
          labels: semantic.points,
          vertices: semantic.points,
          relations: semantic.relations || [],
          planes: semantic.planes || [],
          importantPlanes: semantic.importantPlanes || [],
          highlightLines: semantic.importantLines.map((l) => ({
            from: l[0],
            to: l[1],
            label: l,
          })),
          explanation: semantic.shape,
          semantic,
          goal: semantic.goal,
          goals: semantic.goals,
          baseShape: semantic.baseShape,
        };
        const fallbackSteps = generateLocalSteps(text, fallbackParsed);
        applyResults(fallbackParsed, fallbackSteps);
        saveToHistory(text, fallbackParsed, fallbackSteps);
        setLoadingStage("done");
        setLoading(false);
      }
    },
    [loading, recordUsage, checkCanGenerate]
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

  // ── (3) visualIntent — 占位，合并组就绪后计算 ──
  // （见下方 mergedGroups 之后）

  // ── (3a) sceneIRSequence — 完整步骤序列 ──────────
  const sceneIRSequence = useMemo(() => {
    if (!steps.length || !parsedData?.type) return [];

    // 本地路径：parseProblemToSemantic 已产出完整 semantic（relations/pointPositions 正确），
    // 直接消费，避免 convertLegacyParsedToSemantic 重建时丢失字段；
    // 仅 AI 路径 / 历史回放（无 semantic 附着）回退适配器转换
    const semantic =
      parsedData.semantic ?? convertLegacyParsedToSemantic(parsedData, steps);
    return buildSceneIRSequenceFromSemantic(semantic, steps);
  }, [steps, parsedData]);

  // ── 合并卡映射：展示/播放按合并卡步进，currentStep 仍存原始 ProofStep 索引
  const mergedGroups = useMemo(() => mergeConsecutiveSteps(steps), [steps]);
  const mergedStepIndex = useMemo(
    () => mapCurrentStepToMergedIndex(mergedGroups, currentStep),
    [mergedGroups, currentStep]
  );

  // ── (3) visualIntent — 合并组取组内最后一步 ──
  const visualIntent = useMemo(() => {
    const group = mergedGroups[mergedStepIndex];
    const idx = group
      ? group.originalIndices[group.originalIndices.length - 1]
      : currentStep;
    const step = steps[idx];
    if (!step || !parsedData) return null;
    return computeVisualIntent(step, parsedData, problemText);
  }, [mergedGroups, mergedStepIndex, currentStep, steps, parsedData, problemText]);

  // ── (3b) sceneIR — 当前合并步骤组的场景状态（取组内最后一步） ──
  const sceneIR = useMemo(() => {
    if (sceneIRSequence.length === 0) return null;
    const group = mergedGroups[mergedStepIndex];
    const displayIndex = group
      ? group.originalIndices[group.originalIndices.length - 1]
      : currentStep;
    const index = Math.min(displayIndex, sceneIRSequence.length - 1);
    return sceneIRSequence[index];
  }, [sceneIRSequence, currentStep, mergedGroups, mergedStepIndex]);

  // ── Animation Controller（仅同步，不按原始步数驱动播放） ──
  useEffect(() => {
    if (!animationControllerRef.current) {
      animationControllerRef.current = new AnimationController(
        Math.max(mergedGroups.length, 1),
        () => {},
        () => {}
      );
    } else {
      animationControllerRef.current.setTotalSteps(Math.max(mergedGroups.length, 1));
    }
  }, [mergedGroups.length]);

  // ── (3b) 有效标签显示 — 渐进披露：第一步隐藏标签 ──
  const effectiveShowLabels = useMemo(() => {
    if (visualIntent?.hideLabels) return false;
    return showLabels;
  }, [visualIntent?.hideLabels, showLabels]);

  // ── 相机：不跟步骤自动飞镜，用户每步可自由旋转；仅「重置」按钮改视角 ──
  const cameraTarget = null;
  // ── (4) mergedLines — 合并的边定义 ─────────────────
  const mergedLines = useMemo(() => {
    const { lines } = getLineDefinitions(
      geometry.type,
      geometry.params,
      customVertices
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
  ]);

  // ── Step navigation ──────────────────────────────
  const handleStepClick = useCallback((index) => {
    setCurrentStep(index);
  }, []);

  const handleNextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (mergedGroups.length === 0) return prev;
      const i = mapCurrentStepToMergedIndex(mergedGroups, prev);
      if (i >= mergedGroups.length - 1) return prev;
      return mergedGroups[i + 1].originalIndices[0];
    });
  }, [mergedGroups]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (mergedGroups.length === 0) return prev;
      const i = mapCurrentStepToMergedIndex(mergedGroups, prev);
      if (i <= 0) return prev;
      return mergedGroups[i - 1].originalIndices[0];
    });
  }, [mergedGroups]);

  // ── 统一入口提交：识别专题后开讲 ──
  const applySubjectNav = useCallback((subjectId) => {
    const nav = resolveSubjectNav(subjectId);
    setDomain(nav.domain);
    setMathTopic(nav.mathTopic);
    setPhysicsTopic(nav.physicsTopic);
    setPhysicsGroup(nav.physicsGroup);
  }, []);

  const leaveHubWithBoot = useCallback(
    (subjectId, boot) => {
      applySubjectNav(subjectId);
      setPanelBoot(boot);
      setHubActive(false);
      // 专题只作结果标签，不展开多级入口条
      setShowTopicNav(false);
    },
    [applySubjectNav],
  );

  const handleSearchSubmit = useCallback(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length < 3 || loading) return;
    const detected = detectSubject(trimmed);
    setRouteHint(
      detected.confidence === "low" ? detected.hint || "" : "",
    );
    if (detected.subject === "geometry") {
      // 先写入题目，避免 isComposeIdle 把几何态弹回 Hub
      setProblemText(trimmed);
      applySubjectNav("geometry");
      setHubActive(false);
      setShowTopicNav(false);
      setPanelBoot(null);
      handleParseProblem(trimmed, { useLocalOnly: false });
      return;
    }
    leaveHubWithBoot(detected.subject, {
      type: "text",
      text: trimmed,
      nonce: Date.now(),
    });
  }, [
    searchInput,
    loading,
    applySubjectNav,
    leaveHubWithBoot,
    handleParseProblem,
  ]);

  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSearchSubmit();
      }
    },
    [handleSearchSubmit]
  );

  const compressComposeImage = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1280;
          let w = img.width;
          let h = img.height;
          const scale = Math.min(1, max / Math.max(w, h));
          w = Math.round(w * scale);
          h = Math.round(h * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("无法压缩图片"));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = () => reject(new Error("图片损坏"));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error("读取失败"));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleComposeImagePick = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !file.type.startsWith("image/")) return;
      try {
        const dataUrl = await compressComposeImage(file);
        setComposeImage(dataUrl);
        setOcrBusy(true);
        setOcrHint("正在识别题干…");

        const applyText = (text, hint) => {
          let t = (text || "").trim();
          // 兜底：若误把整段 OCR JSON 填进题干，拆出 text / visionHints
          if (t.startsWith("{") && /"text"\s*:/.test(t)) {
            try {
              const obj = JSON.parse(t);
              if (typeof obj?.text === "string" && obj.text.trim()) {
                if (obj.visionHints && !visionHintsRef.current) {
                  visionHintsRef.current = obj.visionHints;
                }
                t = obj.text.trim();
              }
            } catch {
              /* keep t */
            }
          }
          if (t) {
            setSearchInput(t);
            setOcrHint(hint);
            return true;
          }
          return false;
        };

        // 1) 服务端识图（智谱 / Gemini / DeepSeek Vision）
        let cloudErr = null;
        try {
          const res = await withTimeout(
            aiAPI.ocr(dataUrl),
            45000,
            "云端识图超时"
          );
          if (res?.data?.visionHints) {
            visionHintsRef.current = res.data.visionHints;
          }
          if (applyText(res?.data?.text, "已识别，请核对后点「开始理解」")) {
            setOcrBusy(false);
            return;
          }
        } catch (err) {
          cloudErr = err;
          console.warn("[ocr] server failed:", err?.message);
        }

        const cloudMsg = String(cloudErr?.message || "");
        const cloudUnreachable =
          /Failed to fetch|NetworkError|Network request failed|云端识图超时|Load failed|ECONNREFUSED|fetch/i.test(
            cloudMsg
          );
        const cloudMisconfigured =
          /未配置|识图 Key|VISION_|视觉 OCR|识图失败|Daily limit/i.test(
            cloudMsg
          );

        // 2) 云端失败必须继续本地 OCR，禁止提前 return 把用户卡死在红字提示
        setOcrHint(
          cloudUnreachable
            ? "云端识图连不上，正在本地识别…"
            : cloudMisconfigured
              ? `${cloudMsg}。正在本地识别…`
              : "云端识图不可用，正在本地识别…"
        );
        try {
          const localText = await runLocalImageOcr(dataUrl);
          if (
            applyText(
              localText,
              "本地已识别（请仔细核对符号与点名）"
            )
          ) {
            return;
          }
          setOcrHint(
            cloudUnreachable
              ? "云端连不上且本地未识别出文字。请对照图片手动输入题干后点「开始理解」"
              : "未识别出文字，请对照原图手动输入题干后点「开始理解」"
          );
        } catch (err) {
          const localMsg = err?.message || "本地识别失败";
          setOcrHint(
            cloudUnreachable
              ? `云端连不上；${localMsg}。请对照图片手动输入题干后点「开始理解」`
              : `${localMsg}。请对照图片手动输入题干后点「开始理解」`
          );
        }
      } catch {
        setOcrHint("图片读取失败，请重试");
      } finally {
        setOcrBusy(false);
      }
    },
    [compressComposeImage]
  );

  const clearComposeImage = useCallback(() => {
    setComposeImage(null);
    setOcrHint("");
    setOcrBusy(false);
    visionHintsRef.current = null;
  }, []);

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
    if (!checkCanExportPpt()) return;
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
  }, [problemText, steps, parsedData, geometry, checkCanExportPpt]);

  // ── 重置视角 ──
  const handleResetCamera = useCallback(() => {
    setCameraResetKey((k) => k + 1);
  }, []);

  // ── 解题页返回统一 Hub ──
  const handleBackToCompose = useCallback(() => {
    try {
      abortStreamRef.current?.();
    } catch {
      /* ignore */
    }
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    setIsPlaying(false);
    setProblemText("");
    setParsedData(null);
    setSteps([]);
    setCurrentStep(0);
    setLoading(false);
    setLoadingStage("idle");
    setError(null);
    setSearchInput("");
    setQuickInput("");
    setComposeImage(null);
    setOcrHint("");
    setOcrBusy(false);
    setStreamingReasoning("");
    setStreamingDone(false);
    setVisibleLines(new Set());
    setCustomLines([]);
    setShownLengthLabels(new Set());
    setSearchedLine("");
    setEdgeColorOverrides({});
    setSelectedEdge(null);
    setMeasurements([]);
    setAnnotations([]);
    setActiveCut(null);
    setGeometry({
      type: "cube",
      params: { size: 2 },
      ...defaultConstraintParams("cube"),
    });
    setHubActive(true);
    setShowTopicNav(false);
    setPanelBoot(null);
    setRouteHint("");
  }, []);

  const handleHubSample = useCallback(
    (sample) => {
      setRouteHint("");
      if (sample.subject === "geometry") {
        // 先落题再离 Hub，防止空题竞态弹回统一入口
        setProblemText(sample.text);
        setSearchInput(sample.text);
        applySubjectNav("geometry");
        setHubActive(false);
        setShowTopicNav(false);
        setPanelBoot(null);
        handleParseProblem(sample.text, { useLocalOnly: true });
        return;
      }
      leaveHubWithBoot(sample.subject, {
        type: "sample",
        key: sample.sampleKey,
        nonce: Date.now(),
      });
    },
    [applySubjectNav, leaveHubWithBoot, handleParseProblem],
  );

  // ── 自动回放：按合并后步骤组推进（一步一组，避免同卡步数空转） ──
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
    if (!isPlaying || mergedGroups.length === 0) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setCurrentStep((prev) => {
        const i = mapCurrentStepToMergedIndex(mergedGroups, prev);
        if (i >= mergedGroups.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return mergedGroups[i + 1].originalIndices[0];
      });
    };

    playTimerRef.current = setTimeout(tick, 2800);
    return () => {
      cancelled = true;
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, mergedGroups, currentStep]);

  // ── 重试 ──
  const handleRetry = useCallback(() => {
    if (!problemText || loading) return;
    setError(null);
    setLoadingStage("idle");
    handleParseProblem(problemText);
  }, [problemText, loading, handleParseProblem]);

  // ── 键盘快捷键 ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handlePrevStep();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNextStep();
          break;
        case " ":
          if (steps.length > 0) {
            e.preventDefault();
            handleTogglePlay();
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevStep, handleNextStep, handleTogglePlay, steps.length]);

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

  const isComposeIdle = !problemText && !loading;
  // 解题中只显示专题标签，不展示多级入口条
  const showTopicChip = !hubActive;

  // 几何无题时回到 Hub，避免空画布（loading/有题时不弹回）
  useEffect(() => {
    if (!hubActive && subject === "geometry" && isComposeIdle) {
      setHubActive(true);
      setShowTopicNav(false);
      setPanelBoot(null);
    }
  }, [hubActive, subject, isComposeIdle]);

  return (
    <div
      className={`workspace-page${hubActive ? " workspace-page--hub" : ""}${!hubActive && subject === "geometry" ? " workspace-page--geometry" : ""}${!hubActive && subject === "geometry" && !isComposeIdle ? " workspace-page--solving" : ""}`}
    >
      {showTopicChip && (
        <div className="wp-topic-chip-bar" aria-label="当前专题">
          <span className="wp-topic-chip">{getSubjectLabel(subject)}</span>
          <button
            type="button"
            className="wp-topic-chip-back"
            onClick={handleBackToCompose}
          >
            换题
          </button>
        </div>
      )}

      {hubActive ? (
        <div className="wp-combo-shell">
          <div className="logic-panel wp-hub-panel">
            <header className="logic-panel-head">
              <p className="logic-panel-kicker">统一入口 · 粘贴即讲</p>
              <h2 className="logic-panel-title">不用找板块，直接开讲</h2>

              <div className="logic-compose">
                {composeImage && (
                  <div className="wp-compose-preview" style={{ marginBottom: "0.5rem" }}>
                    <img src={composeImage} alt="原题预览" />
                    <button
                      type="button"
                      className="wp-compose-preview-clear"
                      onClick={clearComposeImage}
                      aria-label="移除图片"
                    >
                      ×
                    </button>
                  </div>
                )}
                <textarea
                  className="logic-compose-input"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="粘贴任意题目：立体几何 / 排组 / 导数 / 圆锥曲线 / 物理…"
                  rows={3}
                  spellCheck={false}
                  autoFocus
                  disabled={ocrBusy}
                />
                {ocrHint && (
                  <p
                    className="logic-compose-error"
                    style={ocrBusy ? { color: "#5c574e" } : undefined}
                  >
                    {ocrHint}
                  </p>
                )}
                {routeHint && (
                  <p className="wp-hub-route-hint">{routeHint}</p>
                )}
                <div className="logic-compose-row">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={handleComposeImagePick}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleComposeImagePick}
                  />
                  <button
                    type="button"
                    className="logic-type-tab"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={ocrBusy}
                  >
                    拍照
                  </button>
                  <button
                    type="button"
                    className="logic-type-tab"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={ocrBusy}
                  >
                    相册
                  </button>
                  <button
                    type="button"
                    className="logic-compose-submit"
                    onClick={handleSearchSubmit}
                    disabled={searchInput.trim().length < 3 || ocrBusy}
                  >
                    {ocrBusy ? "识别中…" : "开始理解"}
                  </button>
                  <span className="logic-compose-hint">Ctrl + Enter</span>
                </div>
              </div>

              <div className="logic-examples-wrap">
                <span className="logic-type-label">热门样例</span>
                <div className="logic-examples-grid wp-hub-samples">
                  {HUB_SAMPLES.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      className="logic-example-card"
                      onClick={() => handleHubSample(ex)}
                    >
                      <span className="wp-hub-sample-tag">{ex.tag}</span>
                      <span className="logic-example-card-label">{ex.label}</span>
                      <span className="logic-example-card-hint">{ex.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </header>
            <p className="logic-empty-hint">
              粘贴题目自动识别专题，或点上方跨科样例直接开讲。
            </p>
          </div>
        </div>
      ) : subject === "combo" ? (
        <div className="wp-combo-shell">
          <LogicPanel boot={panelBoot} onBackToHub={handleBackToCompose} />
        </div>
      ) : subject === "derivative" ||
        subject === "conic" ||
        subject.startsWith("phys_") ? (
        <div className="wp-combo-shell">
          <TopicPanel
            key={subject}
            topic={subject}
            boot={panelBoot}
            onBackToHub={handleBackToCompose}
          />
        </div>
      ) : (
      <>
      {/* ── 解题顶栏：返回搜题，不再重复搜题框 ── */}
      {!isComposeIdle && (
        <div className="wp-solve-bar">
          <button
            type="button"
            className="wp-solve-back"
            onClick={handleBackToCompose}
          >
            ← 换一道
          </button>
          {composeImage && (
            <button
              type="button"
              className="wp-solve-original"
              title="查看原题图"
              onClick={() => window.open(composeImage, "_blank")}
            >
              <img src={composeImage} alt="" />
              <span>原题</span>
            </button>
          )}
          {isMobile && (
            <button
              type="button"
              className="wp-search-3d-toggle"
              onClick={() => setShow3D((prev) => !prev)}
              title={show3D ? "隐藏 3D" : "显示 3D"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
                <path d="M2 7l10 5 10-5" />
                <path d="M12 22V12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ── 升级引导条 ── */}
      {!isPro && problemText && !loading && Number.isFinite(remaining) && remaining <= 3 && remaining > 0 && (
        <div className="wp-upgrade-banner">
          <span className="wp-upgrade-banner-text">
            今日还剩 <strong>{remaining}</strong> 次免费使用
          </span>
          {isGuest ? (
            <button
              className="wp-upgrade-banner-btn"
              onClick={() =>
                document.dispatchEvent(new CustomEvent("mathviz:show-auth"))
              }
            >
              登录增加额度 →
            </button>
          ) : (
            <button
              className="wp-upgrade-banner-btn"
              onClick={() =>
                triggerPaywall("免费额度即将用完，升级解锁无限使用")
              }
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
                onClick={() =>
                  document.dispatchEvent(new CustomEvent("mathviz:show-auth"))
                }
              >
                登录继续使用
              </button>
            )}
            <button
              className={`wp-upgrade-banner-btn ${isGuest ? "secondary" : ""}`}
              onClick={() => triggerPaywall("已达每日使用上限，升级继续使用")}
            >
              升级{isGuest ? " →" : "继续使用 →"}
            </button>
          </div>
        </div>
      )}

      {/* 几何解题态：single Canvas, CSS-driven responsive */}
      <div className={`wp-main wp-main--geo ${isMobile ? "wp-main--mobile" : ""}`}>
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
          />
        </div>

        <div
          className={`wp-canvas-col ${isMobile && !show3D ? "wp-canvas--hidden" : ""}`}
          ref={canvasRef}
        >
          {hasWebGL ? (
            <Canvas
              style={{ width: "100%", height: "100%" }}
              camera={{ position: [4, 4, 6], fov: 50 }}
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
            <div className="wp-webgl-fallback" role="status">
              <p>当前浏览器无法显示 3D 场景</p>
              <p className="wp-webgl-fallback-hint">
                立体几何需要 WebGL。请改用最新版 Chrome、Edge 或 Firefox；步骤讲解仍可正常阅读。
              </p>
            </div>
          )}
          <GeometryMiniControls
            showFaces={showFaces}
            onToggleFaces={() => setShowFaces((prev) => !prev)}
            onResetCamera={handleResetCamera}
          />
        </div>
      </div>

      {typeof TeacherModePanel !== "undefined" ? (
        <TeacherModePanel
          totalSteps={mergedGroups.length}
          currentStep={mergedStepIndex}
          onStepChange={(i) =>
            handleStepClick(mergedGroups[i]?.originalIndices?.[0] ?? i)
          }
          onExportPPT={handleExportPPT}
          pptLoading={pptLoading}
        />
      ) : null}
      </>
      )}

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

      {/* ── 首次使用轻提示（不挡样例点击） ── */}
      {showGuide && hubActive && (
        <div className="wp-guide-banner" role="status">
          <p className="wp-guide-banner-text">
            粘贴题目或点热门样例即可开讲，专题会自动识别。
          </p>
          <button type="button" className="wp-guide-banner-btn" onClick={dismissGuide}>
            知道了
          </button>
        </div>
      )}
    </div>
  );
}
