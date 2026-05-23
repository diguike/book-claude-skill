#!/usr/bin/env bash
# run-optimization.sh
# 使用 skill-creator 的 run_loop.py 对 skill description 进行优化
#
# 前置条件:
#   1. 已安装 skill-creator CLI
#   2. 准备好 trigger-queries.json（同目录下）
#   3. SKILL.md 已有初始 description
#
# 用法:
#   chmod +x run-optimization.sh
#   ./run-optimization.sh /path/to/your-skill

set -euo pipefail

SKILL_DIR="${1:?用法: ./run-optimization.sh /path/to/your-skill}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
QUERIES_FILE="$SCRIPT_DIR/trigger-queries.json"

if [ ! -f "$SKILL_DIR/SKILL.md" ]; then
  echo "错误: $SKILL_DIR/SKILL.md 不存在"
  exit 1
fi

if [ ! -f "$QUERIES_FILE" ]; then
  echo "错误: $QUERIES_FILE 不存在"
  exit 1
fi

echo "=== Trigger Optimization ==="
echo "Skill: $SKILL_DIR"
echo "Queries: $QUERIES_FILE"
echo ""

# Step 1: 提取当前 description
echo "--- 当前 description ---"
head -10 "$SKILL_DIR/SKILL.md"
echo ""

# Step 2: 运行优化循环
# run_loop.py 会：
#   - 读取 trigger-queries.json 中的测试用例
#   - 对每个 query 测试当前 description 是否正确触发/不触发
#   - 计算准确率
#   - 用 LLM 生成改进后的 description
#   - 重复直到准确率达标或达到最大迭代次数
echo "--- 开始优化 ---"
echo "运行命令:"
echo "  python3 run_loop.py \\"
echo "    --skill-dir \"$SKILL_DIR\" \\"
echo "    --queries \"$QUERIES_FILE\" \\"
echo "    --max-iterations 5 \\"
echo "    --target-accuracy 0.95"
echo ""

# 实际执行（取消注释以运行）:
# python3 run_loop.py \
#   --skill-dir "$SKILL_DIR" \
#   --queries "$QUERIES_FILE" \
#   --max-iterations 5 \
#   --target-accuracy 0.95

echo "提示: 取消脚本中的注释以实际运行优化循环"
echo "优化完成后，检查 SKILL.md 中更新的 description 字段"
