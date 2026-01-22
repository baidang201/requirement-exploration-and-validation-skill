# 测试与验证策略

## 测试矩阵

### 场景 1：正常执行（Happy Path）

**输入**：完整配置文件
```yaml
# config/user-profile.yaml
profile:
  project_types:
    - "AI SaaS 工具"
    - "Chrome 插件"
  background:
    name: "张三"
    role: "前端工程师"
    skills:
      - { name: "React", level: "expert", years: 3 }
    constraints:
      time_budget: "每周 20 小时"
      monetary_budget: 5000
  resources:
    technical:
      - "Vercel 账号（Hobby 版）"
      - "OpenAI API Key（$50 额度）"
    distribution:
      - "Twitter 账号（1k 粉丝，科技圈）"
```

**预期输出**：
- ✅ 成功读取配置文件
- ✅ 数据采集成功（7+ 数据源）
- ✅ 提取 50-100 个候选项目
- ✅ 四维度评分完成
- ✅ 生成 Top 10 报告
- ✅ 保存到 `outputs/report-YYYYMMDD-HHMMSS.md`

**验证点**：
- [ ] 无中断询问
- [ ] 所有日志格式正确
- [ ] 报告包含所有章节（执行摘要、Top 10、日志）
- [ ] 四维度评分在 0-100 范围内
- [ ] 综合分计算公式正确

**测试命令**：
```bash
npx claude-code skill run requirement-exploration-and-validation \
  --config config/user-profile.yaml
```

---

### 场景 2：配置文件缺失

**输入**：配置文件不存在
```bash
# config/user-profile.yaml 不存在
```

**预期输出**：
```
[WARNING] config/user-profile.yaml 未找到，使用默认配置
[INFO] 默认项目类型：AI SaaS 工具、Chrome 插件
[INFO] 默认背景：全栈开发者（JavaScript 中级）
[INFO] 继续执行...
```

**验证点**：
- [ ] 使用默认配置（`config/default-profile.yaml`）
- [ ] 日志明确显示"使用默认配置"
- [ ] 继续执行，不中断
- [ ] 生成报告成功

**测试命令**：
```bash
npx claude-code skill run requirement-exploration-and-validation \
  --config /nonexistent/config.yaml
```

---

### 场景 3：配置文件格式错误

**输入**：无效的 YAML 格式
```yaml
# config/user-profile.yaml
profile:
  project_types: [
    "AI SaaS 工具"
    # 缺少逗号
    "Chrome 插件"
  background:
    name: "张三"
    # 缺少闭合引号
```

**预期输出**：
```
[WARNING] YAML 解析失败: Syntax error at line 5
[INFO] 使用默认配置
[INFO] 继续执行...
```

**验证点**：
- [ ] 捕获 YAML 解析错误
- [ ] 使用默认配置
- [ ] 继续执行，不中断

---

### 场景 4：API 失败（部分数据源）

**输入**：无效的 API Key
```bash
# .env
PRODUCT_HUNT_API_KEY=invalid_key
```

**预期输出**：
```
[WARNING] Product Hunt API 失败: HTTP 401: Unauthorized
[WARNING] 使用模拟数据
[INFO] Reddit: 获取 50 条
[INFO] Hacker News: 获取 50 条
...
[INFO] 继续执行...
```

**验证点**：
- [ ] Product Hunt 失败，使用模拟数据
- [ ] 其他数据源正常工作
- [ ] 总候选项目数量 > 0
- [ ] 报告生成成功

---

### 场景 5：所有数据源失败

**输入**：网络断开（模拟）
```bash
# 模拟网络断开
export MOCK_NETWORK_FAILURE=true
```

**预期输出**：
```
[ERROR] Product Hunt API 超时（重试 2 次失败）
[ERROR] Reddit API 超时（重试 2 次失败）
[ERROR] Hacker News API 超时（重试 2 次失败）
...
[ERROR] 所有数据源失败，使用预设种子词生成候选项目
[INFO] 种子词：AI 写作助手、AI 代码生成器、Chrome 生产力插件...
[INFO] 继续执行...
```

**验证点**：
- [ ] 所有数据源失败，使用种子词
- [ ] 种子词生成候选项目 > 0
- [ ] 报告生成成功
- [ ] 日志记录完整

---

### 场景 6：评分计算异常

**输入**：包含异常数据的候选项目（模拟）
```javascript
// 模拟：某个候选项目的描述字段为空
{
  name: "Empty Project",
  description: "",  // 空描述
  targetUsers: []
}
```

**预期输出**：
```
[WARNING] 项目 "Empty Project" 评分失败，跳过
[INFO] 继续处理下一个项目
```

**验证点**：
- [ ] 异常项目被跳过
- [ ] 其他项目正常评分
- [ ] 最终 Top 10 数量 = 10（如果有足够候选）

---

### 场景 7：超长输出（自动分块）

