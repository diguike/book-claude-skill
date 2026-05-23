# 附录 A 5 分钟快速入门

不讲原理，不讲架构。跟着做，5 分钟后你会有一个能用的 Skill。

## 第 1 步：创建目录

```bash
mkdir -p ~/.claude/skills/explain-code/
```

## 第 2 步：创建 SKILL.md

```bash
cat > ~/.claude/skills/explain-code/SKILL.md << 'EOF'
---
description: 解释代码的含义和逻辑，适用于"这段代码是什么意思"、"解释一下这个函数"、"这里为什么这么写"
---

# 代码解释

用户会给你一段代码或指向一个文件，请你解释它。

## 规则

1. 先用一句话概括这段代码做什么
2. 然后逐段解释关键逻辑，跳过显而易见的部分
3. 如果有潜在问题或改进空间，在最后指出
4. 不要逐行翻译代码，只解释"为什么"而不是"是什么"
EOF
```

## 第 3 步：打开 Claude Code

```bash
claude
```

## 第 4 步：触发 Skill

在 Claude Code 中输入：

```
这段代码是什么意思？

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

Claude 会按照你在 SKILL.md 中定义的规则来回答——先概括、再解释关键逻辑、最后指出改进空间。

也可以直接指向文件：

```
解释一下 src/utils/cache.ts 这个文件
```

## 完成

你刚才做了什么：

- 在 `~/.claude/skills/` 下创建了一个 Skill 目录
- 写了一个 SKILL.md，包含 description（告诉 Claude 什么时候触发）和规则（告诉 Claude 怎么做）
- Claude Code 启动时自动加载了这个 Skill

## 接下来

- 想了解 SKILL.md 的完整写法 → 第 5 章
- 想让 Skill 自动读取项目信息 → 第 8 章（动态上下文）
- 想给 Skill 加脚本 → 第 11 章
- 想把 Skill 分享给团队 → 第 23 章
- 想了解全书结构 → 目录页

---

> 本附录来自《Claude Code Skill 指南》开源版 · 作者「递归客」  
> 在线阅读完整书系：[inferloop.dev](https://inferloop.dev)  
> 源码仓库：[github.com/diguike/book-claude-skill](https://github.com/diguike/book-claude-skill)
