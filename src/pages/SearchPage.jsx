import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import WorkspacePage from "./WorkspacePage";
import {
  compressComposeImage,
  runCloudOcrWithRetry,
  ocrFailHint,
  OCR_EMPTY_HINT,
} from "../services/photoOcr";
import "./SearchPage.css";

export default function SearchPage() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState(null);
  const [nonce, setNonce] = useState(0);

  // ── 拍照识题（复用 WorkspacePage 的云端→本地降级链路）──
  const [composeImage, setComposeImage] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrHint, setOcrHint] = useState("");
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const submit = useCallback(() => {
    const t = draft.trim();
    if (t.length < 3) return;
    setQuery(t);
    setNonce((n) => n + 1);
  }, [draft]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleImagePick = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressComposeImage(file);
      setComposeImage(dataUrl);
      setOcrBusy(true);
      setOcrHint("正在识别题干…");

      // 1) 云端识图（智谱 GLM-4V；失败自动压小重试一次）
      try {
        const { text } = await runCloudOcrWithRetry(dataUrl);
        if (text.trim()) {
          setDraft(text.trim());
          setOcrHint("已识别，请核对后点「开始理解」");
          return;
        }
        setOcrHint(OCR_EMPTY_HINT);
      } catch (err) {
        console.warn("[search-ocr] cloud failed:", err?.message);
        setOcrHint(ocrFailHint(err?.message));
      }
    } catch {
      setOcrHint("图片读取失败，请重试");
    } finally {
      setOcrBusy(false);
    }
  }, []);

  const clearComposeImage = useCallback(() => {
    setComposeImage(null);
    setOcrHint("");
    setOcrBusy(false);
  }, []);

  if (query) {
    return (
      <div className="search-page search-page--active">
        <WorkspacePage
          key={`${nonce}-${query.slice(0, 24)}`}
          variant="search"
          initialQuery={query}
          onRequestExit={() => setQuery(null)}
        />
      </div>
    );
  }

  return (
    <div className="search-page">
      <div className="search-shell">
        <p className="search-kicker">搜题模式</p>
        <h1 className="search-title">粘贴题目，立刻开讲</h1>
        <p className="search-lead">
          只做一件事：输入题目。结果界面与教学模式相同。
        </p>

        {composeImage && (
          <div className="search-preview">
            <img src={composeImage} alt="原题预览" />
            <button
              type="button"
              className="search-preview-clear"
              onClick={clearComposeImage}
              aria-label="移除图片"
            >
              ×
            </button>
          </div>
        )}

        <textarea
          className="search-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="粘贴立体几何 / 导数 / 圆锥曲线 / 排列组合 / 物理题…"
          rows={5}
          spellCheck={false}
          autoFocus
          disabled={ocrBusy}
        />
        {ocrHint && (
          <p
            className="search-ocr-hint"
            style={ocrBusy ? { color: "var(--text-secondary)" } : undefined}
          >
            {ocrHint}
          </p>
        )}
        <div className="search-actions">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleImagePick}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleImagePick}
          />
          <button
            type="button"
            className="search-btn-secondary"
            onClick={() => cameraInputRef.current?.click()}
            disabled={ocrBusy}
          >
            拍照
          </button>
          <button
            type="button"
            className="search-btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={ocrBusy}
          >
            相册
          </button>
          <button
            type="button"
            className="search-submit"
            disabled={draft.trim().length < 3 || ocrBusy}
            onClick={submit}
          >
            {ocrBusy ? "识别中…" : "开始理解"}
          </button>
          <Link to="/teach" className="search-link">
            改用教学模式
          </Link>
        </div>
        <p className="search-hint">Enter 提交 · Shift+Enter 换行</p>
      </div>
    </div>
  );
}
