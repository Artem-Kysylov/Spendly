import fs from "fs";
import path from "path";

const localesDir = path.resolve(process.cwd(), "src/locales");
const enFile = path.resolve(localesDir, "en.json");
const enData = JSON.parse(fs.readFileSync(enFile, "utf-8"));

const files = fs.readdirSync(localesDir);

let hasErrors = false;

function checkKeys(obj, refObj, prefix = "") {
  for (const key in refObj) {
    if (Object.prototype.hasOwnProperty.call(refObj, key)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      if (
        typeof refObj[key] === "object" &&
        refObj[key] !== null &&
        !Array.isArray(refObj[key])
      ) {
        if (typeof obj[key] === "object" && obj[key] !== null) {
          checkKeys(obj[key], refObj[key], currentPath);
        } else {
          console.error(`Missing object: ${currentPath}`);
          hasErrors = true;
        }
      } else if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        console.error(`Missing key: ${currentPath}`);
        hasErrors = true;
      }
    }
  }
}

for (const file of files) {
  if (file.endsWith(".json") && file !== "en.json") {
    console.log(`Checking ${file}...`);
    const filePath = path.resolve(localesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    checkKeys(data, enData);
  }
}

const strict =
  process.env.STRICT_LOCALE_CHECK === "1" ||
  (process.env.LOCALE_CHECK_MODE ?? "").toLowerCase() === "strict";

if (hasErrors) {
  if (strict) {
    console.error("\nLocale check failed. Please fix the missing keys.");
    process.exit(1);
  } else {
    console.warn("\nLocale check found missing keys. Proceeding with build.");
  }
} else {
  console.log("\nLocale check passed.");
}
