import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import WorkspacePage from "./WorkspacePage";
import "./SearchPage.css";

export default function SearchPage() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState(null);
  const [nonce, setNonce] = useState(0);

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
        <textarea
          className="search-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="粘贴立体几何 / 导数 / 圆锥曲线 / 排列组合 / 物理题…"
          rows={5}
          spellCheck={false}
          autoFocus
        />
        <div className="search-actions">
          <button
            type="button"
            className="search-submit"
            disabled={draft.trim().length < 3}
            onClick={submit}
          >
            开始理解
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
