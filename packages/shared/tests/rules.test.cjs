const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rulesPath = path.resolve(__dirname, "../../../data/rules.json");
const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
const constants = require("../dist/constants.js");

const REQUIRED_EU_CODES = [
  "DE",
  "FR",
  "IT",
  "ES",
  "NL",
  "BE",
  "AT",
  "PT",
  "IE",
  "FI",
  "SE",
  "DK",
  "PL",
  "CZ",
  "RO",
  "BG",
  "HR",
  "SK",
  "SI",
  "LT",
  "LV",
  "EE",
  "LU",
  "MT",
  "CY",
  "HU",
  "EL",
  "GR"
];

test("rules cover expected jurisdictions", () => {
  assert.deepEqual(Object.keys(rules).sort(), ["AU", "EU", "GB"]);
});

test("adult_content schema has required fields", () => {
  for (const jurisdiction of Object.keys(rules)) {
    const entry = rules[jurisdiction].adult_content;
    assert.equal(typeof entry.regulator, "string");
    assert.equal(typeof entry.regulation, "string");
    assert.equal(typeof entry.enforcementDate, "string");
    assert.ok(Array.isArray(entry.approvedMethods));
    assert.ok(Array.isArray(entry.rejectedMethods));
  }
});

test("approved methods include mock provider", () => {
  for (const jurisdiction of Object.keys(rules)) {
    const methods = rules[jurisdiction].adult_content.approvedMethods;
    for (const method of methods) {
      assert.ok(
        Array.isArray(method.providers) && method.providers.includes("mock"),
        `Expected mock provider in ${jurisdiction}:${method.method}`
      );
    }
  }
});

test("EU member country constants contain required mapping entries", () => {
  for (const countryCode of REQUIRED_EU_CODES) {
    assert.ok(constants.EU_MEMBER_COUNTRY_CODES.includes(countryCode));
    assert.equal(constants.COUNTRY_TO_JURISDICTION_MAP[countryCode], "EU");
  }
});
