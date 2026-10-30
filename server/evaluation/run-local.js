#!/usr/bin/env node
// Local research tool only. Never point the app server at production data.
import fs from 'node:fs/promises';
import path from 'node:path';
import { runEvaluation, createLocalAssessmentAdapter } from './runner.js';

async function main() {
    const [manifestFile, imageRootArg, resultRootArg, workflowVersion, estimateArg, approval] = process.argv.slice(2);
    if (!manifestFile || !imageRootArg || !resultRootArg || !workflowVersion || !estimateArg) throw new Error('Usage: node server/evaluation/run-local.js MANIFEST IMAGE_ROOT RESULT_ROOT WORKFLOW_VERSION COST_PER_IMAGE [--approve-cost]');
    const estimate = Number(estimateArg);
    if (!Number.isFinite(estimate) || estimate < 0) throw new Error('COST_PER_IMAGE must be a nonnegative number in your chosen currency');
    const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
    const cases = manifest.selected;
    if (!Array.isArray(cases) || cases.length > 100) throw new Error('Expected a selected manifest of at most 100 images');
    console.log(JSON.stringify({ count: cases.length, estimatePerImage: estimate, totalEstimate: estimate * cases.length, currency: 'operator-defined', approvalRequired: approval !== '--approve-cost', note: 'Estimate excludes unknown charges; validate isolated server and provider pricing before approval.' }, null, 2));
    if (approval !== '--approve-cost') return;
    const imageRoot = await fs.realpath(imageRootArg);
    const resultRoot = path.resolve(resultRootArg);
    await fs.mkdir(resultRoot, { recursive: true, mode: 0o700 });
    const store = {
        has: async (key) => fs.access(path.join(resultRoot, `${key}.json`)).then(() => true, () => false),
        claim: async (key) => {
            try { await fs.writeFile(path.join(resultRoot, `${key}.lock`), workflowVersion, { flag:'wx', mode:0o600 }); return true; }
            catch (error) { if (error.code === 'EEXIST') return false; throw error; }
        },
        save: async (key, value) => fs.writeFile(path.join(resultRoot, `${key}.json`), JSON.stringify(value, null, 2), { flag:'wx', mode:0o600 }),
    };
    const prepared = cases.map((item) => ({ ...item, loadImage: async () => {
        if (typeof item.localPath !== 'string' || path.isAbsolute(item.localPath)) throw new Error('A relative localPath is required');
        const target = await fs.realpath(path.resolve(imageRoot, item.localPath));
        if (!target.startsWith(`${imageRoot}${path.sep}`)) throw new Error('Image path escapes image root');
        return fs.readFile(target);
    } }));
    const controller = new AbortController();
    process.once('SIGINT', () => controller.abort());
    const result = await runEvaluation({cases:prepared, assess:createLocalAssessmentAdapter({baseUrl:'http://127.0.0.1:3002'}), store, workflowVersion, maxImages:100, estimatePerImage:estimate, costApproved:true, signal:controller.signal});
    console.log(JSON.stringify(result, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
