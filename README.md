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
dsh plugin add dsh-model-search
```

重启 `dsh web` 后生效。

## 开发

```bash
npm ci
npm test
```

MIT License。
