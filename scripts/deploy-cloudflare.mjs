/**
 * 部署文档站到 Cloudflare Workers。
 *
 * 配置入口统一读取 `.env.deploy`；CI 环境下只使用 GitHub Actions 注入的环境变量。
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { loadDeployEnv, requireDeployEnv } from './deploy-env.mjs'

loadDeployEnv()
requireDeployEnv(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'])

const wrangler = resolve(import.meta.dirname, '../node_modules/wrangler/bin/wrangler.js')
const result = spawnSync(process.execPath, [wrangler, 'deploy', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
})

process.exit(result.status ?? 1)
