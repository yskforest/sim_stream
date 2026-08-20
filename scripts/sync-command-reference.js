const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "assets/js/core/commands/command-catalog.js");
const docsPath = path.join(root, "docs/03_external_api_spec.md");
const start = "<!-- COMMAND_CATALOG:START -->";
const end = "<!-- COMMAND_CATALOG:END -->";

const source = fs.readFileSync(catalogPath, "utf8").replace(/\bexport\s+(?=const\b)/g, "");
const context = vm.createContext({});
vm.runInContext(source, context, { filename: catalogPath });
const definitions = vm.runInContext("CTCommandCatalog.definitions", context);

const labels = {
    gantry: "ガントリ部",
    couch: "寝台部",
    injector: "インジェクタ部",
    simulator: "全体・モデル制御",
    camera: "仮想カメラ・歪曲・配信"
};
const cell = value => String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
let previousTarget = "";
const rows = Object.entries(definitions).map(([key, definition]) => {
    const separator = key.indexOf(".");
    const target = key.slice(0, separator);
    const action = key.slice(separator + 1);
    const targetCell = target === previousTarget ? "" : `**\`${target}\`**<br>(${labels[target] || target})`;
    previousTarget = target;
    return `| ${targetCell} | \`${action}\` | \`${cell(definition.docs.params)}\` | ${cell(definition.docs.description)} |`;
});
const generated = [
    start,
    "<!-- この範囲は scripts/sync-command-reference.js により生成されます。 -->",
    "| ターゲット | アクション名 | パラメータ名・型 | 説明 |",
    "| :--- | :--- | :--- | :--- |",
    ...rows,
    end
].join("\n");

const docs = fs.readFileSync(docsPath, "utf8");
const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
if (!pattern.test(docs)) throw new Error("Command Catalog markers are missing from docs/03_external_api_spec.md");
const next = docs.replace(pattern, generated);

if (process.argv.includes("--write")) {
    fs.writeFileSync(docsPath, next, "utf8");
    console.log(`Updated ${path.relative(root, docsPath)} from ${Object.keys(definitions).length} Catalog definitions.`);
} else if (next !== docs) {
    console.error("Command reference is stale. Run: node scripts/sync-command-reference.js --write");
    process.exit(1);
} else {
    console.log(`Command reference: OK (${Object.keys(definitions).length} actions)`);
}
