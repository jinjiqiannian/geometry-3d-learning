import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CURRICULUM } from "../data/curriculum";
import TeachLesson from "../components/TeachLesson";
import WorkspacePage from "./WorkspacePage";
import "./TeachPage.css";

const DEFAULT_SUBJECT = "math";
const DEFAULT_BOOK = "math-req-2";
const DEFAULT_CHAPTER = "m2-solid";

export default function TeachPage() {
  const [subjectId, setSubjectId] = useState(DEFAULT_SUBJECT);
  const [openBookId, setOpenBookId] = useState(DEFAULT_BOOK);
  const [openChapterId, setOpenChapterId] = useState(DEFAULT_CHAPTER);
  const [activeLeafId, setActiveLeafId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [bootNonce, setBootNonce] = useState(0);
  const [navOpen, setNavOpen] = useState(true);

  const subject = useMemo(
    () => CURRICULUM.find((s) => s.id === subjectId) || CURRICULUM[0],
    [subjectId],
  );

  const activeLeaf = useMemo(() => {
    if (!activeLeafId) return null;
    for (const book of subject?.books || []) {
      for (const ch of book.children || []) {
        const hit = (ch.leaves || []).find((l) => l.id === activeLeafId);
        if (hit) return hit;
      }
    }
    return null;
  }, [activeLeafId, subject]);

  const selectLeaf = (leaf) => {
    setActiveLeafId(leaf.id);
    setPlaying(false);
    setBootNonce((n) => n + 1);
    setNavOpen(false);
  };

  const clearLesson = () => {
    setActiveLeafId(null);
    setPlaying(false);
    setNavOpen(true);
  };

  return (
    <div
      className={`teach-page${activeLeaf ? " teach-page--lesson" : ""}${navOpen ? " teach-page--nav-open" : ""}`}
    >
      <aside className="teach-nav" aria-label="课程导航">
        <div className="teach-nav-head">
          <p className="teach-nav-kicker">教学模式</p>
          <h1 className="teach-nav-title">按册选知识点</h1>
          <Link to="/search" className="teach-nav-switch">
            去搜题 →
          </Link>
        </div>

        <div className="teach-subject-tabs" role="tablist">
          {CURRICULUM.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === subjectId}
              className={`teach-subject-tab${s.id === subjectId ? " is-active" : ""}`}
              onClick={() => {
                setSubjectId(s.id);
                const firstBook = s.books?.[0];
                setOpenBookId(firstBook?.id ?? null);
                setOpenChapterId(firstBook?.children?.[0]?.id ?? null);
                clearLesson();
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <nav className="teach-tree">
          {(subject?.books || []).map((book) => {
            const bookOpen = openBookId === book.id;
            return (
              <div key={book.id} className="teach-book">
                <button
                  type="button"
                  className={`teach-book-toggle${bookOpen ? " is-open" : ""}`}
                  onClick={() => {
                    setOpenBookId((id) => (id === book.id ? null : book.id));
                    if (openBookId !== book.id) {
                      setOpenChapterId(book.children?.[0]?.id ?? null);
                    }
                  }}
                >
                  <span>{book.label}</span>
                  <span className="teach-chevron" aria-hidden="true">
                    {bookOpen ? "−" : "+"}
                  </span>
                </button>
                {bookOpen && (
                  <div className="teach-chapters">
                    {(book.children || []).map((ch) => {
                      const chOpen = openChapterId === ch.id;
                      return (
                        <div key={ch.id} className="teach-chapter">
                          <button
                            type="button"
                            className={`teach-chapter-toggle${chOpen ? " is-open" : ""}`}
                            onClick={() =>
                              setOpenChapterId((id) =>
                                id === ch.id ? null : ch.id,
                              )
                            }
                          >
                            {ch.label}
                          </button>
                          {chOpen && (
                            <ul className="teach-leaves">
                              {(ch.leaves || []).map((leaf) => (
                                <li key={leaf.id}>
                                  <button
                                    type="button"
                                    className={`teach-leaf${activeLeafId === leaf.id ? " is-active" : ""}`}
                                    onClick={() => selectLeaf(leaf)}
                                  >
                                    <span className="teach-leaf-label">
                                      {leaf.label}
                                    </span>
                                    {leaf.hint && (
                                      <span className="teach-leaf-hint">
                                        {leaf.hint}
                                      </span>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <section className="teach-main">
        {activeLeaf && (
          <button
            type="button"
            className="teach-nav-fab"
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? "收起目录" : "课程目录"}
          </button>
        )}
        {activeLeaf && playing && activeLeaf.subject && activeLeaf.text ? (
          <WorkspacePage
            key={`${activeLeaf.id}-${bootNonce}`}
            variant="teach"
            teachPoint={activeLeaf}
            onRequestExit={() => setPlaying(false)}
          />
        ) : activeLeaf ? (
          <TeachLesson
            leaf={activeLeaf}
            onPlay={() => setPlaying(true)}
            onBack={clearLesson}
          />
        ) : (
          <div className="teach-empty">
            <p className="teach-empty-kicker">开始学习</p>
            <h2 className="teach-empty-title">从左侧选择一个知识点</h2>
            <p className="teach-empty-lead">
              默认已打开必修第二册 · 立体几何。每个点都有模型，能开讲的会进入同一套讲解界面。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
