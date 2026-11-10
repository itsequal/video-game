import { runAll } from "./suite.js";

const results = runAll();
let failed = 0;
for (const result of results) {
  if (result.ok) console.log(`ok  ${result.name}`);
  else {
    failed += 1;
    console.error(`FAIL ${result.name}\n  ${result.error}`);
  }
}
console.log(`${results.length - failed}/${results.length} pruebas`);
process.exit(failed ? 1 : 0);
