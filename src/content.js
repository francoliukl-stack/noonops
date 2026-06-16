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
    lastAnalyzedUrl: ""
  };
  let refreshTimer;
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
      analyzeAndRender();
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

  function analyzeAndRender() {
    const hostname = globalScope.location.hostname;
    state.supported = parser.isNoonHost(hostname);
    state.lastAnalyzedUrl = globalScope.location.href;
    if (!state.supported) {
      state.products = [];
      state.sortedProducts = [];
      state.insights = [{
        type: "data_gap",
        title: "不支持当前页面",
        message: "请在 noon 商品列表、搜索结果或店铺商品页中打开插件。"
      }];
      render();
      return;
    }

    const products = parser.extractProducts(document, globalScope.location.href);
    const sortedProducts = parser.sortProducts(products, state.sortMode);
    state.products = products;
    state.sortedProducts = sortedProducts;
    state.insights = insightsApi.createInsights(products);
    state.lastSignature = buildPageSignature(products);
    render();
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
      if (!state.supported && !parser.isNoonHost(globalScope.location.hostname)) {
        return;
      }
      const products = parser.extractProducts(document, globalScope.location.href);
      const signature = buildPageSignature(products);
      if (signature !== state.lastSignature || globalScope.location.href !== state.lastAnalyzedUrl) {
        analyzeAndRender();
        flashStatus(reason === "url" ? "页面已切换，已自动刷新" : "页面商品已更新，已自动刷新");
      }
    }, 450);
  }

  function startAutoRefresh() {
    if (!observer) {
      observer = new MutationObserver((mutations) => {
        const hasRelevantChange = mutations.some((mutation) => {
          if (mutation.target && mutation.target.closest && mutation.target.closest(`#${PANEL_ID}`)) {
            return false;
          }
          return mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "characterData";
        });
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
  }

  function stopAutoRefresh() {
    clearTimeout(refreshTimer);
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
    const copy = createElement("button", "noon-ops-button", "复制");
    copy.type = "button";
    copy.dataset.action = "copy";
    const exportButton = createElement("button", "noon-ops-button", "导出 CSV");
    exportButton.type = "button";
    exportButton.dataset.action = "export";

    toolbar.append(select, refresh, copy, exportButton);
    return toolbar;
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
      empty.appendChild(createElement("h3", "", "未识别到商品"));
      empty.appendChild(createElement("p", "", "请确认当前页面已经加载商品卡片，然后点击刷新。"));
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
      const sales = createElement("span", "noon-ops-pill noon-ops-secondary", formatSalesMetric(product));
      const price = createElement("span", "noon-ops-pill noon-ops-secondary", product.price === undefined ? "价格未识别" : parser.formatMoney(product));
      meta.append(primary, sales, price);

      main.append(title, meta);
      item.append(rank, main);
      list.appendChild(item);
    });

    section.appendChild(list);
    return section;
  }

  function formatSalesMetric(product) {
    if (product.salesSignalCount === undefined) {
      return "销量未识别";
    }
    const sourceLabel = product.salesSignalSource === "ratings" ? "Ratings" : "销量";
    return `${sourceLabel} ${parser.formatNumber(product.salesSignalCount)}`;
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
      text: product.reviewCount === undefined ? "热度未识别" : `热度 ${parser.formatNumber(product.reviewCount)} Ratings`
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
      analyzeAndRender();
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

    product.sourceElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest"
    });
    product.sourceElement.classList.add("noon-ops-source-highlight");
    setTimeout(() => {
      product.sourceElement.classList.remove("noon-ops-source-highlight");
    }, 1800);
    flashStatus("已定位到页面中的商品");
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
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "NOON_OPS_TOGGLE") {
      togglePanel();
    }
  });
})(window);
