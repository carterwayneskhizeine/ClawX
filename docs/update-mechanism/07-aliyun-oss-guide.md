# 阿里云 OSS 更新源接入指南

## 概述

ClawX 使用阿里云 OSS 作为主要的自动更新源。以下是接入步骤。

## 一、创建阿里云 OSS Bucket

### 1. 登录阿里云控制台

访问 https://oss.console.aliyun.com/

### 2. 创建 Bucket

- **Bucket 名称**: `valuecell-clawx` (或你喜欢的名字)
- **区域**: 建议选择 `华东1（杭州）` 或离你用户最近的区域
- **存储类型**: 标准存储
- **读写权限**: 公共读 (因为 electron-updater 需要读取文件)

### 3. 配置跨域 (CORS)

在 Bucket 设置中找到「数据安全」→「跨域设置」：

```
允许来源: *
允许方法: GET, POST, OPTIONS
允许头部: *
```

## 二、获取 Access Key

### 1. 创建 RAM 用户

1. 访问 https://ram.console.aliyun.com/overview
2. 左侧点击「用户」→「创建用户」
3. 填写登录名称（如 `clawx-release`）
4. 勾选「OpenAPI 调用访问」

### 2. 添加权限

给该用户添加 OSS 权限：
1. 点击用户 → 「添加权限」
2. 选择「系统策略」→「AliyunOSSFullAccess」

### 3. 获取 Access Key

在用户详情页创建 Access Key，保存好：
- `AccessKey ID`
- `AccessKey Secret`

## 三、配置 GitHub Secrets

在 GitHub 仓库设置中添加 secrets：

1. 打开仓库 → Settings → Secrets and variables → Actions
2. 添加两个 secrets：

| Name | Value |
|------|-------|
| `OSS_ACCESS_KEY_ID` | 你的 AccessKey ID |
| `OSS_ACCESS_KEY_SECRET` | 你的 AccessKey Secret |

## 四、修改配置文件

### 1. 修改 electron-builder.yml

```yaml
# electron-builder.yml
publish:
  - provider: generic
    url: https://你的bucket名称.oss-cn-hangzhou.aliyuncs.com/latest
    useMultipleRangeRequest: false
```

### 2. 修改 updater.ts (如需要)

```typescript
// electron/main/updater.ts
const OSS_BASE_URL = 'https://你的bucket名称.oss-cn-hangzhou.aliyuncs.com';
```

### 3. 修改 release.yml (CI 配置)

```yaml
# .github/workflows/release.yml
- name: Install and configure ossutil
  env:
    OSS_ACCESS_KEY_ID: ${{ secrets.OSS_ACCESS_KEY_ID }}
    OSS_ACCESS_KEY_SECRET: ${{ secrets.OSS_ACCESS_KEY_SECRET }}
  run: |
    # 写入你的 bucket 信息
    cat > $HOME/.ossutilconfig << EOF
    [Credentials]
    language=EN
    endpoint=oss-cn-hangzhou.aliyuncs.com  # 你的区域
    accessKeyID=${OSS_ACCESS_KEY_ID}
    accessKeySecret=${OSS_ACCESS_KEY_SECRET}
    EOF
```

并修改上传路径：

```yaml
ossutil cp -r -f staging/${CHANNEL}/ oss://你的bucket名称/${CHANNEL}/
```

## 五、目录结构

发布后，OSS 目录结构如下：

```
your-bucket/
├── latest/                    # 稳定版
│   ├── latest.yml
│   ├── latest-mac.yml
│   ├── latest-linux.yml
│   ├── ClawX-0.1.24-win-x64.exe
│   ├── ClawX-0.1.24-mac.dmg
│   └── ClawX-0.1.24-linux.AppImage
├── beta/                      # 测试版
│   └── ...
├── alpha/                     # 开发版
│   └── ...
└── releases/                  # 归档
    └── v0.1.24/
        └── ...
```

## 六、版本文件格式

electron-builder 会自动生成 `.yml` 版本文件，例如 `latest.yml`：

```yaml
version: 0.1.24
releaseDate: '2026-03-10T00:00:00.000Z'
files:
  - url: ClawX-0.1.24-win-x64.exe
    sha512: <自动生成>
    size: 52428800
path: ClawX-0.1.24-win-x64.exe
sha512: <自动生成>
releaseTimestamp: '2026-03-10T00:00:00.000Z'
```

## 七、测试

### 本地测试

1. 启动本地 HTTP 服务器：
   ```bash
   npx http-server ./release
   ```

2. 修改 `electron-builder.yml` 指向本地：
   ```yaml
   publish:
     - provider: generic
       url: http://localhost:8080
   ```

3. 运行应用测试

### 生产测试

1. 手动触发 GitHub Actions workflow
2. 观察 OSS 中的文件上传
3. 使用 electron-updater 的 debug 模式查看日志

## 费用说明

- OSS 按存储空间和流量计费
- 更新包通常很小（几十MB），费用很低
- 建议设置生命周期规则，自动清理旧版本归档

## 常见问题

### Q: 没有阿里云账号？
A: 可以只用 GitHub Releases 作为更新源（已配置为备用源）

### Q: OSS 上传失败？
A: 检查 Access Key 权限和 Bucket 读写权限

### Q: 更新检测不到？
A: 检查 yml 文件是否正确生成，URL 是否可访问
