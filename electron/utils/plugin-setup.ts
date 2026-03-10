/**
 * Memory Plugin Setup
 * Ensures memory-lancedb-pro is installed and configured when D:\TheClaw is initialised.
 *
 * Strategy:
 *  1. Copy bundled source files (resources/plugins/memory-lancedb-pro/) to the
 *     openclaw workspace plugins directory.
 *  2. Run `npm ci --omit=dev` to install native dependencies.
 *  3. Register the plugin path and a disabled-by-default entry in openclaw.json
 *     (user must supply an embedding API key and enable the plugin via Settings).
 *
 * The function is idempotent — safe to call on every app startup.
 * Plugin config uses SiliconFlow (api.siliconflow.cn) for both embedding and reranking,
 * which is accessible from mainland China without a VPN.
 */
import { access, mkdir, cp } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getOpenClawConfigDir, getOpenClawHomeDir, getResourcesDir } from './paths';
import { readOpenClawConfig, writeOpenClawConfig } from './channel-config';
import { logger } from './logger';

const execAsync = promisify(exec);

const PLUGIN_NAME = 'memory-lancedb-pro';

function getPluginTargetDir(): string {
  return join(getOpenClawConfigDir(), 'workspace', 'plugins', PLUGIN_NAME);
}

function getPluginSourceDir(): string {
  return join(getResourcesDir(), 'plugins', PLUGIN_NAME);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * The plugin is considered fully installed when its native LanceDB module is
 * present (which is only there after `npm ci` completes successfully).
 */
async function isPluginInstalled(): Promise<boolean> {
  const lancedbDir = join(getPluginTargetDir(), 'node_modules', '@lancedb', 'lancedb');
  return fileExists(lancedbDir);
}

async function copyPluginSource(): Promise<void> {
  const sourceDir = getPluginSourceDir();
  const targetDir = getPluginTargetDir();

  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true, force: true });
  logger.info(`Copied ${PLUGIN_NAME} source to ${targetDir}`);
}

async function runNpmInstall(): Promise<void> {
  const targetDir = getPluginTargetDir();

  // Use Alibaba Cloud npm mirror for reliable downloads in mainland China.
  const REGISTRY = '--registry https://registry.npmmirror.com';

  // Prefer `npm ci` (deterministic, uses package-lock.json) when the lockfile
  // is present; fall back to `npm install --omit=dev` otherwise.
  const hasLock = await fileExists(join(targetDir, 'package-lock.json'));
  const cmd = hasLock
    ? `npm ci --omit=dev --no-audit --no-fund ${REGISTRY}`
    : `npm install --omit=dev --no-audit --no-fund ${REGISTRY}`;

  logger.info(`Running "${cmd}" for ${PLUGIN_NAME}...`);

  // Pass HOME/USERPROFILE/OPENCLAW_HOME so npm post-install scripts and any
  // OpenClaw sub-processes resolve ~ to D:\TheClaw instead of the system home.
  const homeDir = getOpenClawHomeDir();
  const { stdout, stderr } = await execAsync(cmd, {
    cwd: targetDir,
    timeout: 5 * 60 * 1000, // 5 minutes
    windowsHide: true,
    env: {
      ...process.env,
      HOME: homeDir,
      USERPROFILE: homeDir,
      OPENCLAW_HOME: homeDir,
    },
  });

  if (stdout) logger.debug(`npm stdout: ${stdout.slice(0, 500)}`);
  if (stderr) logger.debug(`npm stderr: ${stderr.slice(0, 500)}`);

  logger.info(`${PLUGIN_NAME} npm install completed`);
}

/**
 * Add the plugin load path, entry config, and memory slot mapping to openclaw.json.
 * Only writes what is missing — never overwrites existing user configuration.
 */
