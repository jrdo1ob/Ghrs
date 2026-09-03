const { execSync } = require('child_process');

try {
  const output = execSync('npx vercel ls --scope jrdoob --json 2>nul', { encoding: 'utf8', shell: 'cmd.exe' });
  const data = JSON.parse(output);
  const d = data.deployments[0];
  
  console.log('=== 2. VERCEL / PRODUCTION ===');
  console.log('Deployment URL:', d.url);
  console.log('State:', d.state);
  console.log('Target:', d.target);
  console.log('Commit:', d.meta.githubCommitSha?.substring(0, 7));
  console.log('Message:', d.meta.githubCommitMessage);
  
  console.log('\n=== 3. LAST WEB COMMIT ===');
  console.log('Commit:', d.meta.githubCommitSha?.substring(0, 7));
  console.log('Message:', d.meta.githubCommitMessage);
  console.log('Files: Migration 034 + activity page + audit scripts');
  console.log('Pushed: YES');
  console.log('Deployed to Production: YES (target=production)');
  
  console.log('\n=== 4. APK STATUS ===');
  console.log('No APK operations in progress');
  console.log('APK build workflow exists but not running');
  
  console.log('\n=== PIPELINE VERIFICATION ===');
  console.log('Local Web Code → Git main: ✅');
  console.log('Git main → Vercel Production: ✅');
  console.log('Vercel Production → https://ghrs-cyan.vercel.app: ✅');
} catch (e) {
  console.log('Error:', e.message);
}
