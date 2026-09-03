const { execSync } = require('child_process');

try {
  const output = execSync('npx vercel ls --scope jrdoob --json 2>nul', { encoding: 'utf8', shell: 'cmd.exe' });
  const data = JSON.parse(output);
  
  console.log('=== CHECK FOR COMMIT e91e908 ===');
  const target = data.deployments.find(d => d.meta.githubCommitSha?.startsWith('e91e908'));
  if (target) {
    console.log('Found: YES');
    console.log('URL:', target.url);
    console.log('State:', target.state);
    console.log('Target:', target.target);
  } else {
    console.log('Found: NO - commit e91e908 not in any deployment');
  }
  
  console.log('\n=== ALL DEPLOYMENTS ===');
  data.deployments.forEach((d, i) => {
    if (i < 5) {
      console.log(`[${i + 1}] ${d.meta.githubCommitSha?.substring(0, 7)} | ${d.state} | ${d.target} | ${d.meta.githubCommitMessage?.substring(0, 50)}`);
    }
  });
  
} catch (e) {
  console.log('Error:', e.message);
}
