# JobLens — LinkedIn Hiring Filter

A Chrome extension that shows only hiring posts in your LinkedIn feed. Everything runs locally in your browser: no servers, no API keys, no data sent anywhere.

## Why

Many jobs are posted in the LinkedIn **feed** ("We're hiring!", "My team is looking for...") rather than the Jobs tab, and they get buried under announcements, advice posts and ads. Existing filters use simple keyword lists or send your feed to a paid AI API. JobLens starts with a scored rule system and is designed to be upgraded to a small classifier trained on real labeled posts, running on-device.

## Install (developer mode)

1. Download or clone this folder.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder (the one containing `manifest.json`).
4. Open linkedin.com/feed. Use the toolbar icon to change settings.

## Features (v0.1)

- **Scored rules**: each post gets a score from positive signals ("we're hiring", "apply here", job links) and negative ones (#OpenToWork, "starting a new position", tips posts). Score ≥ 3 = hiring post.
- **Collapse or remove** non-job posts. Collapsed posts show a thin bar you can click to reveal.
- **Show scores**: shows each post's score; hover to see which rules fired.
- **Labeling mode**: "Job" / "Not job" buttons on each post. Labels are saved in your browser and exported as JSON for training the v2 model.

## Project structure

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (Manifest V3) |
| `rules.js` | Scoring rules + `scoreText()` — the part v2 replaces with a model |
| `content.js` | Finds feed posts, scores them, hides/shows, labeling UI |
| `content.css` | Styles for the bar and hidden posts |
| `popup.html/js` | Settings, label count, export |

LinkedIn changes its page structure often. All LinkedIn-specific CSS selectors are in the `SELECTORS` block at the top of `content.js`, so fixes stay in one place.

## Roadmap

- **v0.2**: Label 300+ posts, measure the rule baseline (precision/recall), tune rules.
- **v0.3**: Fine-tune a small transformer (e.g. DistilBERT) on the labels, compare against the baseline.
- **v0.4**: Export to ONNX and run it in the browser (transformers.js / onnxruntime-web).
- **v0.5**: Rank hiring posts by fit to your target roles and location; extract role/company/location.

## Responsible use

JobLens only changes what you see on your own screen. It does not scrape, auto-scroll, click, message, or send data anywhere. Labels are collected only from posts you see during normal browsing.
