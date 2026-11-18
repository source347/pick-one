"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { backendReady, supabase } from "@/lib/supabase";

type Poll = { id: string; question: string; options: { id: string; label: string }[]; total_votes: number; results: { option_id: string; label: string; votes: number }[]; created_at: string };

function voterId() {
  const key = "pick-one-voter";
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}

export default function Home() {
  const params = useParams<{ id?: string[] }>();
  const pollId = typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean)[0] : undefined;
  const [question, setQuestion] = useState("");
  const [choices, setChoices] = useState(["", ""]);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadPoll = useCallback(async () => {
    if (!supabase || !pollId || pollId === "favicon.ico") return;
    const { data, error: e } = await supabase.rpc("get_poll", { p_poll_id: pollId });
    if (e) { setError(e.message); return; }
    setPoll(data as Poll);
  }, [pollId]);

  useEffect(() => { if (pollId) void loadPoll(); }, [pollId, loadPoll]);
  useEffect(() => {
    if (!pollId) return;
    const timer = window.setInterval(() => void loadPoll(), 5000);
    return () => window.clearInterval(timer);
  }, [pollId, loadPoll]);

  async function createPoll(e: FormEvent) {
    e.preventDefault(); setError("");
    const clean = choices.map(x => x.trim()).filter(Boolean);
    if (!question.trim() || clean.length < 2) { setError("Add a question and at least two options."); return; }
    if (!supabase) { setError("Connect Supabase to publish polls. See the setup guide in README."); return; }
    setBusy(true);
    const { data, error: e2 } = await supabase.rpc("create_poll", { p_question: question.trim(), p_options: clean });
    setBusy(false);
    if (e2) { setError(e2.message); return; }
    window.location.href = "/" + data;
  }

  async function vote() {
    if (!supabase || !poll || !selected) return;
    setBusy(true); setError("");
    const { error: e } = await supabase.rpc("cast_vote", { p_poll_id: poll.id, p_option_id: selected, p_voter_id: voterId() });
    setBusy(false);
    if (e) { setError(e.message); return; }
    await loadPoll();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  const isResults = Boolean(poll?.results?.some(r => r.votes > 0));
  const total = poll?.total_votes ?? 0;

  return (
    <main className="shell">
      <header className="topbar"><a className="brand" href="/">pick<span>one</span><i>.</i></a><span className="top-note">A better way to decide together</span></header>
      {!pollId ? (
        <section className="hero">
          <div className="eyebrow"><span className="live-dot" /> FREE GROUP POLLS · NO ACCOUNT NEEDED</div>
          <h1>Stop going in<br/>circles. <em>Pick one.</em></h1>
          <p className="intro">Make the call together. Create a poll, send one link, and see what everyone thinks.</p>
          <form className="poll-form" onSubmit={createPoll}>
            <label htmlFor="question">What are we deciding?</label>
            <input id="question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Where should we go for dinner?" maxLength={120} />
            <div className="options-heading"><label>Your options</label><span>{choices.length}/8</span></div>
            {choices.map((choice, i) => <div className="choice-row" key={i}><span className="choice-number">{String(i + 1).padStart(2, "0")}</span><input aria-label={`Option ${i + 1}`} value={choice} onChange={e => setChoices(old => old.map((v, n) => n === i ? e.target.value : v))} placeholder={["Pizza","Sushi","Tacos","Somewhere new"][i] || "Another option"} maxLength={80}/>{choices.length > 2 && <button className="remove" type="button" onClick={() => setChoices(old => old.filter((_, n) => n !== i))} aria-label="Remove option">×</button>}</div>)}
            {choices.length < 8 && <button type="button" className="add-option" onClick={() => setChoices(old => [...old, ""])}>+ Add another option</button>}
            <button className="primary" disabled={busy} type="submit">{busy ? "Creating…" : "Create your poll"} <span>↗</span></button>
            {error && <p className="error">{error}</p>}
          </form>
          <div className="footnote"><span>↗</span> Share the link. Everyone gets a vote.</div>
        </section>
      ) : poll ? (
        <section className="poll-view">
          <div className="eyebrow"><span className="live-dot" /> LIVE GROUP POLL</div>
          <h1 className="poll-question">{poll.question}</h1>
          <p className="intro">{total} {total === 1 ? "vote" : "votes"} so far · Vote once from this device</p>
          <div className="results">
            {poll.options.map((option, i) => {
              const result = poll.results?.find(r => r.option_id === option.id);
              const votes = result?.votes ?? 0;
              const pct = total ? Math.round(votes / total * 100) : 0;
              return <button key={option.id} className={`result-option ${selected === option.id ? "selected" : ""}`} onClick={() => setSelected(option.id)} disabled={busy}>
                <span className="result-top"><span>{option.label}</span><strong>{pct}%</strong></span>
                <span className="bar"><span style={{ width: pct + "%" }}/></span>
                <span className="vote-count">{votes} {votes === 1 ? "vote" : "votes"}</span>
              </button>;
            })}
          </div>
          <button className="primary vote-button" onClick={vote} disabled={busy || !selected}>{busy ? "Submitting…" : "Cast my vote"} <span>↗</span></button>
          <button className="share-button" onClick={copyLink}>{copied ? "Link copied" : "Copy poll link"}</button>
          {error && <p className="error">{error}</p>}
          <p className="privacy-note">Results update automatically. Your vote is anonymous to other voters.</p>
        </section>
      ) : (
        <section className="poll-view"><div className="eyebrow">POLL NOT FOUND</div><h1 className="poll-question">This link doesn’t seem to work.</h1><p className="intro">The poll may have expired or the link may be incomplete.</p><a className="primary link-button" href="/">Create a new poll ↗</a>{error && <p className="error">{error}</p>}</section>
      )}
      <footer><span>© {new Date().getFullYear()} pickone</span><span>Simple decisions. Together.</span></footer>
    </main>
  );
}