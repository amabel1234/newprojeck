(function () {
  "use strict";

  const MAX_BYTES = 2 * 1024 * 1024;
  const RESERVED = new Set([
    "and","break","do","else","elseif","end","false","for","function","if","in","local","nil","not","or","repeat","return","then","true","until","while",
    "continue","type","export","self","_G","game","workspace","script","math","string","table","task","coroutine","debug","bit32","utf8","os","Enum","Instance","CFrame","Vector2","Vector3","Color3","UDim","UDim2","RaycastParams","TweenInfo","Random","DateTime","PhysicalProperties","NumberRange","NumberSequence","ColorSequence","BrickColor","Region3","Axes","Faces","Rect","PathWaypoint","OverlapParams","Ray","RaycastResult","require","print","warn","error","assert","pcall","xpcall","pairs","ipairs","next","select","tonumber","tostring","type","typeof","setmetatable","getmetatable","rawget","rawset","rawequal","newproxy","unpack","table","getfenv","setfenv","loadstring"
  ]);

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

  function tokenizeLua(source) {
    const tokens = [];
    let i = 0;
    const len = source.length;
    const push = (type, value) => tokens.push({ type, value });

    while (i < len) {
      const c = source[i];
      if (/\s/.test(c)) { i++; continue; }

      // -- comment / --[[ long comment ]]
      if (c === "-" && source[i + 1] === "-") {
        if (source[i + 2] === "[" && source[i + 3] === "[") {
          const end = source.indexOf("]]", i + 4);
          i = end === -1 ? len : end + 2;
        } else {
          const end = source.indexOf("\n", i + 2);
          i = end === -1 ? len : end + 1;
        }
        continue;
      }

      // quoted strings
      if (c === '"' || c === "'") {
        const quote = c;
        let value = c;
        i++;
        while (i < len) {
          const ch = source[i];
          value += ch;
          i++;
          if (ch === "\\" && i < len) { value += source[i]; i++; continue; }
          if (ch === quote) break;
        }
        push("string", value);
        continue;
      }

      // Luau long strings
      if (c === "[" && source[i + 1] === "[") {
        const end = source.indexOf("]]", i + 2);
        if (end !== -1) {
          push("string", source.slice(i, end + 2));
          i = end + 2;
          continue;
        }
      }

      const ident = source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (ident) {
        push("ident", ident[0]);
        i += ident[0].length;
        continue;
      }

      const number = source.slice(i).match(/^(?:0[xX][0-9A-Fa-f]+(?:\.[0-9A-Fa-f]+)?|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/);
      if (number) {
        push("number", number[0]);
        i += number[0].length;
        continue;
      }

      const three = source.slice(i, i + 3);
      const two = source.slice(i, i + 2);
      if (["...", "::="].includes(three)) { push("op", three); i += 3; continue; }
      if (["==","~=","<=",">=","::","..","+=","-=","*=","/=","%=","^=","//","->"].includes(two)) { push("op", two); i += 2; continue; }

      push("op", c);
      i++;
    }
    return tokens;
  }

  function stringToCharExpr(raw) {
    if (raw.length < 2 || !((raw[0] === '"' && raw.at(-1) === '"') || (raw[0] === "'" && raw.at(-1) === "'"))) return raw;
    const quote = raw[0];
    let content = raw.slice(1, -1);
    // Only transform strings that can be represented safely from their decoded-ish source.
    // Preserve escaped sequences by falling back for complicated strings.
    if (/\\[abfnrtv0-9xu]/i.test(content)) return raw;
    const chars = [...content].map((ch) => String(ch.codePointAt(0))).join(",");
    return `string.char(${chars})`;
  }

  function randTag() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }

  function embeddedWatermark(tag) {
    const url = "https://nixcooll.biz.id/";
    const codes = [...url].map(ch => ch.codePointAt(0)).join(",");
    return `local _NIXX_WM_${tag}=string.char(${codes})`;
  }

  function obfuscate(source, mode) {
    const tokens = tokenizeLua(source);
    const strong = mode === "strong" || mode === "extreme";
    const rename = mode === "medium" || strong;
    const encodeStrings = strong;
    const map = new Map();
    let localCounter = Math.floor(Math.random() * 9000) + 100;
    const tag = randTag();
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Generate names that do not resemble the original source.
    const generatedName = () => {
      let n = localCounter++;
      let out = "_0x";
      do {
        out += alphabet[n % alphabet.length];
        n = Math.floor(n / alphabet.length);
      } while (n > 0);
      return out + Math.floor(Math.random() * 900 + 100).toString(16);
    };

    // Decode Lua string literals without leaving the original plaintext in output.
    // A per-build key makes every generated file different.
    const key = Math.floor(Math.random() * 90) + 17;
    const decodeName = `_0xD${tag.slice(0, 5)}`;
    const byteExpr = (code, index) => {
      const mask = (key + index * 13) % 251;
      const encoded = (code ^ mask) + mask;
      return `{${encoded},${mask}}`;
    };

    const decodeHeader = () => {
      if (!encodeStrings) return "";
      return `local ${decodeName}=function(t)local s={};for i=1,#t do local p=t[i];local e=p[1]-p[2];local m=p[2];s[i]=string.char(bit32.bxor(e,m))end;return table.concat(s)end;`;
    };

    // Collect local declarations. This intentionally keeps globals/API names untouched.
    // The tokenizer prevents strings/comments from being interpreted as identifiers.
    let expectLocalNames = false;
    let functionParams = false;
    let paramDepth = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type !== "ident") {
        if (functionParams && t.value === "(") paramDepth++;
        if (functionParams && t.value === ")") {
          paramDepth--;
          if (paramDepth <= 0) functionParams = false;
        }
        continue;
      }
      if (t.value === "local") {
        expectLocalNames = true;
        continue;
      }
      if (t.value === "function") {
        // Parameters after a named/local function are also candidates.
        functionParams = true;
        paramDepth = 0;
        continue;
      }
      if (expectLocalNames) {
        if (RESERVED.has(t.value)) { expectLocalNames = false; continue; }
        if (!map.has(t.value)) map.set(t.value, generatedName());
        const next = tokens[i + 1]?.value;
        if (next !== ",") expectLocalNames = false;
      }
      if (functionParams && paramDepth > 0 && !RESERVED.has(t.value) && t.value !== "self") {
        if (!map.has(t.value)) map.set(t.value, generatedName());
      }
    }

    const out = [];
    let stringIndex = 0;
    let previousValue = "";
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      let value = t.value;
      const prev = tokens[i - 1]?.value;

      if (t.type === "ident" && rename && map.has(value) && prev !== "." && prev !== ":") {
        value = map.get(value);
      }

      if (t.type === "string" && encodeStrings) {
        // Preserve long strings as a runtime decoded value too.
        let content = value;
        if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
          content = content.slice(1, -1);
          // Decode the common Lua escapes before encoding. For unusual escape forms,
          // keep the literal escaped; this avoids changing program semantics.
          if (/\\[abfnrtv0-9xu]/i.test(content)) {
            // Keep complex escaped literals untouched to preserve exact Lua semantics.
            value = t.value;
          } else {
            const parts = [...content].map((ch, idx) => byteExpr(ch.codePointAt(0), stringIndex + idx));
            value = `(${decodeName}({${parts.join(",")}}))`;
          }
        } else if (value.startsWith("[[") && value.endsWith("]]")) {
          content = value.slice(2, -2);
          const parts = [...content].map((ch, idx) => byteExpr(ch.codePointAt(0), stringIndex + idx));
          value = `(${decodeName}({${parts.join(",")}}))`;
        }
        stringIndex += 1;
      }

      if (out.length) {
        const needsSpace = /[A-Za-z0-9_]$/.test(previousValue.at(-1) || "") && /^[A-Za-z0-9_]/.test(value);
        if (needsSpace) out.push(" ");
      }
      out.push(value);
      previousValue = value;
    }

    let result = out.join("").trim();

    // Remove obvious source-shaped comments and add a small, harmless signature.
    const signature = encodeStrings
      ? `${decodeHeader()}local _0xS${tag.slice(0, 4)}=${decodeName}({${[...tag].map((ch, idx) => byteExpr(ch.codePointAt(0), idx)).join(",")}});`
      : "";

    if (mode === "extreme") {
      const junkName = `_0xJ${tag.slice(0, 5)}`;
      result = `${signature}local ${junkName}=0;do ${junkName}=${junkName}+1 until ${junkName}>0;${result}`;
    } else {
      result = `${signature}${result}`;
    }

    const header = `--[[ NIXX OBFUSCATOR | ${mode.toUpperCase()} | ${tag} | https://nixcooll.biz.id/ ]]\n`;
    const watermark = `-- NIXX protected: https://nixcooll.biz.id/\n`;
    return header + watermark + result + "\n";
  }

  function insertSection() {
    if (document.querySelector("#nixx-lua-obfuscator")) return true;
    const anchor = document.querySelector("footer") || document.querySelector(".products-section") || document.querySelector("#root");
    if (!anchor) return false;

    const section = document.createElement("section");
    section.id = "nixx-lua-obfuscator";
    section.className = "nixx-obfuscator-section";
    section.innerHTML = `
      <div class="nixx-obfuscator-inner">
        <div class="nixx-obfuscator-heading">
          <div>
            <span class="feature-eyebrow">NIXX TOOL</span>
            <h2>Lua Obfuscator.</h2>
            <p>Lindungi source Lua / Luau kamu dengan beberapa level proteksi. Proses obfuscation dilakukan di browser.</p>
          </div>
          <span class="nixx-obfuscator-badge">LUACODE</span>
        </div>
        <div class="nixx-obfuscator-grid">
          <div class="nixx-obfuscator-panel">
            <div class="nixx-obfuscator-toolbar">
              <label class="nixx-file-button"><input id="nixx-obf-file" type="file" accept=".lua,.luau,text/plain">Upload .lua</label>
              <button type="button" class="nixx-tool-button" id="nixx-obf-clear">Clear</button>
            </div>
            <textarea id="nixx-obf-input" spellcheck="false" placeholder="Paste Lua / Luau source di sini..."></textarea>
            <div class="nixx-obfuscator-stats"><span id="nixx-obf-input-size">0 B</span><span id="nixx-obf-file-name">source.lua</span></div>
          </div>
          <div class="nixx-obfuscator-panel nixx-obf-options">
            <span class="nixx-obf-label">OBFUSCATION MODE</span>
            <div class="nixx-mode-list">
              <label><input type="radio" name="nixx-obf-mode" value="clean"> <span><b>Clean</b><small>Minify + hapus komentar</small></span></label>
              <label><input type="radio" name="nixx-obf-mode" value="light"> <span><b>Light</b><small>Minify + transform dasar</small></span></label>
              <label><input type="radio" name="nixx-obf-mode" value="medium"> <span><b>Medium</b><small>Rename local + minify</small></span></label>
              <label><input type="radio" name="nixx-obf-mode" value="strong" checked> <span><b>Strong</b><small>Rename + string + embedded watermark</small></span></label>
              <label><input type="radio" name="nixx-obf-mode" value="extreme"> <span><b>Extreme</b><small>Maximum transform + NIXX signature</small></span></label>
            </div>
            <button type="button" class="nixx-obf-main-button" id="nixx-obf-run">🔐 Obfuscate Source</button>
            <div id="nixx-obf-status" class="nixx-obf-status" role="status"></div>
          </div>
        </div>
        <div class="nixx-obfuscator-output" id="nixx-obf-output-wrap" hidden>
          <div class="nixx-output-head"><div><span class="nixx-obf-label">PROTECTED OUTPUT</span><strong id="nixx-obf-output-size">0 B</strong></div><div class="nixx-output-actions"><button type="button" class="nixx-tool-button" id="nixx-obf-copy">Copy</button><button type="button" class="nixx-tool-button" id="nixx-obf-download">Download .lua</button><button type="button" class="nixx-tool-button nixx-raw-button" id="nixx-obf-open-raw" hidden>↗ Raw</button><button type="button" class="nixx-tool-button" id="nixx-obf-copy-raw" hidden>Copy Raw</button></div></div>
          <textarea id="nixx-obf-output" spellcheck="false" readonly></textarea><div class="nixx-raw-row" id="nixx-raw-card" hidden><span>RAW</span><code id="nixx-obf-raw-url"></code><button type="button" class="nixx-raw-open-inline" id="nixx-obf-open-raw-inline">Open</button></div>
        </div>
        <p class="nixx-obf-note">⚠️ Obfuscation bukan enkripsi absolut. Simpan backup source asli. Jangan upload source yang tidak kamu punya hak untuk memproses.</p>
      </div>`;

    if (anchor.tagName === "FOOTER") anchor.insertAdjacentElement("beforebegin", section);
    else anchor.insertAdjacentElement("afterend", section);

    const input = section.querySelector("#nixx-obf-input");
    const output = section.querySelector("#nixx-obf-output");
    const fileInput = section.querySelector("#nixx-obf-file");
    const run = section.querySelector("#nixx-obf-run");
    const status = section.querySelector("#nixx-obf-status");
    let filename = "source.lua";
    let lastOutput = "";
    let lastRawUrl = "";

    const size = (text) => {
      const n = new Blob([text]).size;
      return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
    };
    const updateStats = () => section.querySelector("#nixx-obf-input-size").textContent = size(input.value);
    const setStatus = (text, kind = "") => { status.className = `nixx-obf-status ${kind}`; status.textContent = text; };

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (file.size > MAX_BYTES) { setStatus("File maksimal 2 MB.", "error"); return; }
      filename = file.name || "source.lua";
      section.querySelector("#nixx-obf-file-name").textContent = filename;
      input.value = await file.text();
      updateStats();
      setStatus("File berhasil dimuat.", "success");
    });

    input.addEventListener("input", updateStats);
    section.querySelector("#nixx-obf-clear").addEventListener("click", () => { input.value = ""; output.value = ""; lastOutput = ""; lastRawUrl = ""; section.querySelector("#nixx-obf-output-wrap").hidden = true; section.querySelector("#nixx-obf-open-raw").hidden = true; section.querySelector("#nixx-obf-copy-raw").hidden = true; section.querySelector("#nixx-obf-raw-url").textContent = ""; section.querySelector("#nixx-raw-card").hidden = true; updateStats(); setStatus(""); });

    run.addEventListener("click", async () => {
      const source = input.value;
      if (!source.trim()) return setStatus("Masukkan atau upload source Lua terlebih dahulu.", "error");
      if (new Blob([source]).size > MAX_BYTES) return setStatus("Source maksimal 2 MB.", "error");
      const mode = section.querySelector('input[name="nixx-obf-mode"]:checked')?.value || "light";
      run.disabled = true;
      run.textContent = "⏳ Memproses...";
      setStatus("Mengobfuscate source Tunggu Sebentar...", "loading");

      try {
        const response = await fetch("/api/obfuscate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, source, mode })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok || !data.output) throw new Error(data.message || "Hercules gagal melakukan obfuscation.");

        lastOutput = data.output;
        output.value = lastOutput;
        section.querySelector("#nixx-obf-output-size").textContent = size(lastOutput);
        section.querySelector("#nixx-obf-output-wrap").hidden = false;
        lastRawUrl = data.rawUrl || "";
        const rawBtn = section.querySelector("#nixx-obf-copy-raw");
        const openRaw = section.querySelector("#nixx-obf-open-raw");
        const rawUrlLabel = section.querySelector("#nixx-obf-raw-url");
        rawBtn.hidden = !lastRawUrl;
        openRaw.hidden = !lastRawUrl;
        rawUrlLabel.textContent = lastRawUrl || "Raw Link belum tersedia";
        section.querySelector("#nixx-raw-card").hidden = !lastRawUrl;
        const telegramText = data.sent === false ? (data.warning || "Telegram belum menerima arsip.") : "Source asli diarsipkan ke Telegram.";
        setStatus(lastRawUrl ? `Hercules Luau selesai. ${telegramText}` : `Hercules Luau selesai. ${data.warning || "Raw Link belum dibuat."}`, lastRawUrl ? (data.sent === false ? "loading" : "success") : "success");
      } catch (error) {
        setStatus(error.message || "Terjadi kesalahan.", "error");
      } finally {
        run.disabled = false;
        run.textContent = "🔐 Obfuscate Source";
      }
    });

    section.querySelector("#nixx-obf-copy").addEventListener("click", async () => {
      if (!lastOutput) return;
      await navigator.clipboard.writeText(lastOutput);
      setStatus("Output berhasil dicopy.", "success");
    });

    section.querySelector("#nixx-obf-open-raw-inline").addEventListener("click", () => {
      if (!lastRawUrl) return;
      window.open(lastRawUrl, "_blank", "noopener,noreferrer");
    });

    section.querySelector("#nixx-obf-open-raw").addEventListener("click", () => {
      if (!lastRawUrl) return;
      window.open(lastRawUrl, "_blank", "noopener,noreferrer");
    });

    section.querySelector("#nixx-obf-copy-raw").addEventListener("click", async () => {
      if (!lastRawUrl) return;
      await navigator.clipboard.writeText(lastRawUrl);
      setStatus("Raw Link berhasil dicopy.", "success");
    });

    section.querySelector("#nixx-obf-download").addEventListener("click", () => {
      if (!lastOutput) return;
      const blob = new Blob([lastOutput], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nixx.lua";
      a.click();
      URL.revokeObjectURL(url);
    });

    updateStats();
    return true;
  }

  const init = () => insertSection();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
  new MutationObserver(init).observe(document.documentElement, { childList: true, subtree: true });
})();
