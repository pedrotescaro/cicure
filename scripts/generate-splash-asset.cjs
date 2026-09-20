// A generated blank native resource keeps Android from substituting the app icon.
// Run from the repository root with: node scripts/generate-splash-asset.cjs
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const { generateImageBackgroundAsync } = require('@expo/image-utils');

async function main() {
  const source = await generateImageBackgroundAsync({ width: 4, height: 4, backgroundColor: '#FFFFFF' });
  await writeFile(path.join(__dirname, '..', 'assets', 'splash-blank.png'), source);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
