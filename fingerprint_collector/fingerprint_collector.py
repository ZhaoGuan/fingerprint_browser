#!/usr/bin/env python
# -*- coding: utf-8 -*-
# __author__ = 'Gz'
from playwright.async_api import async_playwright
import json


async def run_validator(cdp_url):
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(cdp_url)

        context = browser.contexts[0]
        page = await context.new_page()
        await page.goto("https://www.baidu.com/")
        JS_VALIDATOR = open("fingerprint_collector.js").read()
        result = await page.evaluate(JS_VALIDATOR)
        await page.close()
        return result


if __name__ == '__main__':
    cdp_url = "ws://localhost:9222/devtools/browser"
    fingerprint = run_validator(cdp_url)
    print(json.dumps(fingerprint, indent=4))
