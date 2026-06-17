(function initContent(globalScope) {
  const PANEL_ID = "noon-ops-copilot-panel";
  const SORT_OPTIONS = [
    ["heat_desc", "热度高到低"],
    ["sales_desc", "销量指标高到低"],
    ["price_asc", "价格低到高"],
    ["price_desc", "价格高到低"],
    ["rating_desc", "评分高到低"],
    ["page_order", "页面原始顺序"]
  ];
  const PRODUCT_CHANGE_RE = /\b(AED|SAR|EGP|KWD|OMR|BHD|QAR|ratings?|reviews?|sold|Best Seller)\b|\/p\/?/i;

  if (globalScope.__NOON_OPS_COPILOT_READY__) {
    return;
  }
  globalScope.__NOON_OPS_COPILOT_READY__ = true;

  const parser = globalScope.NoonOpsParser;
  const insightsApi = globalScope.NoonOpsInsights;
  let state = {
    sortMode: "heat_desc",
    products: [],
    sortedProducts: [],
    insights: [],
    supported: false,
    lastSignature: "",
    lastAnalyzedUrl: "",
    refreshStatus: "idle",
    refreshMessage: "尚未刷新",
    lastUpdatedAt: "",
    lastRefreshCount: 0,
    refreshProgress: 0,
    refreshAttempt: 0,
    refreshAttempts: 0,
    expectedProducts: 0,
    skippedProducts: 0
  };
  let refreshTimer;
  let refreshRunId = 0;
  let locationPollTimer;
  let observer;

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  function getPanel() {
    return document.getElementById(PANEL_ID);
  }

  function ensurePanel() {
    let panel = getPanel();
    if (panel) {
      return panel;
    }

    panel = createElement("aside", "noon-ops-panel");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-live", "polite");
    panel.innerHTML = `
      <div class="noon-ops-header">
        <div>
          <div class="noon-ops-eyebrow">Noon Sales Ops</div>
          <h2>销售运营辅助</h2>
        </div>
        <div class="noon-ops-header-actions">
          <button type="button" data-action="collapse" title="折叠">‹</button>
          <button type="button" data-action="close" title="关闭">×</button>
        </div>
      </div>
      <div class="noon-ops-body"></div>
    `;
    document.documentElement.appendChild(panel);
    panel.addEventListener("click", handlePanelClick);
    panel.addEventListener("change", handlePanelChange);
    return panel;
  }

  function togglePanel() {
    const panel = ensurePanel();
    const isVisible = panel.classList.toggle("is-visible");
    if (isVisible) {
      panel.classList.remove("is-collapsed");
      startAutoRefresh();
      requestRefresh("manual", { force: true });
    } else {
      stopAutoRefresh();
    }
  }

  function closePanel() {
    const panel = getPanel();
    if (panel) {
      panel.classList.remove("is-visible");
    }
    stopAutoRefresh();
  }

  function collapsePanel() {
    const panel = getPanel();
    if (panel) {
      panel.classList.toggle("is-collapsed");
    }
  }

  function resetForProgressiveRefresh(reason, attempts) {
    state.refreshAttempt = 0;
    state.refreshAttempts = attempts;
    state.refreshProgress = reason === "url" || reason === "click" ? 6 : 10;
    state.expectedProducts = 0;
    state.skippedProducts = 0;
    if (reason === "url" || reason === "click") {
      state.products = [];
      state.sortedProducts = [];
      state.insights = [];
      state.lastSignature = "";
    }
  }

  function analyzePage(options = {}) {
    const shouldCommit = options.commit !== false;
    const hostname = globalScope.location.hostname;
    const previousUrl = state.lastAnalyzedUrl;
    const supported = parser.isNoonHost(hostname);
    if (shouldCommit) {
      state.supported = supported;
      state.lastAnalyzedUrl = globalScope.location.href;
    }
    if (!supported) {
      if (shouldCommit) {
        state.products = [];
        state.sortedProducts = [];
        state.insights = [{
          type: "data_gap",
          title: "不支持当前页面",
          message: "请在 noon 商品列表、搜索结果或店铺商品页中打开插件。"
        }];
      }
      return {
        products: [],
        signature: buildPageSignature([]),
        changed: true
      };
    }

    const extractedProducts = parser.extractProducts(document, globalScope.location.href);
    const products = extractedProducts.filter((product) => parser.isDisplayReadyProduct(product));
    const linkedExtractedCount = extractedProducts.filter((product) => parser.hasUsableProductLink(product)).length;
    const expectedProducts = Math.max(
      products.length,
      linkedExtractedCount || parser.countProductLinkCandidates(document)
    );
    const sortedProducts = parser.sortProducts(products, state.sortMode);
    const signature = buildPageSignature(products);
    const changed = signature !== state.lastSignature || globalScope.location.href !== previousUrl;
    if (shouldCommit) {
      state.products = products;
      state.sortedProducts = sortedProducts;
      state.insights = insightsApi.createInsights(products);
      state.lastSignature = signature;
      state.expectedProducts = expectedProducts;
      state.skippedProducts = Math.max(0, extractedProducts.length - products.length);
    }
    return { products, signature, changed, expectedProducts, skippedProducts: Math.max(0, extractedProducts.length - products.length) };
  }

  function analyzeAndRender() {
    analyzePage();
    render();
  }

  function requestRefresh(reason, options = {}) {
    const panel = getPanel();
    if (!panel || !panel.classList.contains("is-visible")) {
      return;
    }

    const runId = ++refreshRunId;
    const isNavigation = reason === "url" || reason === "click";
    state.supported = parser.isNoonHost(globalScope.location.hostname);
    state.refreshStatus = isNavigation ? "waiting" : "refreshing";
    state.refreshMessage = getRefreshStartMessage(reason);

    const attempts = options.attempts || (isNavigation ? 8 : options.force ? 5 : 4);
    const interval = options.interval || (isNavigation ? 240 : 160);
    resetForProgressiveRefresh(reason, attempts);
    render();
    runRefreshAttempt(runId, reason, attempts, interval, 1, "", 0);
  }

  function runRefreshAttempt(runId, reason, attempts, interval, attempt, previousSignature, stablePasses) {
    if (runId !== refreshRunId) {
      return;
    }

    setTimeout(() => {
      if (runId !== refreshRunId) {
        return;
      }

      state.refreshStatus = "refreshing";
      state.refreshAttempt = attempt;
      state.refreshAttempts = attempts;
      state.refreshMessage = attempt > 1 ? `正在稳定商品数据 (${attempt}/${attempts})` : "正在读取当前页面商品";
      render();

      const beforeSignature = state.lastSignature;
      const minAttempts = reason === "url" || reason === "click" ? 3 : 2;
      const shouldCommitResult = !(reason === "url" || reason === "click") || attempt >= minAttempts;
      const result = analyzePage({ commit: shouldCommitResult });
      const readyCount = result.products.length;
      const expectedCount = result.expectedProducts;
      const hasProducts = readyCount > 0;
      const changed = result.signature !== beforeSignature;
      const nextStablePasses = result.signature && result.signature === previousSignature ? stablePasses + 1 : 0;
      const minStablePasses = 1;
      state.refreshProgress = calculateRefreshProgress(attempt, attempts, readyCount, expectedCount, nextStablePasses);
      state.refreshMessage = buildProgressMessage(reason, readyCount, expectedCount, attempt, attempts);
      if (!shouldCommitResult) {
        state.expectedProducts = expectedCount;
      }
      render();

      const shouldFinish = (!parser.isNoonHost(globalScope.location.hostname)) ||
        attempt >= attempts ||
        (hasProducts && attempt >= minAttempts && nextStablePasses >= minStablePasses);

      if (!shouldFinish) {
        runRefreshAttempt(runId, reason, attempts, interval, attempt + 1, result.signature, nextStablePasses);
        return;
      }

      state.refreshStatus = "complete";
      state.refreshProgress = state.supported ? 100 : 0;
      state.lastUpdatedAt = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      state.lastRefreshCount = result.products.length;
      state.refreshMessage = buildRefreshDoneMessage(reason, result.products.length, changed);
      render();
    }, attempt === 1 ? 40 : interval);
  }

  function calculateRefreshProgress(attempt, attempts, readyCount, expectedCount, stablePasses) {
    const attemptProgress = Math.round((attempt / attempts) * 82);
    const dataProgress = expectedCount > 0 ? Math.round((readyCount / expectedCount) * 86) : 0;
    const stableBonus = Math.min(stablePasses * 7, 12);
    return Math.max(8, Math.min(96, Math.max(attemptProgress, dataProgress) + stableBonus));
  }

  function buildProgressMessage(reason, readyCount, expectedCount, attempt, attempts) {
    if (!state.supported) {
      return "当前页面不支持分析";
    }
    const totalText = expectedCount > 0 ? `/${expectedCount}` : "";
    if (readyCount > 0) {
      return `已显示 ${readyCount}${totalText} 件可用商品，继续校验链接和指标`;
    }
    if (reason === "url" || reason === "click") {
      return `页面加载中，正在等待商品卡片 (${attempt}/${attempts})`;
    }
    return `正在识别可用商品 (${attempt}/${attempts})`;
  }

  function buildPageSignature(products) {
    const productPart = products.map((product) => [
      product.url,
      product.title,
      product.price,
      product.salesSignalCount,
      product.salesSignalSource,
      product.rating,
      product.reviewCount
    ].join("|")).join(";");
    return `${globalScope.location.href}::${productPart}`;
  }

  function scheduleAutoRefresh(reason) {
    const panel = getPanel();
    if (!panel || !panel.classList.contains("is-visible")) {
      return;
    }

    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      requestRefresh(reason, { attempts: reason === "url" || reason === "click" ? 8 : 3 });
    }, reason === "url" || reason === "click" ? 60 : 180);
  }

  function startAutoRefresh() {
    if (!observer) {
      observer = new MutationObserver((mutations) => {
        const hasRelevantChange = mutations.some(mutationLooksRelevant);
        if (hasRelevantChange) {
          scheduleAutoRefresh("dom");
        }
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
    patchHistory();
    startLocationPolling();
  }

  function mutationLooksRelevant(mutation) {
    if (mutation.target && mutation.target.closest && mutation.target.closest(`#${PANEL_ID}`)) {
      return false;
    }
    if (mutation.type === "characterData") {
      return PRODUCT_CHANGE_RE.test(mutation.target && mutation.target.textContent || "");
    }

    const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
    if (!changedNodes.length) {
      return false;
    }
    return changedNodes.some((node) => {
      if (node.closest && node.closest(`#${PANEL_ID}`)) {
        return false;
      }
      const href = node.getAttribute && node.getAttribute("href");
      const text = node.textContent || "";
      if (PRODUCT_CHANGE_RE.test(href || "") || PRODUCT_CHANGE_RE.test(text)) {
        return true;
      }
      return Boolean(node.querySelector && node.querySelector('a[href*="/p/"], [data-qa*="product"], [data-testid*="product"], [class*="ProductCard"], [class*="product-card"]'));
    });
  }

  function stopAutoRefresh() {
    clearTimeout(refreshTimer);
    clearInterval(locationPollTimer);
    locationPollTimer = undefined;
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }
  }

  function render() {
    const panel = ensurePanel();
    const body = panel.querySelector(".noon-ops-body");
    body.replaceChildren();

    if (!state.supported) {
      body.appendChild(renderUnsupported());
      return;
    }

    body.appendChild(renderToolbar());
    body.appendChild(renderRefreshStatus());
    body.appendChild(renderSummary());
    body.appendChild(renderInsights());
    body.appendChild(renderProductList());
  }

  function renderUnsupported() {
    const wrapper = createElement("div", "noon-ops-empty");
    wrapper.appendChild(createElement("h3", "", "不支持当前页面"));
    wrapper.appendChild(createElement("p", "", "请打开 noon 商品列表、搜索结果或店铺商品页后再使用。"));
    return wrapper;
  }

  function renderToolbar() {
    const toolbar = createElement("div", "noon-ops-toolbar");
    const select = createElement("select", "noon-ops-select");
    select.setAttribute("aria-label", "排序方式");
    select.dataset.action = "sort";
    for (const [value, label] of SORT_OPTIONS) {
      const option = createElement("option", "", label);
      option.value = value;
      option.selected = value === state.sortMode;
      select.appendChild(option);
    }

    const refresh = createElement("button", "noon-ops-button", "刷新");
    refresh.type = "button";
    refresh.dataset.action = "refresh";
    refresh.disabled = state.refreshStatus === "refreshing" || state.refreshStatus === "waiting";
    refresh.textContent = state.refreshStatus === "refreshing" || state.refreshStatus === "waiting" ? "刷新中" : "刷新";
    const copy = createElement("button", "noon-ops-button", "复制");
    copy.type = "button";
    copy.dataset.action = "copy";
    const exportButton = createElement("button", "noon-ops-button", "导出 CSV");
    exportButton.type = "button";
    exportButton.dataset.action = "export";

    toolbar.append(select, refresh, copy, exportButton);
    return toolbar;
  }

  function renderRefreshStatus() {
    const wrapper = createElement("div", `noon-ops-refresh noon-ops-refresh-${state.refreshStatus}`);
    const dot = createElement("span", "noon-ops-refresh-dot");
    const content = createElement("div", "noon-ops-refresh-content");
    const message = createElement("span", "noon-ops-refresh-message", state.refreshMessage);
    const progress = createElement("div", "noon-ops-progress");
    const progressBar = createElement("span", "noon-ops-progress-bar");
    progressBar.style.width = `${Math.max(0, Math.min(100, state.refreshProgress))}%`;
    progress.appendChild(progressBar);
    content.append(message, progress);
    const readyText = state.expectedProducts > 0 ? `${state.products.length}/${state.expectedProducts}` : String(state.products.length);
    const metaText = state.lastUpdatedAt ? `更新于 ${state.lastUpdatedAt} · ${readyText} 件可用` : `准备中 · ${readyText} 件可用`;
    const meta = createElement("span", "noon-ops-refresh-meta", metaText);
    wrapper.append(dot, content, meta);
    return wrapper;
  }

  function renderSummary() {
    const summary = parser.summarizeProducts(state.products);
    const cards = createElement("div", "noon-ops-summary");
    const values = [
      ["商品数", summary.totalProducts],
      ["有指标", summary.productsWithSales],
      ["最高指标", summary.highestSales === undefined ? "未识别" : parser.formatNumber(summary.highestSales)],
      ["均价", summary.averagePrice === undefined ? "未识别" : summary.averagePrice.toFixed(summary.averagePrice % 1 === 0 ? 0 : 2)]
    ];

    for (const [label, value] of values) {
      const card = createElement("div", "noon-ops-summary-card");
      card.appendChild(createElement("span", "", label));
      card.appendChild(createElement("strong", "", String(value)));
      cards.appendChild(card);
    }
    return cards;
  }

  function renderInsights() {
    const section = createElement("section", "noon-ops-section");
    section.appendChild(createElement("h3", "", "运营建议"));
    const list = createElement("div", "noon-ops-insights");

    if (!state.insights.length) {
      const empty = createElement("p", "noon-ops-muted", "当前页面数据不足，暂未生成建议。");
      list.appendChild(empty);
    }

    for (const insight of state.insights) {
      const item = createElement("article", `noon-ops-insight noon-ops-insight-${insight.type}`);
      item.appendChild(createElement("strong", "", insight.title));
      item.appendChild(createElement("p", "", insight.message));
      list.appendChild(item);
    }

    section.appendChild(list);
    return section;
  }

  function renderProductList() {
    const section = createElement("section", "noon-ops-section noon-ops-products-section");
    section.appendChild(createElement("h3", "", "商品排序"));
    const list = createElement("div", "noon-ops-products");

    if (!state.sortedProducts.length) {
      const empty = createElement("div", "noon-ops-empty");
      if (state.refreshStatus === "waiting" || state.refreshStatus === "refreshing") {
        empty.appendChild(createElement("h3", "", "正在加载可用商品"));
        empty.appendChild(createElement("p", "", "商品标题和链接完整后会逐个显示在这里。"));
        empty.appendChild(renderSkeletonList());
      } else {
        empty.appendChild(createElement("h3", "", "未识别到商品"));
        empty.appendChild(createElement("p", "", "请确认当前页面已经加载商品卡片，然后点击刷新。"));
      }
      list.appendChild(empty);
    }

    state.sortedProducts.forEach((product, index) => {
      const item = createElement("article", "noon-ops-product");
      const rank = createElement("div", "noon-ops-rank", String(index + 1));
      const main = createElement("div", "noon-ops-product-main");
      const title = createElement("a", "noon-ops-product-title", product.title);
      title.href = product.url || "#";
      title.dataset.action = "locate-product";
      title.dataset.productId = product.id;

      const meta = createElement("div", "noon-ops-product-meta");
      const primaryMetric = getPrimaryMetric(product);
      const primary = createElement("span", `noon-ops-pill noon-ops-primary noon-ops-primary-${primaryMetric.type}`, primaryMetric.text);
      const secondaryMetrics = getSecondaryMetrics(product, primaryMetric.type).map((metric) => createElement("span", "noon-ops-pill noon-ops-secondary", metric));
      meta.append(primary, ...secondaryMetrics);

      main.append(title, meta);
      item.append(rank, main);
      list.appendChild(item);
    });

    if (state.sortedProducts.length && (state.refreshStatus === "waiting" || state.refreshStatus === "refreshing")) {
      const loading = createElement("div", "noon-ops-inline-loading");
      loading.appendChild(createElement("strong", "", "继续加载中"));
      loading.appendChild(createElement("span", "", "只展示已具备可用商品链接的结果，后续商品会自动补充。"));
      list.appendChild(loading);
    }

    section.appendChild(list);
    return section;
  }

  function renderSkeletonList() {
    const skeletons = createElement("div", "noon-ops-skeletons");
    for (let index = 0; index < 3; index += 1) {
      const row = createElement("div", "noon-ops-skeleton-row");
      row.appendChild(createElement("span", "noon-ops-skeleton-rank"));
      const lines = createElement("div", "noon-ops-skeleton-lines");
      lines.appendChild(createElement("span", "noon-ops-skeleton-line"));
      lines.appendChild(createElement("span", "noon-ops-skeleton-line noon-ops-skeleton-line-short"));
      row.appendChild(lines);
      skeletons.appendChild(row);
    }
    return skeletons;
  }

  function formatSalesMetric(product) {
    if (product.salesSignalCount === undefined) {
      return "销量未识别";
    }
    const sourceLabel = product.salesSignalSource === "ratings" ? "Ratings" : "销量";
    return `${sourceLabel} ${parser.formatNumber(product.salesSignalCount)}`;
  }

  function formatHeatMetric(product) {
    return product.reviewCount === undefined ? "热度未识别" : `热度 ${parser.formatNumber(product.reviewCount)} Ratings`;
  }

  function formatPriceMetric(product) {
    return product.price === undefined ? "价格未识别" : parser.formatMoney(product);
  }

  function getSecondaryMetrics(product, primaryType) {
    if (primaryType === "sales") {
      return [formatHeatMetric(product), formatPriceMetric(product)];
    }
    if (primaryType === "price") {
      return [formatSalesMetric(product), formatHeatMetric(product)];
    }
    return [formatSalesMetric(product), formatPriceMetric(product)];
  }

  function getPrimaryMetric(product) {
    if (state.sortMode === "price_asc" || state.sortMode === "price_desc") {
      return {
        type: "price",
        text: product.price === undefined ? "价格未识别" : `价格 ${parser.formatMoney(product)}`
      };
    }
    if (state.sortMode === "rating_desc") {
      return {
        type: "rating",
        text: product.rating === undefined ? "评分未识别" : `评分 ${product.rating}`
      };
    }
    if (state.sortMode === "sales_desc") {
      return {
        type: "sales",
        text: formatSalesMetric(product)
      };
    }
    if (state.sortMode === "page_order") {
      return {
        type: "position",
        text: `位置 ${product.pagePosition}`
      };
    }
    return {
      type: "heat",
      text: formatHeatMetric(product)
    };
  }

  async function copyResults() {
    const content = parser.toTsv(state.sortedProducts);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(content);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    flashStatus("已复制，可直接粘贴到表格");
  }

  function exportCsv() {
    const csv = `\uFEFF${parser.toCsv(state.sortedProducts)}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `noon-sales-ops-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    flashStatus("CSV 已导出");
  }

  function flashStatus(message) {
    const panel = ensurePanel();
    let status = panel.querySelector(".noon-ops-status");
    if (!status) {
      status = createElement("div", "noon-ops-status");
      panel.appendChild(status);
    }
    status.textContent = message;
    status.classList.add("is-visible");
    setTimeout(() => status.classList.remove("is-visible"), 1800);
  }

  function handlePanelClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    if (action === "close") {
      closePanel();
    } else if (action === "collapse") {
      collapsePanel();
    } else if (action === "refresh") {
      requestRefresh("manual", { force: true, attempts: 5 });
    } else if (action === "copy") {
      copyResults().catch(() => flashStatus("复制失败，请检查浏览器权限"));
    } else if (action === "export") {
      exportCsv();
    } else if (action === "locate-product") {
      event.preventDefault();
      locateProduct(button.dataset.productId);
    }
  }

  function locateProduct(productId) {
    const product = state.products.find((item) => item.id === productId);
    if (!product || !product.sourceElement || !product.sourceElement.scrollIntoView) {
      flashStatus("当前页面暂时无法定位该商品");
      return;
    }

    temporarilyRevealPageForLocate();
    requestAnimationFrame(() => {
      product.sourceElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
      });
      scheduleLocateVisibilityChecks(product.sourceElement);
    });
    product.sourceElement.classList.add("noon-ops-source-highlight");
    setTimeout(() => {
      product.sourceElement.classList.remove("noon-ops-source-highlight");
    }, 2600);
    flashStatus("已收起浮窗并定位商品");
  }

  function scheduleLocateVisibilityChecks(element) {
    [260, 720].forEach((delay) => {
      setTimeout(() => adjustLocatedProductVisibility(element), delay);
    });
  }

  function adjustLocatedProductVisibility(element) {
    const panel = getPanel();
    if (!element || !element.getBoundingClientRect || !panel || !panel.getBoundingClientRect) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const margin = 18;
    const safeRight = Math.min(globalScope.innerWidth - margin, panelRect.left - margin);
    let left = 0;
    let top = 0;

    if (rect.right > safeRight) {
      left = Math.ceil(rect.right - safeRight);
    } else if (rect.left < margin) {
      left = Math.floor(rect.left - margin);
    }

    if (rect.bottom > globalScope.innerHeight - margin) {
      top = Math.ceil(rect.bottom - globalScope.innerHeight + margin);
    } else if (rect.top < margin) {
      top = Math.floor(rect.top - margin);
    }

    if (left || top) {
      globalScope.scrollBy({
        left,
        top,
        behavior: "smooth"
      });
    }
  }

  function temporarilyRevealPageForLocate() {
    const panel = getPanel();
    if (!panel) {
      return;
    }
    const wasCollapsed = panel.classList.contains("is-collapsed");
    const locateToken = String(Date.now());
    panel.dataset.locateToken = locateToken;
    panel.classList.add("is-collapsed", "is-locating");
    setTimeout(() => {
      if (panel.dataset.locateToken !== locateToken) {
        return;
      }
      panel.classList.remove("is-locating");
      delete panel.dataset.locateToken;
      if (!wasCollapsed) {
        panel.classList.remove("is-collapsed");
      }
    }, 3200);
  }

  function handlePanelChange(event) {
    const target = event.target;
    if (target && target.dataset.action === "sort") {
      state.sortMode = target.value;
      state.sortedProducts = parser.sortProducts(state.products, state.sortMode);
      render();
    }
  }

  function patchHistory() {
    if (globalScope.__NOON_OPS_HISTORY_PATCHED__) {
      return;
    }
    globalScope.__NOON_OPS_HISTORY_PATCHED__ = true;
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function patchedPushState() {
      const result = originalPushState.apply(this, arguments);
      setTimeout(() => scheduleAutoRefresh("url"), 0);
      return result;
    };

    history.replaceState = function patchedReplaceState() {
      const result = originalReplaceState.apply(this, arguments);
      setTimeout(() => scheduleAutoRefresh("url"), 0);
      return result;
    };

    globalScope.addEventListener("popstate", () => scheduleAutoRefresh("url"));
    globalScope.addEventListener("hashchange", () => scheduleAutoRefresh("url"));
    globalScope.addEventListener("click", (event) => {
      const link = event.target && event.target.closest && event.target.closest("a[href]");
      if (link && parser.isNoonHost(globalScope.location.hostname)) {
        scheduleAutoRefresh("click");
      }
    }, true);
  }

  function startLocationPolling() {
    if (locationPollTimer) {
      return;
    }
    let lastHref = globalScope.location.href;
    locationPollTimer = setInterval(() => {
      const currentHref = globalScope.location.href;
      if (currentHref !== lastHref) {
        lastHref = currentHref;
        scheduleAutoRefresh("url");
      }
    }, 300);
  }

  function getRefreshStartMessage(reason) {
    if (reason === "url" || reason === "click") {
      return "页面已变化，等待商品数据加载";
    }
    if (reason === "dom") {
      return "检测到页面内容变化，正在更新";
    }
    return "正在刷新商品排序";
  }

  function buildRefreshDoneMessage(reason, count, changed) {
    if (!state.supported) {
      return "当前页面不支持分析";
    }
    if (count === 0) {
      return "刷新完成，未识别到可用商品";
    }
    if (reason === "manual") {
      return `刷新完成，已显示 ${count} 件可用商品`;
    }
    if (!changed) {
      return `已检查，当前仍为 ${count} 件可用商品`;
    }
    return `已自动刷新，显示 ${count} 件可用商品`;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "NOON_OPS_TOGGLE") {
      togglePanel();
    }
  });
})(window);
