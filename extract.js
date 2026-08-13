const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");

function extractConst(name) {
  const start = html.indexOf("const " + name + " = ");
  if (start === -1) throw new Error("not found: " + name);
  const valueStart = start + ("const " + name + " = ").length;
  const body = html.slice(valueStart);
  // The WORDS array and SENTENCES object end with ";" followed by newline.
  let depth = 0;
  let end = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error("unterminated: " + name);
  return body.slice(0, end);
}

const WORDS = eval("(" + extractConst("WORDS") + ")");
const SENTENCES = eval("(" + extractConst("SENTENCES") + ")");
const ADVANCED_SENTENCES = eval("(" + extractConst("ADVANCED_SENTENCES") + ")");

fs.mkdirSync("web/src/data", { recursive: true });

const words = WORDS.map((u) => ({
  unit: u.unit,
  title: u.title,
  words: u.words.map((w) => ({ n: w.n, w: w.w, m: w.m })),
}));

fs.writeFileSync(
  "web/src/data/vocab.json",
  JSON.stringify({ units: words }, null, 2)
);
fs.writeFileSync(
  "web/src/data/sentences.json",
  JSON.stringify(SENTENCES, null, 2)
);
fs.writeFileSync(
  "web/src/data/advanced-sentences.json",
  JSON.stringify(ADVANCED_SENTENCES, null, 2)
);

console.log("units:", words.length);
console.log(
  "words total:",
  words.reduce((a, u) => a + u.words.length, 0)
);
console.log("sentences:", Object.keys(SENTENCES).length);
console.log(
  "advanced sentences:",
  Object.keys(ADVANCED_SENTENCES).length
);