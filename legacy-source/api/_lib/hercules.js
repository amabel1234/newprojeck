import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lua, lauxlib, lualib, to_luastring, to_jsstring } from "fengari";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../hercules-src");
let bundleCache;

function collectLuaFiles(dir, prefix = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...collectLuaFiles(full, key));
    else if (entry.name.endsWith(".lua")) out.push({ full, key: key.slice(0, -4) });
  }
  return out;
}

function luaQuote(s) {
  return JSON.stringify(String(s));
}

function buildBundle() {
  if (bundleCache) return bundleCache;
  const files = collectLuaFiles(ROOT);
  const lines = [];
  for (const file of files) {
    let name = file.key;
    if (name === "hercules") continue;
    const code = fs.readFileSync(file.full, "utf8");
    const names = new Set([name]);
    if (name.includes("/")) names.add(name.replaceAll("/", "."));
    for (const n of names) {
      lines.push(`package.preload[${luaQuote(n)}] = function(...)\n${code}\nend`);
    }
  }
  lines.push(`
local manifest = require("manifest")
local config = require("config")
local Pipeline = require("pipeline")
config.set("target", "luau")
for _, method in ipairs(manifest.modules) do
    config.set("settings." .. method.config_key .. ".enabled", false)
end
local preset = tostring(__NIXX_MODE or "heavy")
if preset == "strong" then preset = "heavy" end
if preset == "extreme" then preset = "maximum" end
if preset == "medium" then preset = "balanced" end
if preset == "clean" then preset = "light" end
local found = false
for _, item in ipairs(manifest.presets) do
    if item.key == preset then
        found = true
        for _, key in ipairs(item.methods) do
            for _, method in ipairs(manifest.modules) do
                if method.key == key then
                    config.set("settings." .. method.config_key .. ".enabled", true)
                end
            end
        end
    end
end
if not found then error("Unknown Hercules preset: " .. preset) end
config.set("settings.watermark_enabled", true)
config.set("settings.watermark_text", "--[[ NIXX OBFUSCATOR | https://nixcooll.biz.id/ ]]\\n")
local output = Pipeline.process(__NIXX_SOURCE or "")
return output
`);
  bundleCache = lines.join("\n\n");
  return bundleCache;
}

export function obfuscateLuau(source, mode = "strong") {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  const bundle = buildBundle();
  lua.lua_pushstring(L, to_luastring(source));
  lua.lua_setglobal(L, to_luastring("__NIXX_SOURCE"));
  lua.lua_pushstring(L, to_luastring(mode));
  lua.lua_setglobal(L, to_luastring("__NIXX_MODE"));
  const status = lauxlib.luaL_loadstring(L, to_luastring(bundle));
  if (status !== lua.LUA_OK) {
    const err = to_jsstring(lua.lua_tostring(L, -1));
    lua.lua_close(L);
    throw new Error(`Hercules compile error: ${err}`);
  }
  const run = lua.lua_pcall(L, 0, 1, 0);
  if (run !== lua.LUA_OK) {
    const err = to_jsstring(lua.lua_tostring(L, -1));
    lua.lua_close(L);
    throw new Error(`Hercules runtime error: ${err}`);
  }
  const result = to_jsstring(lua.lua_tostring(L, -1));
  lua.lua_close(L);
  if (!result) throw new Error("Hercules menghasilkan output kosong.");
  return result;
}
