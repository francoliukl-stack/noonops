# Noon Sales Ops Copilot

Chrome 插件，用于在 noon 商品列表、搜索结果、店铺商品页或商品详情页中读取当前可见商品，默认按 Ratings 数量代表的热度排序，并在页面右侧浮窗中给出运营辅助建议。

## 当前版本

v0.1.11

当前版本重点能力：

- 在 noon 页面点击插件图标后打开右侧浮窗，非 noon 页面显示不支持提示。
- 默认按 Ratings 数量代表的热度排序，支持切换销量指标、价格、评分、页面原始顺序。
- 读取当前已加载商品，提取商品名、商品链接、图片、价格、原价/折扣、销量、评分、Ratings/评论数。
- 支持列表页和详情页热度识别，例如 `40 Ratings`、`3.4 (62)`、`4.7 23`、`4.7 ★★★★★ 23`。
- 支持详情页销量识别，例如 `860+ sold recently`，并区分真实销量和 Ratings 回退指标。
- 商品卡片高亮指标会跟随当前排序方式变化，辅助指标避免重复展示。
- 自动过滤非商品内容，例如导航、促销块、筛选项、Best Seller 标签等。
- 只展示具备可用 noon 商品详情链接的完整商品，避免半成品或不可用链接进入排序、复制和 CSV。
- 使用 SKU、标题、标题加价格、图片路径等多维去重，减少重复商品行。
- 浮窗打开后，noon 站内跳转、前进后退、URL 变化、商品 DOM 异步加载都会自动刷新。
- 刷新采用渐进式稳定加载：页面切换后清理旧结果，显示进度条和骨架屏，完整商品逐个出现，结果稳定后才标记完成。
- 点击浮窗商品标题不会打开新页面，而是在当前页面定位对应商品。
- 定位时浮窗会临时收起，目标商品居中滚动并高亮；如果仍被遮挡，会自动微调滚动位置。
- 支持复制当前排序结果为表格文本，支持导出 UTF-8 CSV。
- 运营建议使用本地规则生成，不连接后端，不上传浏览数据。

## 安装试用

### 在当前电脑安装

1. 打开 Chrome 的 `chrome://extensions/`
2. 打开右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择本项目目录：`/Users/franco/backup/project/noonopscopilot`
5. 打开 noon 页面后点击插件图标

代码更新后，需要在 `chrome://extensions/` 里点击该插件卡片上的“重新加载”，然后刷新 noon 页面。

### 换一台电脑安装

1. 在新电脑安装 Git 和 Chrome。
2. 克隆仓库：

```bash
git clone https://github.com/francoliukl-stack/noonops.git
```

3. 打开 Chrome 的 `chrome://extensions/`
4. 打开“开发者模式”
5. 点击“加载已解压的扩展程序”
6. 选择克隆出来的 `noonops` 文件夹
7. 打开 noon 页面并点击插件图标

这个插件当前不需要 `npm install` 才能在 Chrome 里加载；`npm` 主要用于开发测试。

## 使用方式

1. 打开 noon 商品列表、搜索结果、店铺商品页或商品详情页。
2. 点击 Chrome 工具栏里的 Noon Sales Ops Copilot 图标。
3. 等待浮窗显示进度条，完整商品会逐个进入排序列表。
4. 使用排序下拉框切换热度、销量指标、价格、评分或页面顺序。
5. 点击商品标题可定位到页面中的对应商品。
6. 需要团队协作时，点击“复制”或“导出 CSV”。

## 开发与验证

```bash
npm test
npm run evaluate
```

每次开发完成前必须运行 `npm run evaluate`，并确认 `reports/evaluation-report.md` 中显示 100% 通过。长期评测集保存在 `evals/evaluation_set.json`，开发规范保存在 `docs/DEVELOPMENT_RULES.md`。

每次功能或文档更新必须同步升级 `manifest.json`、`package.json`、`evals/evaluation_set.json` 中的版本号，并在 `CHANGELOG.md` 顶部倒序记录对应版本更新日志。

## 项目文档

- PRD：[docs/PRD.md](docs/PRD.md)
- 开发规范：[docs/DEVELOPMENT_RULES.md](docs/DEVELOPMENT_RULES.md)
- 长期评测集：[evals/evaluation_set.json](evals/evaluation_set.json)
- 最新测试报告：[reports/evaluation-report.md](reports/evaluation-report.md)
- 更新日志：[CHANGELOG.md](CHANGELOG.md)

## 注意

- 插件只分析当前页面已经显示出来的商品，不自动翻页，不模拟滚动加载。
- 所有分析都在浏览器本地完成，不上传页面数据。
- noon 页面结构变化时，可能需要调整 `src/parser.js` 中的选择器策略。
