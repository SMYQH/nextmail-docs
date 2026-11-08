/**
 * 基于受版本控制的 `.env.deploy.example` 创建本地配置文件 `.env.deploy`。
 *
 * 已存在的 `.env.deploy` 不会被覆盖。
 */
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const template = resolve(root, '.env.deploy.example')
const target = resolve(root, '.env.deploy')

if (!existsSync(template)) {
  console.error('缺少 .env.deploy.example，无法创建本地配置。')
  process.exit(1)
}

if (existsSync(target)) {
  console.log('.env.deploy 已存在，未覆盖。')
  process.exit(0)
}

copyFileSync(template, target)
console.log('已创建 .env.deploy，请填入部署配置。')