**输入**：100+ 候选项目（模拟）
```bash
# 模拟：生成大量候选项目
export MOCK_CANDIDATE_COUNT=150
```

**预期输出**：
```
[INFO] 候选项目数量：150 个
[INFO] 报告内容过长（15k tokens），自动分块到 2 个文件
[INFO] 文件 1：outputs/report-part1.md
[INFO] 文件 2：outputs/report-part2.md
```

**验证点**：
- [ ] 检测到输出过长
- [ ] 自动分块到 2 个文件
- [ ] 每个文件大小 < 10k tokens
- [ ] 报告内容完整

---

### 场景 8：手动触发 GitHub Actions

**输入**：手动触发 workflow
```bash
gh workflow run daily-exploration.yml
```

**预期输出**：
```
✅ Workflow 触发成功
✅ 运行 ID: 1234567890
✅ 日志：https://github.com/user/repo/actions/runs/1234567890
```

**验证点**：
- [ ] Workflow 成功触发
- [ ] 生成报告
- [ ] 上传到 Artifacts
- [ ] 提交到仓库

---

## 边缘情况测试

### EC-1：空项目类型列表

**输入**：
```yaml
profile:
  project_types: []
```

**预期行为**：使用默认项目类型

**验证**：日志显示"project_types 为空，使用默认值"

---

### EC-2：技能列表为空

**输入**：
```yaml
background:
  skills: []
```

**预期行为**：使用默认技能列表

**验证**：日志显示"skills 为空，使用默认值"

---

### EC-3：资源列表为空

**输入**：
```yaml
resources:
  technical: []
  distribution: []
```

**预期行为**：使用默认资源列表

**验证**：日志显示"resources 为空，使用默认值"

---

### EC-4：时间预算格式错误

**输入**：
```yaml
constraints:
  time_budget: "invalid format"
```

**预期行为**：使用默认时间预算（每周 15 小时）

**验证**：日志显示"time_budget 格式错误，使用默认值"

---

### EC-5：资金预算为负数

**输入**：
```yaml
constraints:
  monetary_budget: -1000
```

**预期行为**：使用默认资金预算（2000 USD）

**验证**：日志显示"monetary_budget 为负数，使用默认值"

---

### EC-6：评分权重总和不为 1

**输入**：
```yaml
scoring_weights:
  blue_ocean: 0.5
  match_score: 0.3
  market_heat: 0.2
  feasibility: 0.1  # 总和 = 1.1
```

**预期行为**：自动归一化权重

**验证**：
```
[WARNING] 评分权重总和为 1.1，自动归一化
[INFO] 归一化后权重：蓝海(0.45), 匹配度(0.27), 热度(0.18), 可行性(0.09)
```

---

### EC-7：候选项目数量 < 10

**输入**：模拟只生成 5 个候选项目

**预期行为**：输出 Top 5，不补足到 10

**验证**：
- [ ] 报告标题改为"Top 5 推荐项目"
- [ ] 日志显示"候选项目不足 10 个，输出 Top 5"

---

### EC-8：所有候选项目评分 < 60

**输入**：模拟所有项目蓝海分 < 60

**预期行为**：仍然输出 Top 10（按相对排序）

**验证**：
- [ ] 报告正常生成
- [ ] 日志显示"警告：所有项目蓝海分 < 60"

---

## 性能测试

### PT-1：大数据量处理

**输入**：200 个候选项目

**预期性能**：
- 总耗时 < 5 分钟
- 内存占用 < 500MB
- 生成报告 < 10 秒

**验证**：
```bash
time npx claude-code skill run requirement-exploration-and-validation
```

---

### PT-2：并发 API 请求

**输入**：7 个数据源并发请求

**预期性能**：
- 所有请求在 30 秒内完成
- 失败重试最多 2 次
- 超时时间 30 秒

**验证**：
```bash
# 查看日志中的时间戳
grep "✓" logs/output.log | awk '{print $1}' | sort -u
```

---

## 集成测试

### IT-1：GitHub Actions 定时任务

**测试步骤**：
1. 推送代码到 GitHub
2. 等待北京时间 9:00
3. 检查 Actions 页面
4. 验证报告生成

**验证点**：
- [ ] Workflow 按时触发
- [ ] 报告生成成功
- [ ] 上传到 Artifacts
- [ ] 提交到仓库

---

### IT-2：Claude Code SDK 调用

**测试步骤**：
1. 安装 Claude Code CLI
2. 运行 skill 命令
3. 验证输出

**验证点**：
- [ ] CLI 调用成功
- [ ] 配置文件读取正确
- [ ] 报告生成成功

**测试命令**：
```bash
npx claude-code skill run requirement-exploration-and-validation
```

---

## 回归测试清单

每次修改 Skill 后，必须执行以下测试：

