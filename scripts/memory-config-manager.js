/**
 * Memory 插件配置管理器
 * 用于在 memory-lancedb-pro 和官方 memory 系统之间切换
 */

const fs = require('fs');
const path = require('path');

// ==================== 配置区域 ====================

/**
 * 切换配置 - 修改以下布尔值来控制 memory 插件
 *
 * @property {boolean} USE_MEMORY_LANCEDB_PRO - 是否使用 memory-lancedb-pro（第三方增强版）
 *   true  = 使用 memory-lancedb-pro（需要正确配置 embedding API）
 *   false = 使用官方 memory 系统
 *
 * @property {string} OFFICIAL_MEMORY_PLUGIN - 当 USE_MEMORY_LANCEDB_PRO=false 时使用的官方插件
 *   可选值: "memory-lancedb" | "memory-core" | null
 *   - "memory-lancedb" : 带向量搜索的 LanceDB memory（需要 embedding 配置）
 *   - "memory-core"    : 基础 memory 插件（无需额外配置）
 *   - null             : 完全禁用 memory 功能
 */
const CONFIG = {
  // ========== 主要开关 ==========
  // 设置为 true 启用 memory-lancedb-pro，false 使用官方 memory
  USE_MEMORY_LANCEDB_PRO: false,

  // ========== 官方插件选择 ==========
  // 当 USE_MEMORY_LANCEDB_PRO 为 false 时生效
  OFFICIAL_MEMORY_PLUGIN: "memory-core", // 可选: "memory-lancedb" | "memory-core" | null

  // ========== 路径配置 ==========
  OPENCLAW_CONFIG_PATH: "D:/TheClaw/.openclaw/openclaw.json",
  MEMORY_PRO_PLUGIN_PATH: "D:/TheClaw/.openclaw/workspace/plugins/memory-lancedb-pro",
};

// ==================== 逻辑实现 ====================

/**
 * 读取 openclaw 配置
 */
