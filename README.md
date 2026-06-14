# Qyudal ->

**A multi-agent news intelligence engine.**
Built for **FAR AWAY 2026** · Theme: *Agentic & Autonomous Systems*.

Qyudal doesn't just surface the news — a system of specialized agents ingests, explains,
predicts, debates, fact-checks and briefs each story, so you see every side and decide
where you stand.

> Qyudal began as an earlier news-app build and was significantly reframed and extended
> for FAR AWAY 2026's Agentic & Autonomous Systems theme.

## The problem

A headline gives you one angle and one implied opinion. Actually understanding a story
means gathering sources, weighing opposing views, tracing the timeline, reasoning about
what's next, and fact-checking — a multi-step reasoning workload almost nobody has time
for. That isn't a summarizing problem; it's exactly what autonomous agents are built for.

## What it does

For any story, **7 agents work in parallel** and return a complete analysis in under 4 seconds:

| Agent | What it does |
|-------|--------------|
| Explain | What happened, root causes, what's next, why it matters |
| Predict | Three weighted future scenarios |
| Debate | Opposing perspectives + a neutral synthesis |
| Timeline | Chronological build-up of events |
| Visualize | Cause-and-effect flow of the story |
| Notes | TL;DR, key facts and study questions |
| Fact-Check | A confidence score on every story |

The key architectural win: running the agents **concurrently (`Promise.all`)** rather than
sequentially cuts a full analysis from 20–30s down to under 4s.

## Features

- **Lite Mode** — a fast, vertical, swipeable live-news feed across Geopolitics, Tech & AI, Economy, India, Climate and more
- **Lit Mode** — tap any story to run the full 7-agent deep analysis
- **Morning Brief** — an autonomous curation agent assembles a daily digest of the top stories
- **Confidence Score** — every story rated for source credibility and completeness
- **Secure accounts** — Firebase email/password auth with saved sessions
- Learning & lifestyle sections (study, health, success stories, puzzles)

## Tech stack

- React Native + Expo (JavaScript)
- Google Gemini (primary LLM) with Groq / Llama 3.3 fallback for fast inference
- NewsAPI for live multi-source story ingestion
- Firebase (Authentication + Firestore)

## Run it locally

Prerequisites: Node.js (LTS) and the Expo Go app on your phone.

```bash
git clone https://github.com/AMSecretAgent/qyudal-app.git
cd qyudal-app
npm install
```

API keys are kept out of the repo. Create a file named `secrets.js` in the project root:

```js
export const NEWS_API_KEY   = 'YOUR_NEWSAPI_KEY';
export const GROQ_API_KEY   = 'YOUR_GROQ_KEY';
export const GEMINI_API_KEY = 'YOUR_GEMINI_KEY';
```

Get free keys: [NewsAPI](https://newsapi.org) · [Groq](https://console.groq.com) ·
[Gemini (Google AI Studio)](https://aistudio.google.com).

The Firebase config lives in `App.js` and works as-is for the demo; swap in your own
project's config if you fork this.

Start the app:

```bash
npx expo start
```

Scan the QR code with Expo Go and Qyudal loads on your device.

## Future scope

An orchestrator agent that autonomously decides which agents to fire per story,
multilingual feeds (Hindi, Tamil, Bengali), audio news cards, publisher partnerships,
and smart notifications that decide what you need to know.