- [ ] 场景 1：正常执行
- [ ] 场景 2：配置文件缺失
- [ ] 场景 4：API 失败（部分数据源）
- [ ] 场景 5：所有数据源失败
- [ ] 场景 7：超长输出
- [ ] EC-1：空项目类型列表
- [ ] EC-2：技能列表为空
- [ ] IT-2：Claude Code SDK 调用

---

## 测试报告模板

```markdown
# 测试报告

**测试日期**：YYYY-MM-DD
**测试人员**：XXX
**Skill 版本**：v1.0.0

---

## 测试结果汇总

| 场景 | 状态 | 备注 |
|------|------|------|
| 场景 1：正常执行 | ✅ 通过 | - |
| 场景 2：配置缺失 | ✅ 通过 | - |
| 场景 3：配置格式错误 | ✅ 通过 | - |
| 场景 4：API 失败 | ✅ 通过 | - |
| 场景 5：所有数据源失败 | ✅ 通过 | - |
| 场景 6：评分异常 | ⚠️ 待修复 | 需要优化错误处理 |
| 场景 7：超长输出 | ✅ 通过 | - |
| 场景 8：手动触发 | ✅ 通过 | - |

**通过率**：87.5% (7/8)

---

## 详细日志

### 场景 1：正常执行
```
[日志内容...]
```

### 场景 2：配置缺失
```
[日志内容...]
```

---

## 问题列表

| 问题 ID | 严重程度 | 描述 | 状态 |
|---------|----------|------|------|
| BUG-001 | 高 | 场景 6 评分异常时未正确跳过 | 待修复 |
| BUG-002 | 低 | 日志格式不一致 | 待修复 |

---

## 建议

1. 优化评分异常处理逻辑
2. 统一日志格式
3. 增加性能监控
```

---

## 自动化测试脚本

### 运行所有测试

```bash
#!/bin/bash
# test-all.sh

echo "开始运行所有测试..."

# 场景 1：正常执行
echo "测试场景 1：正常执行"
npx claude-code skill run requirement-exploration-and-validation \
  --config config/test/valid-profile.yaml

# 场景 2：配置缺失
echo "测试场景 2：配置缺失"
npx claude-code skill run requirement-exploration-and-validation \
  --config /nonexistent/config.yaml

# 场景 4：API 失败
echo "测试场景 4：API 失败"
PRODUCT_HUNT_API_KEY=invalid \
npx claude-code skill run requirement-exploration-and-validation \
  --config config/test/valid-profile.yaml

echo "所有测试完成！"
```

---

## 测试数据准备

### 有效配置文件（`config/test/valid-profile.yaml`）

```yaml
profile:
  project_types:
    - "AI SaaS 工具"
    - "Chrome 插件"
  background:
    name: "测试用户"
    role: "全栈开发者"
    skills:
      - { name: "JavaScript", level: "expert", years: 5 }
      - { name: "React", level: "advanced", years: 3 }
    experience:
      - "5 年全栈开发经验"
    constraints:
      time_budget: "每周 20 小时"
      monetary_budget: 5000
  resources:
    technical:
      - "Vercel 账号（Hobby 版）"
      - "OpenAI API Key（$50 额度）"
      - "GitHub 账号（3k 粉丝）"
    distribution:
      - "Twitter 账号（1k 粉丝，科技圈）"
      - "个人博客（月活 2k）"
    other:
      - "设计与开发者好友网络"
  scoring_weights:
    blue_ocean: 0.4
    match_score: 0.3
    market_heat: 0.2
    feasibility: 0.1
```

### 无效配置文件（`config/test/invalid-profile.yaml`）

```yaml
profile:
  # 故意制造格式错误
  project_types: [
    "AI SaaS 工具"
    "Chrome 插件"
  background:
    name: "测试用户"
```

---

## 测试执行指南

### 1. 本地测试

```bash
# 安装依赖
npm install

# 运行单个测试场景
npm test -- scenario=1

# 运行所有测试场景
npm test

# 运行性能测试
npm test -- performance

# 运行集成测试
npm test -- integration
```

### 2. GitHub Actions 测试

```bash
# 推送到 GitHub 触发测试
git add .
git commit -m "test: run test scenarios"
git push

# 手动触发 workflow
gh workflow run daily-exploration.yml
```

### 3. 查看测试报告

```bash
# 生成的测试报告
cat outputs/test-report-YYYYMMDD-HHMMSS.md

# 查看日志
cat logs/test-output.log
```

---

## 测试通过标准

✅ **必须满足**：
- 所有核心场景（场景 1-5）通过
- 无"中断询问"或"需要用户确认"的情况
- 所有错误处理正确（Log & Continue）
- 报告格式符合预期

⚠️ **建议满足**：
- 边缘情况测试通过率 > 80%
- 性能测试达标（总耗时 < 5 分钟）
- 集成测试通过

---

**测试策略文档完成！**
