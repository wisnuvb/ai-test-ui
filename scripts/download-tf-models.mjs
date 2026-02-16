import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'public', 'tf-models');

const MODELS = [
  {
    name: 'mnist',
    url: 'https://storage.googleapis.com/tfjs-models/tfjs/mnist_transfer_cnn_v1/model.json',
    outDir: path.join(OUT_DIR, 'mnist'),
  },
  {
    name: 'mobilenet_v2',
    url: 'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json',
    outDir: path.join(OUT_DIR, 'mobilenet_v2'),
  },
];

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

function resolveRelative(baseUrl, relativePath) {
  return new URL(relativePath, baseUrl).toString();
}

async function downloadTfjsModel(modelUrl, outDir) {
  await mkdir(outDir, { recursive: true });

  const modelJsonBytes = await download(modelUrl);
  const modelJsonPath = path.join(outDir, 'model.json');
  await writeFile(modelJsonPath, modelJsonBytes);

  const modelJson = JSON.parse(new TextDecoder().decode(modelJsonBytes));
  const manifests = modelJson.weightsManifest ?? [];
  const shardPaths = manifests.flatMap((m) => m.paths ?? []);

  for (const shardRelPath of shardPaths) {
    const shardUrl = resolveRelative(modelUrl, shardRelPath);
    const shardBytes = await download(shardUrl);

    const shardOutPath = path.join(outDir, shardRelPath);
    await mkdir(path.dirname(shardOutPath), { recursive: true });
    await writeFile(shardOutPath, shardBytes);
  }

  return { shardCount: shardPaths.length };
}

async function main() {
  console.log(`Downloading TFJS models into: ${OUT_DIR}`);

  for (const m of MODELS) {
    console.log(`\n- ${m.name}`);
    const { shardCount } = await downloadTfjsModel(m.url, m.outDir);
    console.log(`  Saved model.json + ${shardCount} weight shard(s) to ${path.relative(ROOT, m.outDir)}`);
  }

  console.log('\nDone. You can now run the app offline (after first install).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
