# 版本化侧边栏（预留）

本目录用于存放已发布版本的侧边栏配置，由 `npm run docusaurus docs:version <版本号>`
自动生成。当前 `versions.json` 为空数组，尚未发布任何版本。

每个版本对应一个 `version-<版本号>.json` 文件，内容是发布时 `sidebars.ts` 的快照。

不要手工编辑这里的文件——它们会在下一个版本发布时被重新生成。
