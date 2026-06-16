(function initInsights(globalScope) {
  function hasNumber(value) {
    return Number.isFinite(value);
  }

  function median(values) {
    if (!values.length) {
      return undefined;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  }

  function compactTitle(product) {
    if (!product) {
      return "";
    }
    return product.title.length > 42 ? `${product.title.slice(0, 42)}...` : product.title;
  }

  function formatPrice(value, currency) {
    if (!hasNumber(value)) {
      return "";
    }
    const formatted = value.toFixed(value % 1 === 0 ? 0 : 2);
    return currency ? `${currency} ${formatted}` : formatted;
  }

  function salesMetric(product) {
    if (hasNumber(product.salesSignalCount)) {
      return product.salesSignalCount;
    }
    if (hasNumber(product.salesCount)) {
      return product.salesCount;
    }
    if (hasNumber(product.reviewCount)) {
      return product.reviewCount;
    }
    return undefined;
  }

  function createInsights(products) {
    const insights = [];
    const withSales = products.filter((product) => hasNumber(salesMetric(product)));
    const withPrice = products.filter((product) => hasNumber(product.price));

    if (!withSales.length) {
      insights.push({
        type: "data_gap",
        title: "当前页未识别到销量",
        message: "这个页面可能没有展示销量字段。建议先用评论数、评分和价格带做辅助判断，或切换到展示销量的列表页。"
      });
      return insights;
    }

    const topSellers = [...withSales].sort((a, b) => salesMetric(b) - salesMetric(a)).slice(0, 3);
    if (topSellers.length) {
      insights.push({
        type: "top_seller",
        title: "优先参考高销量商品",
        message: `当前页销量领先的是「${compactTitle(topSellers[0])}」。建议对比 Top ${topSellers.length} 的标题关键词、价格、促销标签和主图风格。`,
        relatedProductIds: topSellers.map((product) => product.id)
      });
    }

    const topSellerPrices = topSellers.map((product) => product.price).filter(hasNumber);
    if (topSellerPrices.length >= 2) {
      const min = Math.min(...topSellerPrices);
      const max = Math.max(...topSellerPrices);
      const currency = topSellers.find((product) => product.currency)?.currency;
      insights.push({
        type: "price_band",
        title: "高销量价格带",
        message: `高销量商品集中在 ${formatPrice(min, currency)} - ${formatPrice(max, currency)}。可优先检查自家商品是否偏离这个成交价格带。`,
        relatedProductIds: topSellers.map((product) => product.id)
      });
    }

    if (withPrice.length >= 3 && withSales.length >= 3) {
      const medianPrice = median(withPrice.map((product) => product.price));
      const medianSales = median(withSales.map((product) => salesMetric(product)));
      const riskProducts = products
        .filter((product) => hasNumber(product.price) && hasNumber(salesMetric(product)))
        .filter((product) => product.price > medianPrice && salesMetric(product) < medianSales)
        .slice(0, 3);

      if (riskProducts.length) {
        insights.push({
          type: "low_sales_risk",
          title: "高价低销量风险",
          message: `发现 ${riskProducts.length} 个商品价格高于当前页中位数但销量偏低。建议检查价格竞争力、首图吸引力和促销露出。`,
          relatedProductIds: riskProducts.map((product) => product.id)
        });
      }

      const opportunityProducts = products
        .filter((product) => hasNumber(product.rating) && hasNumber(salesMetric(product)))
        .filter((product) => product.rating >= 4.3 && salesMetric(product) < medianSales)
        .slice(0, 3);

      if (opportunityProducts.length) {
        insights.push({
          type: "rating_opportunity",
          title: "高评分低销量机会",
          message: `有 ${opportunityProducts.length} 个商品评分较好但销量偏低。建议增加曝光、优化标题关键词或参与活动提升流量。`,
          relatedProductIds: opportunityProducts.map((product) => product.id)
        });
      }
    }

    return insights;
  }

  const api = { createInsights };
  globalScope.NoonOpsInsights = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
