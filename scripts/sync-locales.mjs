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

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

// Recursively syncs target with source (en)
// Returns a new object that has exactly the keys of source
function syncObject(source, target) {
  const result = {};

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target ? target[key] : undefined;

    if (isPlainObject(sourceVal)) {
      // If source is object, we expect target to be object (or undefined)
      // If target is not an object, we treat it as missing/mismatched and sync from scratch
      const targetObj = isPlainObject(targetVal) ? targetVal : {};
      result[key] = syncObject(sourceVal, targetObj);
    } else {
      // Source is primitive (string, number, boolean, null)
      if (targetVal !== undefined && !isPlainObject(targetVal)) {
        // Keep existing translation if it's not an object (avoid type mismatch)
        result[key] = targetVal;
      } else {
        // Missing or type mismatch: use source value
        result[key] = sourceVal;
      }
    }
  }

  return result;
}

const enData = safeReadJson(enFile);
const files = fs
  .readdirSync(localesDir)
  .filter((f) => f.endsWith(".json") && f !== "en.json");

console.log(`Syncing locales against en.json...`);

for (const file of files) {
  const filePath = path.resolve(localesDir, file);
  console.log(`Processing ${file}...`);
  
  const targetData = safeReadJson(filePath);
  const syncedData = syncObject(enData, targetData);
  
  fs.writeFileSync(filePath, JSON.stringify(syncedData, null, 2) + "\n", "utf-8");
}

console.log("All locales synced successfully.");
