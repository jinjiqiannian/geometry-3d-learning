/**
 * 素材库：按作文方向筛选人物实例与金句。
 *
 * 每条素材都带 sources（权威来源链接）与 verified。
 * 这里把来源直接展示出来 —— 背素材时能顺手核对，
 * 也提醒自己这条不是从网上随手抄的。
 */

import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import characters from '../data/composition/characters.json'
import quotes from '../data/composition/quotes.json'
import { TOPICS, TOPIC_MAP } from '../data/composition/topics'
import './MaterialsPage.css'

function Sources({ sources }) {
  if (!sources?.length) return null
  return (
    <p className="mat-sources">
      来源：
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 && ' · '}
          <a href={s.url} target="_blank" rel="noreferrer">
            {s.publisher}
          </a>
        </span>
      ))}
    </p>
  )
}

function CharacterCard({ item }) {
  return (
    <article className="mat-card">
      <div className="mat-card-top">
        <h2 className="mat-card-name">{item.name}</h2>
        <span className="mat-card-meta">
          {item.era} · {item.field}
        </span>
      </div>
      <p className="mat-card-summary">{item.summary}</p>
      <ul className="mat-card-facts">
        {item.facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <p className="mat-card-usable">{item.usableAs}</p>
      <div className="mat-chips">
        {item.topics.map((id) => (
          <Link key={id} to={`/materials?topic=${id}`} className="mat-chip">
            {TOPIC_MAP[id]?.label || id}
          </Link>
        ))}
      </div>
      <Sources sources={item.sources} />
    </article>
  )
}

function QuoteCard({ item }) {
  return (
    <article className="mat-card mat-card--quote">
      <blockquote className="mat-quote">「{item.text}」</blockquote>
      <p className="mat-quote-author">—— {item.author}</p>
      <p className="mat-quote-source">{item.source}</p>
      <p className="mat-card-usable">{item.usableAs}</p>
      <div className="mat-chips">
        {item.topics.map((id) => (
          <Link key={id} to={`/materials?topic=${id}`} className="mat-chip">
            {TOPIC_MAP[id]?.label || id}
          </Link>
        ))}
      </div>
      <Sources sources={item.sources} />
    </article>
  )
}

export default function MaterialsPage() {
  const [params, setParams] = useSearchParams()
  const active = params.get('topic') || ''

  const filteredCharacters = useMemo(
    () => characters.filter((c) => c.verified && (!active || c.topics.includes(active))),
    [active]
  )
  const filteredQuotes = useMemo(
    () => quotes.filter((q) => q.verified && (!active || q.topics.includes(active))),
    [active]
  )

  const total = filteredCharacters.length + filteredQuotes.length

  return (
    <div className="mat-page">
      <header className="mat-head">
        <div>
          <p className="mat-kicker">作文素材</p>
          <h1 className="mat-title">
            {active ? TOPIC_MAP[active]?.label || '素材' : '全部素材'}
          </h1>
          <p className="mat-count">
            人物 {filteredCharacters.length} 条 · 金句 {filteredQuotes.length} 条
          </p>
        </div>
        <Link to="/" className="mat-back">
          返回首页
        </Link>
      </header>

      <div className="mat-filters">
        <button
          type="button"
          className={`mat-filter ${!active ? 'is-active' : ''}`}
          onClick={() => setParams({})}
        >
          全部
        </button>
        {TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mat-filter ${active === t.id ? 'is-active' : ''}`}
            onClick={() => setParams({ topic: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <p className="mat-empty">
          这个方向还没有已核实的素材。素材必须查到权威来源才入库，宁缺毋滥。
        </p>
      ) : (
        <>
          {filteredCharacters.length > 0 && (
            <section className="mat-section">
              <h2 className="mat-section-title">人物实例</h2>
              {filteredCharacters.map((c) => (
                <CharacterCard key={c.id} item={c} />
              ))}
            </section>
          )}

          {filteredQuotes.length > 0 && (
            <section className="mat-section">
              <h2 className="mat-section-title">金句名言</h2>
              {filteredQuotes.map((q) => (
                <QuoteCard key={q.id} item={q} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
