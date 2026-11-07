# 版本化文档（预留）

本目录用于存放已发布版本的文档快照，由 `npm run docusaurus docs:version <版本号>`
自动生成。当前 `versions.json` 为空数组，尚未发布任何版本。

## 发布新版本

```bash
npm run docusaurus docs:version 1.0.0
```

该命令会：

1. 把 `docs/` 复制到 `versioned_docs/version-1.0.0/`；
2. 把 `sidebars.ts` 复制到 `versioned_sidebars/version-1.0.0.json`；
3. 把新版本追加到 `versions.json`；
4. 在文档顶部插入版本横幅，并启用版本下拉选择器。

## 多语言版本

每个版本的翻译放在 `i18n/<locale>/docusaurus-plugin-content-docs/version-<版本号>/`
下，与 `current/` 的目录结构保持一致。例如：

```
i18n/zh-CN/docusaurus-plugin-content-docs/
├── current/                  # 简体中文的"当前版本"
└── version-1.0.0/            # 简体中文的 1.0.0 版本
```

## 注意

- 不要手工编辑 `versioned_docs/` 下的内容——它会在下一个版本发布时被覆盖。
- 版本号遵循语义化版本（`1.0.0`），标签必须以 `v` 开头。
