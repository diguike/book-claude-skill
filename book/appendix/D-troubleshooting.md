# 附录 D：常见问题排查表

## 触发问题

| 症状 | 可能原因 | 排查步骤 |
|------|---------|---------|
| Skill 完全没被触发 | description 缺少用户常用的关键词 | 1. 手动用 `/skill-name` 确认 Skill 存在<br>2. 检查 description 是否覆盖了用户的表述<br>3. 补充关键词后重试 |
| Skill 被触发但触发的是错误的 Skill | 多个 Skill 的 description 重叠 | 1. 检查所有 Skill 的 description<br>2. 缩窄重叠 Skill 的触发范围<br>3. 用 `paths` 字段限制激活路径 |
| Skill 触发太频繁 | description 过于宽泛 | 1. 收窄 description 中的触发场景<br>2. 添加 `disable-model-invocation: true`<br>3. 用 `paths` 限制激活目录 |
| Skill 只能手动触发、不自动触发 | 设置了 `disable-model-invocation: true` | 检查 frontmatter，改为 `false` 或删除该字段 |

## 执行问题

| 症状 | 可能原因 | 排查步骤 |
|------|---------|---------|
| 触发了但指令没被遵循 | 指令表述模糊或被冲淡 | 1. 用 `/debug` 查看 transcript<br>2. 检查指令是否有歧义<br>3. 加具体的正反示例 |
| 部分指令生效、部分不生效 | SKILL.md 太长，后半部分被 compaction 截断 | 1. 检查 SKILL.md 行数（应 <500）<br>2. 将重要指令前移<br>3. 将非核心内容移到 references/ |
| 输出格式不对 | 输出模板被忽略 | 1. 在模板前加说明："严格按以下格式输出"<br>2. 提供一个完整的输出示例<br>3. 检查模板是否在文件靠后位置 |
| 动态注入 `` !`command` `` 报错 | 命令执行失败 | 1. 手动在终端运行该命令<br>2. 检查命令依赖的工具是否安装<br>3. 在 Skill 中加错误处理说明 |
| 规则文件没被加载 | AI 没有读取 references/ 或 rules/ | 1. 在 transcript 中搜索文件名<br>2. 检查 SKILL.md 中的引用路径是否正确<br>3. 路由条件是否匹配 |

## 性能问题

| 症状 | 可能原因 | 排查步骤 |
|------|---------|---------|
| Skill 响应很慢 | 加载了太多 references | 1. 检查被加载的文件数量和大小<br>2. 改为按需加载<br>3. 大文件加目录索引 |
| 上下文经常被压缩 | Skill + 对话内容超出窗口 | 1. 精简 SKILL.md<br>2. 检查动态注入的数据量<br>3. 考虑 `context: fork` 隔离执行 |
| 脚本执行超时 | 脚本有性能问题或依赖安装 | 1. 本地手动运行脚本测试<br>2. 检查是否需要 `npm install`<br>3. 脚本尽量零依赖 |

## 团队协作问题

| 症状 | 可能原因 | 排查步骤 |
|------|---------|---------|
| 不同成员看到的 Skill 不同 | Skill 放在个人目录而非项目目录 | 将 Skill 从 `~/.claude/skills/` 移到 `.claude/skills/` 并提交到 repo |
| 合并后 Skill 失效 | Git 合并冲突损坏了 SKILL.md | 1. 检查 SKILL.md 的 frontmatter 格式<br>2. 确认 `---` 分隔符完整<br>3. 运行 validate 脚本 |
| eval 本地通过但 CI 失败 | 环境差异 | 1. 检查 CI 的 Node/Python 版本<br>2. 确认 `gh` CLI 是否安装<br>3. 检查脚本的依赖 |

---

> 本附录来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/book-claude-skill](https://github.com/diguike/book-claude-skill)
