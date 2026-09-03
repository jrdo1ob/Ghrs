const { execSync } = require('child_process');

try {
  const output = execSync('npx vercel ls --scope jrdoob --json 2>nul', { encoding: 'utf8', shell: 'cmd.exe' });
  const data = JSON.parse(output);
  
  console.log('=== ALL DEPLOYMENTS ===\n');
  data.deployments.forEach((d, i) => {
    const sha = d.meta.githubCommitSha?.substring(0, 7);
    if (sha === 'e91e908' || sha === '45822a9' || sha === '60fd3a3' || sha === '4e2fd50') {
      console.log(`[${i + 1}] ${d.url}`);
      console.log(`    State: ${d.state}`);
      console.log(`    Target: ${d.target}`);
      console.log(`    Commit: ${sha}`);
      console.log(`    Message: ${d.meta.githubCommitMessage?.substring(0, 80)}`);
      console.log('');
    }
  });
  
} catch (e) {
  console.log('Error:', e.message);
}
