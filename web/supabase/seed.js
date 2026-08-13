/* eslint-disable no-console */
// Seeds vocabulary + sentences + a few sample exam sheets/schedules into Supabase.
// Usage: node supabase/seed.js  (run this from the machine with an anon key that has insert perms)
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_* env vars. Copy .env.local.example -> .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const units = require("../src/data/vocab.json").units;
const sentences = require("../src/data/sentences.json");
const advanced = require("../src/data/advanced-sentences.json");

async function main() {
  console.log("Clearing existing vocab tables…");
  await supabase.from("vocab_sentences").delete().gte("id", 0);
  await supabase.from("vocab_words").delete().gte("id", 0);
  await supabase.from("vocab_units").delete().gte("id", 0);

  console.log("Inserting units…");
  for (const u of units) {
    const { error } = await supabase.from("vocab_units").insert({
      unit_number: u.unit,
      title: u.title,
    });
    if (error) throw error;
  }

  console.log("Inserting words…");
  for (const u of units) {
    for (const w of u.words) {
      const { error } = await supabase.from("vocab_words").insert({
        unit_number: u.unit,
        n: w.n,
        word: w.w,
        meaning: w.m,
      });
      if (error) throw error;
    }
  }

  console.log("Inserting sentences…");
  for (const key of Object.keys(sentences)) {
    const [unit_number, n] = key.split(".").map(Number);
    const { error } = await supabase.from("vocab_sentences").insert({
      unit_number,
      n,
      sentence: sentences[key],
      advanced: advanced[key] || "",
    });
    if (error) throw error;
  }

  console.log("Ensuring storage buckets…");
  for (const bucket of ["exam-answers", "question-images"]) {
    await supabase.storage.createBucket(bucket, { public: true });
  }

  console.log("Seed complete ✓");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});