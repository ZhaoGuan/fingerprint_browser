(async () => {
    function safe(fn, fallback = null) {
        try {
            return fn();
        } catch {
            return fallback;
        }
    }

    /* ================= Basic ================= */

    const basic = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        languages: navigator.languages,
        webdriver: navigator.webdriver === true
    };

    /* ================= Timezone ================= */

    const timezone = safe(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    /* ================= Screen ================= */

    const screenInfo = {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        dpr: window.devicePixelRatio
    };

    /* ================= WebGL ================= */

    function getWebGL() {
        try {
            const canvas = document.createElement("canvas");
            const gl =
                canvas.getContext("webgl") ||
                canvas.getContext("experimental-webgl");

            if (!gl) return {available: false};

            const ext = gl.getExtension("WEBGL_debug_renderer_info");

            if (!ext) {
                return {
                    available: true,
                    vendor: null,
                    renderer: null,
                    debug: false
                };
            }

            return {
                available: true,
                vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
                renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
                debug: true
            };
        } catch {
            return {available: false};
        }
    }

    const webgl = getWebGL();

    /* ================= Audio ================= */

    async function getAudioFingerprint() {
        try {
            const ctx =
                new (window.OfflineAudioContext ||
                    window.webkitOfflineAudioContext)(1, 44100, 44100);

            const osc = ctx.createOscillator();
            osc.type = "triangle";
            osc.frequency.value = 10000;

            const comp = ctx.createDynamicsCompressor();
            osc.connect(comp);
            comp.connect(ctx.destination);
            osc.start(0);

            const buffer = await ctx.startRendering();
            const data = buffer.getChannelData(0);

            let sum = 0;
            for (let i = 0; i < data.length; i += 100) {
                sum += Math.abs(data[i]);
            }
            return sum.toFixed(6);
        } catch {
            return null;
        }
    }

    /* ================= Fonts (Expanded Detection) ================= */

    function detectFonts() {
        const BASE_FONTS = ["monospace", "sans-serif", "serif"];

        const FONT_CANDIDATES = [
            // macOS
            "SF Pro Display", "SF Pro Text", "Helvetica", "Helvetica Neue",
            "PingFang SC", "PingFang TC", "Hiragino Sans",
            "Hiragino Kaku Gothic ProN", "Menlo", "Monaco",
            "Apple Color Emoji",

            // Windows
            "Microsoft YaHei", "SimSun", "SimHei", "Segoe UI",
            "Segoe UI Emoji", "Tahoma", "Calibri", "Cambria",
            "Consolas",

            // Linux
            "Ubuntu", "Ubuntu Mono", "DejaVu Sans", "DejaVu Serif",
            "Liberation Sans", "Noto Sans", "Noto Serif",

            // Common
            "Arial", "Verdana", "Times New Roman",
            "Courier New", "Georgia", "Trebuchet MS",
            "Comic Sans MS", "Impact",

            // Others
            "Roboto", "Inter", "Open Sans", "Lato",
            "Montserrat", "Source Han Sans SC",
            "Source Han Serif SC", "LXGW WenKai"
        ];

        const span = document.createElement("span");
        span.style.fontSize = "72px";
        span.style.position = "absolute";
        span.style.left = "-9999px";
        span.textContent = "mmmmmmmmmmlli";

        document.body.appendChild(span);

        const baseWidth = {};
        for (const f of BASE_FONTS) {
            span.style.fontFamily = f;
            baseWidth[f] = span.offsetWidth;
        }

        const detected = [];
        for (const font of FONT_CANDIDATES) {
            span.style.fontFamily = `${font}, monospace`;
            if (span.offsetWidth !== baseWidth.monospace) {
                detected.push(font);
            }
        }

        document.body.removeChild(span);
        return detected;
    }

    /* ================= MediaDevices ================= */

    async function getMediaDevices() {
        if (!navigator.mediaDevices) return null;
        const list = await navigator.mediaDevices.enumerateDevices();
        return {
            count: list.length,
            hasLabels: list.some(d => d.label)
        };
    }

    /* ================= Permissions ================= */

    async function getPermissions() {
        if (!navigator.permissions) return null;
        const names = ["geolocation", "notifications", "camera", "microphone"];
        return Promise.all(
            names.map(n =>
                navigator.permissions
                    .query({name: n})
                    .then(r => ({name: n, state: r.state}))
                    .catch(() => ({name: n, state: "unknown"}))
            )
        );
    }

    /* ================= Collect ================= */

    const result = {
        basic,
        timezone,
        screen: screenInfo,
        webgl,
        audio: await getAudioFingerprint(),
        fonts: detectFonts(),
        mediaDevices: await getMediaDevices(),
        permissions: await getPermissions()
    };

    /* ================= Console Output ================= */

    console.group("%c🧬 Fingerprint Collector", "color:#4CAF50;font-weight:bold");
    console.table(result.basic);
    console.log("Timezone:", result.timezone);
    console.log("Screen:", result.screen);
    console.log("WebGL:", result.webgl);
    console.log("Audio:", result.audio);
    console.log(`Fonts (${result.fonts.length}):`, result.fonts);
    console.log("MediaDevices:", result.mediaDevices);
    console.log("Permissions:", result.permissions);
    console.log("Result:", result);
    console.groupEnd();
    return result;
})();
