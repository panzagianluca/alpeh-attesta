import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const src = 'contracts/out/EvidenceRegistry.sol/EvidenceRegistry.json';
const dst = 'src/abi/EvidenceRegistry.json';

try {
  const raw = JSON.parse(readFileSync(src, 'utf8'));
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, JSON.stringify({ abi: raw.abi }, null, 2));
  console.log('ABI copied to', dst);
} catch (error) {
  console.error('Error copying ABI:', error);
  process.exit(1);
}
