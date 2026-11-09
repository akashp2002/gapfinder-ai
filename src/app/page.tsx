import Link from "next/link";

const topics = [
  {
    name: "Quadratic equations",
    subject: "Mathematics",
    score: 38,
    status: "Needs focus",
    tone: "weak",
    source: "Algebra · Section 4.2",
  },
  {
    name: "Cellular respiration",
    subject: "Biology",
    score: 62,
    status: "Getting there",
    tone: "medium",
    source: "Cell biology · Chapter 6",
  },
  {
    name: "Newton's laws",
    subject: "Physics",
    score: 86,
    status: "Looking good",
    tone: "strong",
    source: "Mechanics · Section 2.1",
  },
];

const plan = [
  {
    number: "01",
    title: "Revisit quadratic equations",
    detail: "Review factorisation, then try 5 practice questions.",
    duration: "25 min",
    tone: "weak",
  },
  {
    number: "02",
    title: "Review cellular respiration",
    detail: "Focus on the stages you mixed up in your last quiz.",
    duration: "20 min",
    tone: "medium",
  },
  {
    number: "03",
    title: "Quick recall: Newton's laws",
    detail: "Keep this topic fresh with a short retrieval practice.",
    duration: "10 min",
    tone: "strong",
  },
];

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="GapFinder home">
          <span className="brand-mark">g</span>
          <span>gapfinder<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#overview">
            <span className="nav-icon">◫</span> Overview
          </a>
          <a className="nav-link" href="#topics">
            <span className="nav-icon">◉</span> My topics
          </a>
          <Link className="nav-link" href="/quiz">
            <span className="nav-icon">✳</span> Diagnostic quiz
          </Link>
          <Link className="nav-link" href="/report">
            <span className="nav-icon">◒</span> Gap report
          </Link>
          <Link className="nav-link" href="/materials">
            <span className="nav-icon">▤</span> My materials
          </Link>
          <Link className="nav-link" href="/plan">
            <span className="nav-icon">☷</span> Revision plan
          </Link>
          <a className="nav-link" href="#progress">
            <span className="nav-icon">↗</span> Progress
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="study-note">
            <span className="note-spark">✳</span>
            <strong>Small steps add up.</strong>
            <p>Your plan changes as you improve. Just keep showing up.</p>
          </div>
          <div className="profile">
            <div className="avatar">S</div>
            <div>
              <strong>Sam Student</strong>
              <span>Demo workspace</span>
            </div>
            <span className="profile-menu" aria-hidden="true">···</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">g</span>
            <strong>gapfinder<span className="brand-period">.</span></strong>
          </div>
          <div className="breadcrumb">My learning <span>/</span> Overview</div>
          <Link className="topbar-quiz" href="/quiz">Take a quiz <span aria-hidden="true">→</span></Link>
          <Link className="topbar-materials" href="/materials">My materials <span aria-hidden="true">→</span></Link>
          <div className="topbar-right">
            <span className="today-label">MONDAY, 9 NOV</span>
            <div className="avatar small">S</div>
          </div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" /> YOUR STUDY HEALTH</p>
              <h1>Know what you <em>don&apos;t know.</em></h1>
              <p className="welcome-copy">
                A clearer picture of your learning, and a plan for what to do next.
              </p>
            </div>
            <Link className="primary-button" href="/plan">
              See my revision plan <span aria-hidden="true">→</span>
            </Link>
          </section>

          <section className="diagnosis-card" aria-labelledby="diagnosis-heading">
            <div className="diagnosis-copy">
              <div className="section-kicker">YOUR LATEST DIAGNOSIS <span className="demo-tag">DEMO DATA</span></div>
              <h2 id="diagnosis-heading">You&apos;re building momentum.</h2>
              <p>
                You&apos;re strong in <strong>Newton&apos;s laws</strong>. Give
                <strong> quadratic equations</strong> a little more attention before your next exam.
              </p>
              <Link className="text-link" href="/report">Open your gap report <span aria-hidden="true">→</span></Link>
            </div>
            <div className="readiness" id="progress">
              <div className="readiness-ring"><span>68<small>%</small></span></div>
              <div className="readiness-caption">OVERALL READINESS</div>
              <div className="readiness-trend"><span>↗</span> +12% this week</div>
            </div>
          </section>

          <section className="stats-grid" aria-label="Learning summary">
            <article className="stat-card">
              <div className="stat-label">TOPICS CHECKED</div>
              <div className="stat-value">12 <span>of 18</span></div>
              <div className="stat-foot"><span className="mini-track"><i style={{ width: "67%" }} /></span> 6 still to explore</div>
            </article>
            <article className="stat-card">
              <div className="stat-label">NEED A REVIEW</div>
              <div className="stat-value">3 <span>topics</span></div>
              <div className="stat-foot"><span className="status-dot weak-dot" /> Prioritised in your plan</div>
            </article>
            <article className="stat-card">
              <div className="stat-label">STUDY STREAK</div>
              <div className="stat-value">4 <span>days</span></div>
              <div className="stat-foot streak-foot"><span aria-hidden="true">✳</span> You&apos;re on a roll</div>
            </article>
          </section>

          <section className="lower-grid">
            <div className="panel topics-panel" id="topics">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">A LITTLE MORE DETAIL</div>
                  <h2>Your topic map</h2>
                </div>
                <Link className="subtle-link" href="/report">All topics <span aria-hidden="true">→</span></Link>
              </div>
              <div className="topic-list">
                {topics.map((topic) => (
                  <article className="topic-row" key={topic.name}>
                    <div className={`topic-status ${topic.tone}`} aria-hidden="true" />
                    <div className="topic-main">
                      <div className="topic-title">{topic.name}</div>
                      <div className="topic-subtitle">{topic.subject} <span>·</span> {topic.source}</div>
                    </div>
                    <div className="topic-result">
                      <div className={`topic-status-label ${topic.tone}`}>{topic.status}</div>
                      <div className="topic-score">{topic.score}%</div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="source-note">
                <span className="source-mark">↳</span>
                Topic evidence is linked to your study material.
              </div>
            </div>

            <div className="panel plan-panel" id="revision-plan">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">A PLAN THAT ADAPTS <span className="demo-tag">DEMO PREVIEW</span></div>
                  <h2>Next best steps</h2>
                </div>
                <span className="time-budget">55 MIN TOTAL</span>
              </div>
              <div className="plan-list">
                {plan.map((item) => (
                  <article className="plan-item" key={item.number}>
                    <div className={`plan-number ${item.tone}`}>{item.number}</div>
                    <div className="plan-copy">
                      <h3>{item.title}</h3>
                      <p>{item.detail}</p>
                      <span className="duration">{item.duration}</span>
                    </div>
                  </article>
                ))}
              </div>
              <Link className="plan-button" href="/plan">Set my time &amp; view my plan <span aria-hidden="true">→</span></Link>
            </div>
          </section>

          <footer className="page-footer">
            <span>Built around your learning, not just another chatbot.</span>
            <span>GapFinder AI <span className="brand-period">·</span> Demo dashboard</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
