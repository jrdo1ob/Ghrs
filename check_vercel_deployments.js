const { execSync } = require('child_process');

try {
  const output = execSync('npx vercel ls --scope jrdoob --json 2>nul', { encoding: 'utf8', shell: 'cmd.exe' });
  const data = JSON.parse(output);
  
  console.log('=== VERCEL DEPLOYMENTS ===\n');
  data.deployments.forEach((d, i) => {
    console.log(`[${i + 1}] ${d.url}`);
    console.log(`    State: ${d.state}`);
    console.log(`    Target: ${d.target}`);
    console.log(`    Commit: ${d.meta.githubCommitSha?.substring(0, 7)}`);
    console.log(`    Message: ${d.meta.githubCommitMessage?.substring(0, 60)}`);
    console.log('');
  });
  
  // Check if e91e908 exists
  const targetCommit = data.deployments.find(d => d.meta.githubCommitSha?.startsWith('e91e908'));
  console.log('=== CHECK FOR COMMIT e91e908 ===');
  if (targetCommit) {
    console.log('Found: YES');
    console.log('URL:', targetCommit.url);
    console.log('State:', targetCommit.state);
    console.log('Target:', targetCommit.target);
  } else {
    console.log('Found: NO - commit e91e908 not in any deployment');
  }
  
} catch (e) {
  console.log('Error:', e.message);
}