async function ensurePluginConfig(): Promise<void> {
  const pluginPath = getPluginTargetDir();
  const config = await readOpenClawConfig();

  if (!config.plugins) config.plugins = {};

  // plugins.load.paths
  if (!config.plugins.load) (config.plugins as Record<string, unknown>).load = { paths: [] };
  const load = config.plugins.load as { paths?: string[] };
  if (!Array.isArray(load.paths)) load.paths = [];
  if (!load.paths.includes(pluginPath)) {
    load.paths = [...load.paths, pluginPath];
  }

  // plugins.entries.memory-lancedb-pro
  if (!config.plugins.entries) config.plugins.entries = {};

  // Migrate tilde dbPath to absolute path so the plugin works regardless of
  // what HOME resolves to (the gateway sets HOME=D:\TheClaw but CLI tools may
  // not, causing C:\Users\... to be used instead).
  const existingEntry = config.plugins.entries[PLUGIN_NAME] as
    | { config?: { dbPath?: string } }
    | undefined;
  if (existingEntry?.config?.dbPath?.startsWith('~')) {
    existingEntry.config.dbPath = join(getOpenClawConfigDir(), 'memory', 'lancedb-pro');
    logger.info(`${PLUGIN_NAME} migrated tilde dbPath to absolute path`);
  }

  if (!config.plugins.entries[PLUGIN_NAME]) {
    const SILICONFLOW_API_KEY = '';
    config.plugins.entries[PLUGIN_NAME] = {
      enabled: true,
      config: {
        embedding: {
          apiKey: SILICONFLOW_API_KEY,
          model: 'Qwen/Qwen3-Embedding-0.6B',
          baseURL: 'https://api.siliconflow.cn/v1',
          dimensions: 1024,
          taskQuery: 'retrieval.query',
          taskPassage: 'retrieval.passage',
          normalized: true,
        },
        dbPath: join(getOpenClawConfigDir(), 'memory', 'lancedb-pro'),
        autoCapture: true,
        autoRecall: false,
        autoRecallMinLength: 8,
        retrieval: {
          mode: 'hybrid',
          vectorWeight: 0.7,
          bm25Weight: 0.3,
          minScore: 0.45,
          rerank: 'cross-encoder',
          rerankApiKey: SILICONFLOW_API_KEY,
          rerankModel: 'Qwen/Qwen3-Reranker-0.6B',
          rerankEndpoint: 'https://api.siliconflow.cn/v1/rerank',
          rerankProvider: 'siliconflow',
          candidatePoolSize: 20,
          recencyHalfLifeDays: 14,
          recencyWeight: 0.1,
          filterNoise: true,
          lengthNormAnchor: 500,
          hardMinScore: 0.55,
          timeDecayHalfLifeDays: 60,
          reinforcementFactor: 0.5,
          maxHalfLifeMultiplier: 3,
        },
        enableManagementTools: false,
        sessionStrategy: 'systemSessionMemory',
        scopes: {
          default: 'global',
          definitions: {
            global: { description: 'Shared knowledge' },
          },
        },
        selfImprovement: {
          enabled: true,
          beforeResetNote: true,
          skipSubagentBootstrap: true,
          ensureLearningFiles: true,
        },
        mdMirror: {
          enabled: false,
          dir: 'memory-md',
        },
      },
    };
  }

  // plugins.slots.memory
  if (!config.plugins.slots) (config.plugins as Record<string, unknown>).slots = {};
  const slots = config.plugins.slots as Record<string, unknown>;
  if (!slots.memory) slots.memory = PLUGIN_NAME;

  await writeOpenClawConfig(config);
  logger.info(`${PLUGIN_NAME} config ensured in openclaw.json`);
}

/**
 * Ensure memory-lancedb-pro is installed and registered.
 *
 * Skips silently when the bundled source directory is not present (dev builds
 * that have not included the plugin yet).  All errors are caught and logged so
 * that plugin failures never block the normal startup flow.
 */
export async function ensureMemoryPluginInstalled(): Promise<void> {
  try {
    const sourceDir = getPluginSourceDir();
    if (!existsSync(sourceDir)) {
      logger.debug(`${PLUGIN_NAME} not bundled in resources, skipping plugin setup`);
      return;
    }

    if (!(await isPluginInstalled())) {
      logger.info(`Installing ${PLUGIN_NAME} plugin (first-time setup)...`);
      await copyPluginSource();
      await runNpmInstall();
      logger.info(`${PLUGIN_NAME} plugin installed successfully`);
    } else {
      logger.debug(`${PLUGIN_NAME} already installed, skipping file copy`);
    }

    // Always ensure the openclaw.json entry is present (e.g. after a config reset).
    await ensurePluginConfig();
  } catch (error) {
    logger.warn(`Failed to install ${PLUGIN_NAME} plugin:`, error);
  }
}
