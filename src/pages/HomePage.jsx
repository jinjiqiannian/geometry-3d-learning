/**
 * 自用首页。
 *
 * 两块内容：
 * 1. 今日素材 —— 一条人物 + 一条金句，按日期轮换，可手动换一批。
 *    素材全部来自 src/data/composition/，每条都带 sources 与 verified，
 *    未核实的条目不进首页（见 docs/DECISIONS.md D4）。
 * 2. 功能入口 —— 搜题 / 教学 / 素材库 / 3D 探索。
 *
 * 不做推送：这是刻意的决定，打开 App 才看，避免攒一堆未读。
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import characters from '../data/composition/characters.json'
import quotes from '../data/composition/quotes.json'
import { TOPICS, topicLabel } from '../data/composition/topics'
import './HomePage.css'

const DAY_MS = 86400000

/** 同一天固定同一条，换一批时整体后移一位。 */
function pick(list, day, shift) {
  const verified = list.filter((item) => item.verified)
  if (verified.length === 0) return null
  return verified[(day + shift) % verified.length]
}

function todayLabel() {
  const d = new Date()
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

function TopicChips({ ids, limit }) {
  const shown = typeof limit === 'number' ? ids.slice(0, limit) : ids
  return (
    <div className="home-chips">
      {shown.map((id) => (
        <Link key={id} to={`/materials?topic=${id}`} className="home-chip">
          {topicLabel(id)}
        </Link>
      ))}
    </div>
  )
}

export default function HomePage() {
  const [shift, setShift] = useState(0)
  const day = useMemo(() => Math.floor(Date.now() / DAY_MS), [])

  const character = pick(characters, day, shift)
  const quote = pick(quotes, day, shift)

  return (
    <div className="home-page">
      <header className="home-head">
        <div>
          <p className="home-kicker">今日素材</p>
          <h1 className="home-title">{todayLabel()}</h1>
        </div>
        <button
          type="button"
          className="home-shuffle"
          onClick={() => setShift((s) => s + 1)}
        >
          换一批
        </button>
      </header>

      {character ? (
        <article className="home-card">
          <div className="home-card-top">
            <span className="home-card-kind">人物</span>
            <span className="home-card-meta">
              {character.era} · {character.field}
            </span>
          </div>
          <h2 className="home-card-name">{character.name}</h2>
          <p className="home-card-summary">{character.summary}</p>
          <ul className="home-card-facts">
            {character.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          <p className="home-card-usable">{character.usableAs}</p>
          <TopicChips ids={character.topics} />
        </article>
      ) : (
        <p className="home-empty">素材积累中。</p>
      )}

      {quote && (
        <article className="home-card home-card--quote">
          <div className="home-card-top">
            <span className="home-card-kind home-card-kind--quote">金句</span>
            <span className="home-card-meta">{quote.author}</span>
          </div>
          <blockquote className="home-quote-text">「{quote.text}」</blockquote>
          <p className="home-quote-source">{quote.source}</p>
          <p className="home-card-usable">{quote.usableAs}</p>
          <TopicChips ids={quote.topics} />
        </article>
      )}

      <section className="home-section">
        <h3 className="home-section-title">作文方向</h3>
        <div className="home-topics">
          {TOPICS.map((topic) => (
            <Link
              key={topic.id}
              to={`/materials?topic=${topic.id}`}
              className="home-topic"
            >
              <span className="home-topic-label">{topic.label}</span>
              <span className="home-topic-desc">{topic.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h3 className="home-section-title">功能</h3>
        <div className="home-entries">
          <Link to="/search" className="home-entry">
            <span className="home-entry-title">搜题解题</span>
            <span className="home-entry-desc">粘贴题目，出分步讲解与图示</span>
          </Link>
          <Link to="/teach" className="home-entry">
            <span className="home-entry-title">知识讲解</span>
            <span className="home-entry-desc">按教材章节看知识点与例题</span>
          </Link>
          <Link to="/materials" className="home-entry">
            <span className="home-entry-title">素材库</span>
            <span className="home-entry-desc">按作文方向筛选人物与金句</span>
          </Link>
          <Link to="/explore" className="home-entry">
            <span className="home-entry-title">3D 探索</span>
            <span className="home-entry-desc">转动几何体，看清棱与面</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
