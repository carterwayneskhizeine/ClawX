# Windows 安装包打包指南

本指南详细介绍如何使用 electron-builder 为 ClawX 构建 Windows 安装包，并实现在安装时自动将指定文件解压到用户目录的功能。

> **注意**：本指南仅涵盖 **Windows x64** 平台。Linux 和 macOS 的打包机制不同，请忽略。

## 目录

| 文档 | 说明 |
|------|------|
| [01 概述与配置](./01-overview.md) | electron-builder 基础配置与打包命令 |
| [02 extraResources 配置](./02-extra-resources.md) | 打包额外资源文件的配置方法 |
| [03 NSIS 安装脚本](./03-nsis-script.md) | 安装时执行自定义操作的脚本 |
| [04 文件提取实战](./04-file-extraction.md) | 将文件解压到用户目录的具体步骤 |
| [05 完整示例](./05-complete-example.md) | 完整配置示例与验证方法 |
