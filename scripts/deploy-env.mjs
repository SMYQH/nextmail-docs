/**
 * 本地配置入口。
 *
 * 文档站与主仓库（NextMail 应用）使用同一套配置模型：
 * - `.env.deploy.example` 是受版本控制的模板，只包含变量名与说明；
 * - `.env.deploy` 是唯一的本地配置文件，被 Git 忽略；
 * - 永远不要创建 `.env`、`.env.local` 或 `.dev.vars`，构建会直接报错；
 * - GitHub Actions 只读取仓库 Secrets/Variables，绝不回退到本地文件。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const PROJECT_ROOT = resolve(import.meta.dirname, '..')
export const DEPLOY_ENV_FILE = '.env.deploy'
export const DEPLOY_ENV_EXAMPLE_FILE = '.env.deploy.example'

const LEGACY_ENV_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.production',
  '.env.production.local',
  '.env.test',
  '.env.test.local',
  '.dev.vars',
]

/** 返回仓库中不受支持的旧环境文件列表。 */
export function getLegacyEnvFiles(root = PROJECT_ROOT) {
  const entries = readdirSync(root)
  const otherEnvFiles = entries.filter(
    file => file.startsWith('.env.') && file !== DEPLOY_ENV_FILE && file !== DEPLOY_ENV_EXAMPLE_FILE,
  )
  const scopedDevVars = entries.filter(file => /^\.dev\.vars\..+$/.test(file))
  return [...new Set([
    ...LEGACY_ENV_FILES.filter(file => existsSync(resolve(root, file))),
    ...otherEnvFiles,
    ...scopedDevVars,
  ])].sort()
}

/** 存在旧环境文件时终止构建，避免配置来源分裂。 */
export function assertSafeEnv(root = PROJECT_ROOT) {
  const files = getLegacyEnvFiles(root)
  if (files.length > 0) {
    throw new Error(
      `Unsupported local environment files found: ${files.join(", ")}. ` +
        'Move their settings to the ignored .env.deploy file with npm run config:env.',
    )
  }
}

/** 解析单个值：支持单引号、双引号（可含转义）与未加引号的行尾注释。 */
function parseValue(raw) {
  if (raw.length >= 2) {
    const quote = raw[0]
    if ((quote === '"' || quote === "'") && raw.endsWith(quote)) {
      const inner = raw.slice(1, -1)
      if (quote === "'") return inner
      return inner
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    }
  }
  const comment = raw.search(/\s#/)
  return (comment >= 0 ? raw.slice(0, comment) : raw).trim()
}

/** 解析 `.env.deploy` 文本，忽略注释、空行与非法行。 */
export function parseDeployEnv(content) {
  const result = {}
  for (const line of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const assignment = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
    const separator = assignment.indexOf('=')
    if (separator <= 0) continue
    const key = assignment.slice(0, separator).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    result[key] = parseValue(assignment.slice(separator + 1).trim())
  }
  return result
}

/**
 * 把 `.env.deploy` 读入进程环境。进程环境中的同名变量优先，
 * 因此 CI 注入的 Secrets/Variables 不会被本地文件覆盖。
 */
export function loadDeployEnv(root = PROJECT_ROOT) {
  assertSafeEnv(root)
  if (process.env.GITHUB_ACTIONS === 'true') return {}
  const path = resolve(root, DEPLOY_ENV_FILE)
  if (!existsSync(path)) return {}
  const parsed = parseDeployEnv(readFileSync(path, 'utf8'))
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
  return parsed
}

/** 缺少必需的部署变量时抛出可读的错误。 */
export function requireDeployEnv(names) {
  const missing = names.filter(name => !process.env[name])
  if (missing.length > 0) {
    throw new Error(
      `Missing deployment settings: ${missing.join(", ")}. ` +
        'Set them in the ignored .env.deploy file (see .env.deploy.example) or as GitHub Actions secrets.',
    )
  }
}

loadDeployEnv()
