#!/usr/bin/env python
# -*- coding: utf-8 -*-
# __author__ = 'Gz'
import asyncio
from playwright.async_api import async_playwright
import json

# 你的 Fingerprint Validator.js 代码，简化成字符串
JS_VALIDATOR = """
(() => {
  const issues = [];

  function warn(type, severity, detail) {
    issues.push({ type, severity, detail });
  }

  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const vendor = navigator.vendor;
  const webdriver = navigator.webdriver === true;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const screenInfo = {
    width: screen.width,
    height: screen.height,
    dpr: window.devicePixelRatio
  };

  function getWebGLInfoSafe() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return { unavailable: true };
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        return {
          vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
          renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
        };
      } else {
        return { vendor: null, renderer: null };
      }
    } catch {
      return { vendor: null, renderer: null };
    }
  }

  const webgl = getWebGLInfoSafe();

  const fontsDetected = 6; // 为简化示例，假设字体检测返回6

  // 风险评分
  const issues_summary = [];
  if (webgl.vendor === null) {
      issues_summary.push({type:"WEBGL_LIMITED", severity:"LOW", detail:"macOS browser with restricted or privacy WebGL"});
  }

  let riskScore = 100;
  for (const i of issues_summary) {
    if (i.severity === "HIGH") riskScore -= 30;
    else if (i.severity === "MEDIUM") riskScore -= 15;
    else riskScore -= 5;
  }
  if (riskScore < 0) riskScore = 0;

  return {
    summary: {
      userAgent: ua,
      platform,
      vendor,
      timezone,
      screen: screenInfo,
      webgl,
      fontsDetected,
      webdriver
    },
    riskScore,
    issues: issues_summary
  };
})();
"""

EXPECTED_FP = {
    "timezone": "Asia/Shanghai"
}


async def run_validator(cdp_url):
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(cdp_url)

        context = browser.contexts[0]
        page = await context.new_page()
        await page.goto("about:blank")
        result = await page.evaluate(JS_VALIDATOR)
        await page.close()
        return result


if __name__ == '__main__':
    cdp_url = "ws://localhost:9222/devtools/browser"
    fingerprint = run_validator(cdp_url)
    print(json.dumps(fingerprint, indent=4))
