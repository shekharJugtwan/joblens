// rules.js — the "brain" of version 1.
// Each rule is [regex, weight, reason]. A post's score is the sum of matching weights.
// Score >= THRESHOLD  =>  treated as a hiring post.
// In version 2 you replace scoreText() with your trained classifier; nothing else has to change.

(function (g) {
  const THRESHOLD = 3;

  const RULES = [
    // ---- Positive signals (looks like a job post) ----
    [/\bwe(?:'|’)?re hiring\b|\bwe are hiring\b|\bnow hiring\b|#hiring\b/i, 4, "hiring phrase"],
    [/\b(?:is|are|am) hiring\b/i, 3, "X is hiring"],
    [/\b(?:apply|applications?)\s+(?:here|now|via|through|at|using|below)\b/i, 3, "apply call-to-action"],
    [/\b(?:send|share|dm|email)\s+(?:me\s+|us\s+)?(?:your\s+)?(?:resume|cv)s?\b/i, 3, "send resume"],
    [/\bjoin (?:our|my) (?:growing )?team\b/i, 2, "join our team"],
    [/\bopen (?:roles?|positions?)\b|\bjob openings?\b|\bvacanc(?:y|ies)\b/i, 2, "opening"],
    [/\blooking for (?:an?|talented|experienced|skilled|strong)\b/i, 2, "looking for a..."],
    [/\b(?:full[- ]time|part[- ]time|contract (?:role|position)|internship|co-?op)\b/i, 1, "job type"],
    [/\b(?:remote|hybrid|on-?site)\b/i, 1, "work mode"],
    [/\b\d+\+?\s*(?:years?|yrs?)\b.{0,25}\bexperience\b/i, 1, "years of experience"],
    [/\b(?:responsibilities|requirements|qualifications|job description)\b/i, 1, "job-description words"],
    [/\b(?:salary|compensation|per hour|\$\s?\d{2,3}k)\b/i, 1, "pay mentioned"],

    // ---- Negative signals (job-related noise, not a job post) ----
    [/#opentowork\b|\bopen to work\b/i, -5, "open to work (job seeker)"],
    [/\b(?:i(?:'|’)?m|i am) (?:actively )?(?:looking for|seeking) (?:a |new |my next )?(?:job|role|opportunit|position)/i, -5, "job seeker"],
    [/\bstarting a new position\b|\bi(?:'|’)?m happy to share\b|\bexcited to (?:share|announce) that i\b/i, -4, "personal announcement"],
    [/\b(?:certificat(?:e|ion)|congratulations|congrats)\b/i, -2, "achievement post"],
    [/\b(?:\d+ tips|interview tips|resume tips|mistakes|lessons i learned|how to (?:get|land|crack))\b/i, -2, "advice content"],
    [/\b(?:laid off|layoffs?)\b/i, -2, "layoff post"],
  ];

  function scoreText(text, hasJobLink) {
    let score = 0;
    const reasons = [];
    for (const [re, weight, reason] of RULES) {
      if (re.test(text)) {
        score += weight;
        reasons.push(`${weight > 0 ? "+" : ""}${weight} ${reason}`);
      }
    }
    if (hasJobLink) {
      score += 5;
      reasons.push("+5 links to a LinkedIn job");
    }
    return { score, reasons, isJob: score >= THRESHOLD };
  }

  g.JobLensRules = { scoreText, THRESHOLD };
})(typeof window !== "undefined" ? window : globalThis);
