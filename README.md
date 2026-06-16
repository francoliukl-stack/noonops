# Noon Sales Ops Copilot

Chrome 插件，用于在 noon 当前商品列表页中读取可见商品，按销量排序，并在页面右侧浮窗中给出运营建议。

## 当前版本

v0.1 实现：

- 点击插件图标后，在当前页面打开右侧浮窗
- 支持 noon 域名页面分析，非 noon 页面显示不支持提示
- 读取当前已加载商品卡片
- 提取商品名、链接、图片、价格、原价/折扣、销量、评分、评论数
- 支持按销量、价格、评分、页面顺序排序
- 浮窗打开后，noon 站内页面切换或商品内容异步更新时会自动刷新
- 支持详情页 `sold recently` 和列表/详情页 `Ratings` 销售热度识别，并标明来源
- 生成本地规则建议
- 支持复制表格文本和导出 CSV

## 安装试用

1. 打开 Chrome 的 `chrome://extensions/`
2. 打开右上角“开发者模式”
3. 选择“加载已解压的扩展程序”
4. 选择本项目目录：`/Users/franco/backup/project/noonopscopilot`
5. 打开 noon 商品列表页后点击插件图标

如果已经安装过旧版，修改代码或拉取更新后，需要在 `chrome://extensions/` 里点击该插件卡片上的“重新加载”，再刷新 noon 页面。

## 验证

```bash
npm test
npm run evaluate
```

每次开发完成前必须运行 `npm run evaluate`，并确认 `reports/evaluation-report.md` 中显示 100% 通过。长期评测集保存在 `evals/evaluation_set.json`，开发规范保存在 `docs/DEVELOPMENT_RULES.md`。

## 注意

- 插件只读取当前页面已经显示出来的商品，不自动翻页，不模拟滚动加载。
- 所有分析都在浏览器本地完成，不上传页面数据。
- noon 页面结构变化时，可能需要调整 `src/parser.js` 中的选择器策略。
