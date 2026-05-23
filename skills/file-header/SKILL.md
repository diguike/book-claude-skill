---
name: file-header
description: "检查源代码文件是否包含 license 头部声明。当用户说'检查文件头'、'license header'、'检查版权声明'时使用。"
---

检查指定文件或目录下的源代码文件是否包含 license 头部声明。

## 检查规则

1. 以下类型的文件需要 license 头：`.ts`、`.tsx`、`.js`、`.jsx`、`.py`、`.go`
2. license 头必须出现在文件的前 5 行内
3. 必须包含 "Copyright" 或 "License" 关键词
4. 年份必须是当前年份或包含当前年份的范围

## 输出格式

| 文件 | 状态 | 问题 |
|------|------|------|
| src/index.ts | ✅ 通过 | |
| src/utils.ts | ❌ 缺失 | 无 license 头 |
| src/old.ts | ⚠️ 过期 | 年份为 2022，需更新 |

**总计**：X 个文件通过，Y 个文件需要修复
