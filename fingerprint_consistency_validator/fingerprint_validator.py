#!/usr/bin/env python
# -*- coding: utf-8 -*-
# __author__ = 'Gz'
from typing import List, Dict

class FingerprintValidator:
    def __init__(self, expected_fp: Dict):
        self.expected = expected_fp
        self.issues: List[Dict] = []

    def warn(self, type_, severity, detail):
        self.issues.append({
            "type": type_,
            "severity": severity,
            "detail": detail
        })

    def validate(self, actual: Dict):
        ua = actual["userAgent"]
        platform = actual["platform"]
        webgl = actual["webgl"]

        # 1️⃣ UA / Platform
        if "Mac" in ua and "Mac" not in platform:
            self.warn("UA_PLATFORM_MISMATCH", "HIGH", f"{ua} vs {platform}")

        # 2️⃣ WebGL / OS
        if "Mac" in ua and "SwiftShader" in webgl.get("renderer", ""):
            self.warn("GPU_MISMATCH", "HIGH", "Mac UA but SwiftShader renderer")

        # 3️⃣ 字体（Docker 高危）
        if actual["fontsDetected"] < 2:
            self.warn("FONT_LACK", "MEDIUM", "Very few system fonts detected")

        # 4️⃣ 屏幕 & DPR
        screen = actual["screen"]
        if screen["dpr"] == 1 and screen["width"] <= 1366:
            self.warn("SCREEN_SUSPICIOUS", "LOW", f"{screen}")

        # 5️⃣ Timezone
        if self.expected.get("timezone") and actual["timezone"] != self.expected["timezone"]:
            self.warn("TIMEZONE_MISMATCH", "MEDIUM", actual["timezone"])

        # 6️⃣ webdriver
        if actual["webdriver"]:
            self.warn("WEBDRIVER_EXPOSED", "HIGH", "navigator.webdriver = true")

        return self.result()

    def result(self):
        score = 100
        for i in self.issues:
            if i["severity"] == "HIGH":
                score -= 30
            elif i["severity"] == "MEDIUM":
                score -= 15
            else:
                score -= 5

        return {
            "riskScore": max(score, 0),
            "issues": self.issues
        }
