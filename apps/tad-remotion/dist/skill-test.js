"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Quick smoke-test: import the skill barrel and run the pipeline with a known input
const orchestrator_1 = require("./skill/pipeline/orchestrator");
async function main() {
    const input = {
        theme: 'why-diesel',
        platform: 'tiktok',
        durationSec: 30,
        brand: {
            name: 'TAD Advertising',
            colorPrimary: '#e51636',
            colorSecondary: '#f5c400',
            tagline: 'Tu marca en movimiento',
        },
    };
    console.log('Running TAD Remotion Skill pipeline…');
    console.log('Input:', JSON.stringify(input, null, 2));
    console.time('pipeline');
    try {
        const project = await (0, orchestrator_1.runPipeline)(input);
        console.timeEnd('pipeline');
        console.log('\n=== VideoProject result ===');
        console.log('projectId :', project.projectId);
        console.log('theme     :', project.theme);
        console.log('platform  :', project.platform);
        console.log('title     :', project.title);
        console.log('headline  :', project.headline);
        console.log('duration  :', project.totalDurationSec + 's');
        console.log('fps       :', project.fps);
        console.log('scenes    :', project.scenes.length);
        console.log('qaReport  :', JSON.stringify(project.qaReport, null, 2));
        // Validate scene timing
        for (const s of project.scenes) {
            const ok = s.startSec >= 0 && s.durationSec > 0 && s.onScreenText.length > 0;
            console.log(`  Scene ${s.id} (${s.narrativeFunction}) [${s.startSec}s +${s.durationSec}s] — text=${ok ? '✓' : '✗ MISSING'}`);
        }
    }
    catch (err) {
        console.error('Pipeline threw:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=skill-test.js.map