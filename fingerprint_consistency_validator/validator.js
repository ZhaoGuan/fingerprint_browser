(() => {
  const issues = [];

  function warn(type, severity, detail) {
    issues.push({ type, severity, detail });
  }

  /* ---------- 基础信息 ---------- */

  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const vendor = navigator.vendor;
  const webdriver = navigator.webdriver === true;

  const isMac = /Macintosh|Mac OS X/.test(ua) && platform === "MacIntel";
  const isLinux = /Linux/.test(ua);
  const isWindows = /Windows/.test(ua);

  /* ---------- Timezone ---------- */

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  /* ---------- Screen / DPR ---------- */

  const screenInfo = {
    width: screen.width,
    height: screen.height,
    dpr: window.devicePixelRatio
  };

  /* ---------- WebGL ---------- */

  function getWebGLInfo() {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      if (!gl) return { unavailable: true };
      return {
        vendor: gl.getParameter(37445),
        renderer: gl.getParameter(37446)
      };
    } catch {
      return { unavailable: true };
    }
  }

  const webgl = getWebGLInfo();

  /* ---------- Fonts (macOS aware) ---------- */

  function detectFonts() {
    const baseFonts = ["monospace", "sans-serif", "serif"];
    const testFonts = [
      // macOS 常见
      "PingFang SC",
      "Hiragino Sans",
      "Helvetica",
      "Arial",
      "Times New Roman",
      "Courier New",
      "SF Pro Display",
      // 非 macOS
      "Microsoft YaHei"
    ];

    const span = document.createElement("span");
    span.style.fontSize = "72px";
    span.style.position = "absolute";
    span.style.left = "-9999px";
    span.innerHTML = "mmmmmmmmmmlli";
    document.body.appendChild(span);

    const defaultWidth = {};
    for (const f of baseFonts) {
      span.style.fontFamily = f;
      defaultWidth[f] = span.offsetWidth;
    }

    let detected = 0;
    for (const f of testFonts) {
      span.style.fontFamily = `${f},monospace`;
      if (span.offsetWidth !== defaultWidth.monospace) {
        detected++;
      }
    }

    document.body.removeChild(span);
    return detected;
  }

  const fontsDetected = detectFonts();

  /* ---------- Consistency Rules ---------- */

  // UA / Platform
  if (isMac && !/Mac/.test(platform)) {
    warn("UA_PLATFORM_MISMATCH", "HIGH", `${ua} vs ${platform}`);
  }

  if (isWindows && !/Win/.test(platform)) {
    warn("UA_PLATFORM_MISMATCH", "HIGH", `${ua} vs ${platform}`);
  }

  // WebGL 规则（修正重点）
  if (!isMac && (webgl.vendor == null || webgl.renderer == null)) {
    warn(
      "WEBGL_MISSING",
      "HIGH",
      "Non-macOS environment with missing WebGL info"
    );
  }

  // Mac 特殊说明（不直接扣分）
  if (isMac && (webgl.vendor == null || webgl.renderer == null)) {
    warn(
      "WEBGL_LIMITED",
      "LOW",
      "macOS browser with restricted or privacy WebGL"
    );
  }

  // Linux + Software GPU
  if (
    isLinux &&
    /SwiftShader|llvmpipe/i.test(webgl.renderer || "")
  ) {
    warn("LINUX_SOFTWARE_GPU", "HIGH", webgl.renderer);
  }

  // Fonts
  if (isMac && fontsDetected < 4) {
    warn("FONT_LACK", "MEDIUM", `fontsDetected=${fontsDetected}`);
  }

  if (!isMac && fontsDetected <= 2) {
    warn("FONT_LACK", "MEDIUM", `fontsDetected=${fontsDetected}`);
  }

  // Screen / DPR
  if (!isMac && screenInfo.dpr === 1 && screenInfo.width >= 1920) {
    warn(
      "SCREEN_DOCKER_STYLE",
      "LOW",
      `${screenInfo.width}x${screenInfo.height}@${screenInfo.dpr}`
    );
  }

  // webdriver
  if (webdriver) {
    warn("WEBDRIVER_EXPOSED", "HIGH", "navigator.webdriver === true");
  }

  /* ---------- Risk Score ---------- */

  let riskScore = 100;
  for (const i of issues) {
    if (i.severity === "HIGH") riskScore -= 30;
    else if (i.severity === "MEDIUM") riskScore -= 15;
    else riskScore -= 5;
  }
  if (riskScore < 0) riskScore = 0;

  /* ---------- Output ---------- */

  const result = {
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
    issues
  };

  console.group("🧬 Fingerprint Consistency Validator");
  console.log("Summary:", JSON.stringify(result.summary));
  console.log("Risk Score:", riskScore);
  if (issues.length) {
    console.table(issues);
  } else {
    console.log("✅ No obvious fingerprint issues detected");
  }
  console.groupEnd();

  return result;
})();
