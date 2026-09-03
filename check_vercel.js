const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx vercel ls --scope jrdoob --json 2>nul', { encoding: 'utf8', shell: 'cmd.exe' });
  const data = JSON.parse(output);
  const d = data.deployments[0];
  console.log('Deployment URL:', d.url);
  console.log('State:', d.state);
  console.log('Target:', d.target);
  console.log('Commit:', d.meta.githubCommitSha?.substring(0, 7));
  console.log('Message:', d.meta.githubCommitMessage);
} catch (e) {
  console.log('Error:', e.message);
}
