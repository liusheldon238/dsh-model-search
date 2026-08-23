# dsh-model-search

为 DeepSeek Harness 的模型选择器补充轻量搜索：按模型显示名、原始模型 ID、提供商名称或提供商 ID 筛选，同时保留官方选择器的节点、点击处理和推理等级流程。

## 特性

- 增强会话输入区的两级模型菜单。
- 增强 `/model` 命令弹窗，并支持原始模型 ID。
- 中文与英文界面。
- 仅使用 DSH 公共的 `sessions` 与 `modelDirectories` 客户端服务。
- DSH 服务或 DOM 不兼容时安全降级，不阻止 DSH 启动。

## 安装

```bash
dsh plugin --profile web add https://github.com/liusheldon238/dsh-model-search/releases/download/v0.1.1/dsh-model-search-0.1.1.tgz
```

重启 `dsh web` 后生效。

卸载不会修改模型或会话配置：

```bash
dsh plugin --profile web remove dsh-model-search
```

## 兼容与降级

- 已针对 `@deepseek-ai/dsh@0.1.1-rc.2` 做真实启动检查。
- 插件使用 DSH 公共的会话模型目录，不读取或保存 API Key。
- 官方服务或模型选择器 DOM 发生不兼容变化时，插件只输出一次警告并停止增强；官方模型选择功能保持可用。
- `/model` 官方输入会由插件替换为支持原始 ID 的输入，但选项节点、点击处理、推理等级及弹窗关闭均继续由官方控制器负责。

## 开发

```bash
npm ci
npm test
```

MIT License。
