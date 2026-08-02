import { runAuthTests } from './auth.test.js';
import { runCollectorTests } from './collector.test.js';
import { runRetrievalTests } from './retrieval.test.js';
import { runBiasTests } from './bias.test.js';
import { runSynthesisTests } from './synthesis.test.js';
import { runEmployeeTests } from './employee.test.js';
import { runDepartmentsAndTeamsTests } from './departments_teams.test.js';

async function main() {
  try {
    await runAuthTests();
    await runCollectorTests();
    await runRetrievalTests();
    await runBiasTests();
    await runSynthesisTests();
    await runEmployeeTests();
    await runDepartmentsAndTeamsTests();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Test Execution Failed:', err);
    process.exit(1);
  }
}

main();