function readConfig() {
  const content = fs.readFileSync(CONFIG.OPENCLAW_CONFIG_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * 写入 openclaw 配置
 */
function writeConfig(config) {
  fs.writeFileSync(CONFIG.OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 应用 memory 配置
 */
function applyMemoryConfig() {
  console.log('📝 Memory 插件配置管理器');
  console.log('========================\n');

  const config = readConfig();

  // 备份原始配置
  const backupPath = CONFIG.OPENCLAW_CONFIG_PATH + '.bak.' + Date.now();
  fs.copyFileSync(CONFIG.OPENCLAW_CONFIG_PATH, backupPath);
  console.log(`✅ 已备份原配置到: ${backupPath}`);

  // 确保 plugins 结构存在
  if (!config.plugins) {
    config.plugins = {};
  }
  if (!config.plugins.load) {
    config.plugins.load = { paths: [] };
  }
  if (!config.plugins.slots) {
    config.plugins.slots = {};
  }
  if (!config.plugins.entries) {
    config.plugins.entries = {};
  }

  // 移除旧的 memory-lancedb-pro 加载路径
  const proPluginPath = CONFIG.MEMORY_PRO_PLUGIN_PATH.replace(/\//g, '\\');
  config.plugins.load.paths = config.plugins.load.paths.filter(
    p => !p.includes('memory-lancedb-pro')
  );

  if (CONFIG.USE_MEMORY_LANCEDB_PRO) {
    // ===== 使用 memory-lancedb-pro =====
    console.log('\n📦 模式: memory-lancedb-pro (第三方增强版)');

    // 添加插件路径
    config.plugins.load.paths.push(proPluginPath);

    // 设置 memory 插槽
    config.plugins.slots.memory = 'memory-lancedb-pro';

    // 确保 entry 配置存在
    if (!config.plugins.entries['memory-lancedb-pro']) {
      config.plugins.entries['memory-lancedb-pro'] = {
        enabled: true,
        config: {
          embedding: {
            apiKey: "${SILICONFLOW_API_KEY}",
            model: "Qwen/Qwen3-Embedding-0.6B",
            baseURL: "https://api.siliconflow.cn/v1",
            dimensions: 1024
          },
          dbPath: "D:\\TheClaw\\.openclaw\\memory\\lancedb-pro",
          autoCapture: true,
          autoRecall: false
        }
      };
    }

    console.log('✅ 已启用 memory-lancedb-pro');
    console.log('⚠️  请确保 embedding API 配置正确');

  } else {
    // ===== 使用官方 memory =====
    const pluginName = CONFIG.OFFICIAL_MEMORY_PLUGIN;

    if (pluginName === null) {
      console.log('\n📦 模式: 禁用 memory');
      delete config.plugins.slots.memory;
      console.log('✅ 已完全禁用 memory 功能');
    } else if (pluginName === 'memory-lancedb') {
      console.log('\n📦 模式: 官方 memory-lancedb');
      config.plugins.slots.memory = 'memory-lancedb';

      // 确保 entry 配置存在
      if (!config.plugins.entries['memory-lancedb']) {
        config.plugins.entries['memory-lancedb'] = {
          enabled: true,
          config: {
            embedding: {
              apiKey: "${OPENAI_API_KEY}",
              model: "text-embedding-3-small"
            },
            autoCapture: true,
            autoRecall: false
          }
        };
      }
      console.log('✅ 已启用官方 memory-lancedb');
    } else if (pluginName === 'memory-core') {
      console.log('\n📦 模式: 官方 memory-core（推荐，无需配置）');
      config.plugins.slots.memory = 'memory-core';

      // 确保 entry 配置存在
      if (!config.plugins.entries['memory-core']) {
        config.plugins.entries['memory-core'] = {
          enabled: true,
          config: {}
        };
      }
      console.log('✅ 已启用官方 memory-core');
    }
  }

  // 写入配置
  writeConfig(config);

  console.log('\n========================');
  console.log('🎉 配置已更新！');
  console.log(`📁 配置文件: ${CONFIG.OPENCLAW_CONFIG_PATH}`);
  console.log('\n💡 请重启 OpenClaw 服务以应用更改');
  console.log('   命令: openclaw restart\n');
}

/**
 * 显示当前配置状态
 */
function showStatus() {
  const config = readConfig();

  console.log('\n📊 当前 Memory 配置状态');
  console.log('========================\n');

  const currentSlot = config.plugins?.slots?.memory;

  if (!currentSlot) {
    console.log('📦 当前 Memory 插件: 未配置 (禁用状态)');
  } else if (currentSlot === 'memory-lancedb-pro') {
    console.log('📦 当前 Memory 插件: memory-lancedb-pro (第三方增强版)');
  } else if (currentSlot === 'memory-lancedb') {
    console.log('📦 当前 Memory 插件: 官方 memory-lancedb');
  } else if (currentSlot === 'memory-core') {
    console.log('📦 当前 Memory 插件: 官方 memory-core');
  } else {
    console.log(`📦 当前 Memory 插件: ${currentSlot} (未知)`);
  }

  // 显示加载路径
  const paths = config.plugins?.load?.paths || [];
  const hasProPath = paths.some(p => p.includes('memory-lancedb-pro'));
  console.log(`📁 memory-lancedb-pro 路径加载: ${hasProPath ? '是' : '否'}`);

  console.log('\n📝 当前 CONFIG 设置:');
  console.log(`   USE_MEMORY_LANCEDB_PRO: ${CONFIG.USE_MEMORY_LANCEDB_PRO}`);
  console.log(`   OFFICIAL_MEMORY_PLUGIN: ${CONFIG.OFFICIAL_MEMORY_PLUGIN}`);
}

// ==================== 主入口 ====================

const command = process.argv[2];

if (command === 'status') {
  showStatus();
} else if (command === 'apply' || !command) {
  applyMemoryConfig();
} else {
  console.log(`
Memory 配置管理器

用法:
  node memory-config-manager.js [command]

命令:
  apply   - 应用配置（默认）
  status  - 显示当前状态

配置修改:
  编辑文件顶部的 CONFIG 对象:
  - USE_MEMORY_LANCEDB_PRO: true/false
  - OFFICIAL_MEMORY_PLUGIN: "memory-lancedb" | "memory-core" | null
`);
}
