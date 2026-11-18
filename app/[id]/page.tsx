"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Poll = {
  id: string;
  question: string;
  options: { id: string; label: string }[];
  total_votes: number;
  results: { option_id: string; label: string; votes: number; voters: string[] }[];
};

function voterId() {
  const key = "pick-one-voter";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function PollPage() {
  const { id } = useParams<{ id: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const loadPoll = useCallback(async () => {
    if (!supabase) return;
    const { data, error: e } = await supabase.rpc("get_poll", { p_poll_id: id });
    if (e) {
      setError("Poll not found. Check the link and try again.");
      return;
    }
    setPoll(data as Poll);
  }, [id]);

  useEffect(() => {
    setName(localStorage.getItem("pick-one-name") ?? "");
    setHasVoted(localStorage.getItem("pick-one-voted:" + id) === "yes");
    void loadPoll();
  }, [id, loadPoll]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadPoll(), 5000);
    return () => window.clearInterval(timer);
  }, [loadPoll]);

  async function vote() {
    if (!supabase || !poll || !selected || !name.trim()) return;
    setBusy(true);
    setError("");
    const { error: e } = await supabase.rpc("cast_vote", {
      p_poll_id: poll.id,
      p_option_id: selected,
      p_voter_id: voterId(),
      p_voter_name: name.trim(),
    });
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    localStorage.setItem("pick-one-name", name.trim());
    localStorage.setItem("pick-one-voted:" + id, "yes");
    setHasVoted(true);
    await loadPoll();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const total = poll?.total_votes ?? 0;

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/">pick<span>one</span><i>.</i></a>
        <span className="top-note">A better way to decide together</span>
      </header>
      <section className="poll-view">
        <div className="eyebrow"><span className="live-dot" /> LIVE GROUP POLL</div>
        {poll ? (
          <>
            <h1 className="poll-question">{poll.question}</h1>
            <p className="intro">{total} {total === 1 ? "vote" : "votes"} so far · Votes are public</p>
            <div className="results">
              {poll.options.map(option => {
                const result = poll.results?.find(r => r.option_id === option.id);
                const votes = result?.votes ?? 0;
                const pct = total ? Math.round(votes / total * 100) : 0;
                return (
                  <button
                    key={option.id}
                    className={`result-option ${selected === option.id ? "selected" : ""}`}
                    onClick={() => setSelected(option.id)}
                    disabled={busy}
                  >
                    <span className="result-top"><span>{option.label}</span><strong>{pct}%</strong></span>
                    <span className="bar"><span style={{ width: pct + "%" }} /></span>
                    <span className="vote-count">{votes} {votes === 1 ? "vote" : "votes"}</span>
                    {result?.voters?.length ? (
                      <span className="voter-names">{result.voters.join(" · ")}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="vote-form">
              <label htmlFor="voter-name">Your name</label>
              <input
                id="voter-name"
                className="voter-name"
                value={name}
                onChange={event => setName(event.target.value)}
                maxLength={40}
                placeholder="Enter your name"
                autoComplete="name"
              />
              <p className="vote-hint">Your name and choice will be visible to everyone.</p>
              <button
                className="primary vote-button"
                onClick={vote}
                disabled={busy || !selected || !name.trim()}
              >
                {busy ? "Saving…" : hasVoted ? "Update my vote" : "Submit my vote"} <span>↗</span>
              </button>
            </div>
            <button className="share-button" onClick={copyLink}>{copied ? "Link copied" : "Copy poll link"}</button>
            <p className="privacy-note">You can change your vote at any time. One vote per name in this poll.</p>
          </>
        ) : (
          <>
            <h1 className="poll-question">This poll isn’t available.</h1>
            <p className="intro">The link may be incomplete, or the poll may have been removed.</p>
            <a className="primary link-button" href="/">Create a new poll ↗</a>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </section>
      <footer><span>© {new Date().getFullYear()} pickone</span><span>Simple decisions. Together.</span></footer>
    </main>
  );
}
