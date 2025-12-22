import fs from "fs";
import path from "path";

const localesDir = path.resolve(process.cwd(), "src/locales");
const enFile = path.resolve(localesDir, "en.json");

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error(`Failed to parse JSON: ${filePath}`);
    throw e;
  }
}

const enData = safeReadJson(enFile);
const files = fs
  .readdirSync(localesDir)
  .filter((f) => f.endsWith(".json") && f !== "en.json");

let hasErrors = false;

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function checkMissing(obj, refObj, prefix = "", acc = []) {
  for (const key of Object.keys(refObj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    const refVal = refObj[key];
    const val = obj?.[key];
    if (isPlainObject(refVal)) {
      if (isPlainObject(val)) {
        checkMissing(val, refVal, currentPath, acc);
      } else {
        acc.push({ type: "object", path: currentPath });
      }
    } else {
      if (!(key in obj)) {
        acc.push({ type: "key", path: currentPath });
      }
    }
  }
  return acc;
}

function findExtras(obj, refObj, prefix = "", acc = []) {
  for (const key of Object.keys(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    const refVal = refObj?.[key];
    if (isPlainObject(val)) {
      if (isPlainObject(refVal)) {
        findExtras(val, refVal, currentPath, acc);
      } else if (!(key in refObj)) {
        acc.push(currentPath);
      } else {
        acc.push(currentPath);
      }
    } else {
      if (!(key in refObj) || isPlainObject(refVal)) {
        acc.push(currentPath);
      }
    }
  }
  return acc;
}

function extractPlaceholders(str) {
  const re = /\{([^}]+)\}/g;
  const set = new Set();
  let m;
  while ((m = re.exec(str)) !== null) {
    const name = m[1].split(",")[0].trim();
    if (name) set.add(name);
  }
  return set;
}

function checkPlaceholders(localeObj, refObj, prefix = "", acc = []) {
  for (const key of Object.keys(refObj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    const refVal = refObj[key];
    const locVal = localeObj?.[key];
    if (isPlainObject(refVal)) {
      if (isPlainObject(locVal)) {
        checkPlaceholders(locVal, refVal, currentPath, acc);
      }
    } else if (typeof refVal === "string" && typeof locVal === "string") {
      const baseSet = extractPlaceholders(refVal);
      const locSet = extractPlaceholders(locVal);
      const missing = [...baseSet].filter((p) => !locSet.has(p));
      const extra = [...locSet].filter((p) => !baseSet.has(p));
      if (missing.length || extra.length) {
        acc.push({ path: currentPath, missing, extra });
      }
    }
  }
  return acc;
}

for (const file of files) {
  const filePath = path.resolve(localesDir, file);
  console.log(`Checking ${file}...`);
  const data = safeReadJson(filePath);

  const missing = checkMissing(data, enData);
  const extras = findExtras(data, enData);
  const placeholders = checkPlaceholders(data, enData);

  if (missing.length) {
    hasErrors = true;
    for (const m of missing) {
      if (m.type === "object") console.error(`Missing object: ${m.path}`);
      else console.error(`Missing key: ${m.path}`);
    }
  }

  if (extras.length) {
    console.warn("Extra keys:");
    for (const p of extras) console.warn(`  - ${p}`);
  }

  if (placeholders.length) {
    hasErrors = true;
    console.error("Placeholder mismatches:");
    for (const pm of placeholders) {
      const miss = pm.missing.length ? `missing {${pm.missing.join(", ")}}` : "";
      const extr = pm.extra.length ? `extra {${pm.extra.join(", ")}}` : "";
      console.error(`  - ${pm.path}: ${[miss, extr].filter(Boolean).join("; ")}`);
    }
  }
}

const strict =
  process.env.STRICT_LOCALE_CHECK === "1" ||
  (process.env.LOCALE_CHECK_MODE ?? "").toLowerCase() === "strict";

if (hasErrors) {
  if (strict) {
    console.error("\nLocale check failed. Please fix the issues.");
    process.exit(1);
  } else {
    console.warn("\nLocale check found issues. Proceeding.");
  }
} else {
  console.log("\nLocale check passed.");
}
