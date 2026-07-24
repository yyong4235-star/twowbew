# CMS 后台与 Netlify 部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前 DJ ELECTRONICS 静态官网改造成可通过 Decap CMS 登录后台管理内容和图片，并准备部署到 Netlify。

**Architecture:** 前台继续使用现有 `index.html`、`script.js`、`styles.css` 的静态 hash 路由结构，但把公司信息、三语页面文案、隐私政策和图片路径迁移到 `content/*.json`。后台新增 `admin/index.html` 与 `admin/config.yml`，通过 Decap CMS 编辑 JSON 内容和上传图片；Netlify 负责静态托管、Identity 登录和 Git Gateway 保存内容改动。

**Tech Stack:** Static HTML/CSS/JavaScript, JSON content files, Decap CMS, Netlify Identity, Netlify Git Gateway, Playwright verification through bundled Node runtime.

## Global Constraints

- 首版后台只做官网内容和图片管理，不做客户询盘数据库、不做订单系统、不做复杂权限系统。
- 不提交 `.DS_Store`。
- 不把 `assets/incoming-*` 原始大图作为后台媒体目录。
- 后台上传图片统一进入 `assets/cms/`。
- 当前 incoming 原图仍按恢复节点里的图片安全流程处理，不直接打开大图。
- 页面结构继续使用当前 hash 路由：`#home`、`#products`、`#manufacturing`、`#oem`、`#about`、`#contact`、`#privacy`。
- 后台版建议以后用本地服务或线上域名预览，不再依赖 `file://`。
- 产品页首版固定 6 个卡片，不做任意新增/删除。
- 制造能力页首版固定 6 个卡片，不做任意新增/删除。
- OEM/ODM 页首版固定 3 个卡片，不做任意新增/删除。

---

## File Structure

**Existing files to modify**

- `script.js`：删除硬编码内容对象，改为异步读取 JSON；保留渲染函数和 hash 路由；新增加载失败提示。
- `styles.css`：只在需要时增加 `.loading-state`、`.error-state` 等少量状态样式，不能回退已完成的 UI 优化。
- `docs/恢复节点.md`：更新后台与部署恢复节点。

**New files to create**

- `content/site.json`：全站公司信息、品牌图、页面图路径。
- `content/pages/vi.json`：越南文页面文案。
- `content/pages/en.json`：英文页面文案。
- `content/pages/zh.json`：中文页面文案。
- `content/privacy/vi.json`：越南文隐私政策。
- `content/privacy/en.json`：英文隐私政策。
- `content/privacy/zh.json`：中文隐私政策。
- `admin/index.html`：Decap CMS 后台入口。
- `admin/config.yml`：Decap CMS 配置。
- `assets/cms/.gitkeep`：确保后台媒体目录存在。
- `docs/部署说明.md`：Netlify 部署与后台登录配置说明。

---

### Task 1: Commit Current UI Baseline

**Files:**
- Modify: no code changes required unless verification exposes a blocker.
- Stage: `script.js`, `styles.css`, `docs/恢复节点.md`
- Do not stage: `.DS_Store`, `assets/incoming-*` files.

**Interfaces:**
- Consumes: existing UI optimization state in `script.js`, `styles.css`, `docs/恢复节点.md`.
- Produces: clean baseline commit before CMS migration.

- [ ] **Step 1: Inspect working tree**

Run:

```bash
git status --short --branch
git diff --stat
git diff -- script.js styles.css docs/恢复节点.md | sed -n '1,260p'
```

Expected:

- `script.js`, `styles.css`, `docs/恢复节点.md` are modified.
- `.DS_Store` and `assets/incoming-*` remain untracked.
- Diff contains UI optimization, route marker fix, and recovery node updates.

- [ ] **Step 2: Verify current frontend baseline**

Run:

```bash
git diff --check
/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check script.js
```

Expected:

- Both commands exit `0`.
- No output from `git diff --check`.
- No syntax errors from Node.

- [ ] **Step 3: Run browser smoke test**

Start a clean local server if needed:

```bash
python3 -m http.server 4188
```

In another terminal, run:

```bash
/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node - <<'NODE'
const { chromium } = require('/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const routes = ['home', 'products', 'manufacturing', 'oem', 'about', 'contact', 'privacy'];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  const results = [];
  for (const route of routes) {
    await page.goto(`http://localhost:4188/index.html#${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    results.push(await page.evaluate(() => ({
      route: document.body.dataset.currentRoute,
      failedImages: [...document.images].filter(img => !img.complete || !img.naturalWidth).length,
      noOverflow: document.documentElement.scrollWidth === document.documentElement.clientWidth,
      hasHeader: Boolean(document.querySelector('.site-header')),
      hasFooter: Boolean(document.querySelector('#site-footer')),
    })));
  }
  console.log(JSON.stringify({ results, errors }, null, 2));
  await browser.close();
})();
NODE
```

Expected:

- Every result has `failedImages: 0`.
- Every result has `noOverflow: true`.
- Every result has `hasHeader: true` and `hasFooter: true`.
- `errors` is an empty array.

- [ ] **Step 4: Commit baseline only**

Run:

```bash
git add script.js styles.css docs/恢复节点.md
git commit -m "style: polish site visual system"
```

Expected:

- Commit succeeds.
- Untracked incoming images and `.DS_Store` remain unstaged.

---

### Task 2: Extract Website Content Into JSON Files

**Files:**
- Create: `content/site.json`
- Create: `content/pages/vi.json`
- Create: `content/pages/en.json`
- Create: `content/pages/zh.json`
- Create: `content/privacy/vi.json`
- Create: `content/privacy/en.json`
- Create: `content/privacy/zh.json`
- Create: `assets/cms/.gitkeep`
- Modify: no runtime code yet.

**Interfaces:**
- Consumes: current `company`, `copy`, `privacyPolicies`, `homeImages`, `productImages`, `manufacturingImages`, `oemImages` values from `script.js`.
- Produces: JSON files with these exact top-level shapes:
  - `site.json`: `{ "company": object, "assets": object }`
  - `pages/<lang>.json`: the current `copy[lang]` object.
  - `privacy/<lang>.json`: the current `privacyPolicies[lang]` object.

- [ ] **Step 1: Create content directories**

Run:

```bash
mkdir -p content/pages content/privacy assets/cms
```

Expected:

- Directories exist.

- [ ] **Step 2: Create `content/site.json`**

Create this file with the current company data and image paths:

```json
{
  "company": {
    "legalNameVi": "CÔNG TY TNHH THIẾT BỊ ĐIỆN TỬ DJ",
    "legalNameEn": "DJ ELECTRONIC EQUIPMENT COMPANY LIMITED",
    "shortName": "DJ ELECTRONICS CO., LTD",
    "foundedYear": "2019",
    "address": "Số nhà 083, phố Tuệ Tĩnh, tổ 10 Kim Tân, Phường Lào Cai, Tỉnh Lào Cai, Việt Nam",
    "phone": "+84 963 162 922",
    "phoneHref": "+84963162922",
    "email": "congtytnhhthietbidientudj@gmail.com"
  },
  "assets": {
    "logo": "./assets/brand/logo.png",
    "heroBackground": "./assets/brand/hero-logo-bg.png",
    "homeSolutionsBackground": "./assets/home-solutions-bg.png",
    "aboutMain": "./assets/brand/about-main.jpg",
    "manufacturingSplit": "https://images.unsplash.com/photo-1562408590-e32931084e23?auto=format&fit=crop&w=1200&q=82",
    "oemSplit": "https://images.unsplash.com/photo-1581093806997-124204d9fa9d?auto=format&fit=crop&w=1200&q=82",
    "contactBand": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80",
    "homeImages": [
      "./assets/home/home-01.jpg",
      "./assets/home/home-02.jpg",
      "./assets/home/home-03.jpg"
    ],
    "productImages": [
      "./assets/products/product-01.jpg",
      "./assets/products/product-02.jpg",
      "./assets/products/product-03.jpg",
      "./assets/products/product-04.jpg",
      "./assets/products/product-05.jpg",
      "./assets/products/product-06.jpg"
    ],
    "manufacturingImages": [
      "./assets/manufacturing/manufacturing-01.jpg",
      "./assets/manufacturing/manufacturing-02.jpg",
      "./assets/manufacturing/manufacturing-03.jpg",
      "./assets/manufacturing/manufacturing-04.jpg",
      "./assets/manufacturing/manufacturing-05.jpg",
      "./assets/manufacturing/manufacturing-06.jpg"
    ],
    "oemImages": [
      "./assets/oem/oem-01.jpg",
      "./assets/oem/oem-02.jpg",
      "./assets/oem/oem-03.jpg"
    ]
  }
}
```

- [ ] **Step 3: Generate page and privacy JSON from current JS data**

Use a temporary extraction script in the shell, not committed, to evaluate the static data safely and write JSON. The script must not read image bytes.

Run:

```bash
/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node - <<'NODE'
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('script.js', 'utf8');
const end = source.indexOf('let state =');
const dataSource = source.slice(0, end) + '\nthis.copy = copy; this.privacyPolicies = privacyPolicies;';
const sandbox = { localStorage: { getItem: () => null }, window: { location: { hash: '' } } };
vm.createContext(sandbox);
vm.runInContext(dataSource, sandbox);
fs.mkdirSync('content/pages', { recursive: true });
fs.mkdirSync('content/privacy', { recursive: true });
for (const lang of ['vi', 'en', 'zh']) {
  fs.writeFileSync(`content/pages/${lang}.json`, JSON.stringify(sandbox.copy[lang], null, 2) + '\n');
  fs.writeFileSync(`content/privacy/${lang}.json`, JSON.stringify(sandbox.privacyPolicies[lang], null, 2) + '\n');
}
NODE
```

Expected:

- Six JSON files are created.
- Files contain valid JSON.

- [ ] **Step 4: Keep CMS media directory in git**

Run:

```bash
touch assets/cms/.gitkeep
```

Expected:

- `assets/cms/.gitkeep` exists.

- [ ] **Step 5: Validate JSON**

Run:

```bash
/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node - <<'NODE'
const fs = require('fs');
const files = [
  'content/site.json',
  'content/pages/vi.json',
  'content/pages/en.json',
  'content/pages/zh.json',
  'content/privacy/vi.json',
  'content/privacy/en.json',
  'content/privacy/zh.json',
];
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(file, Object.keys(data).join(','));
}
NODE
```

Expected:

- Command exits `0`.
- `content/site.json` prints `company,assets`.
- Page files print keys including `metaTitle,nav,cta,home,products,manufacturing,oem,about,contact`.
- Privacy files print `title,subtitle,updated,sections`.

- [ ] **Step 6: Commit extracted content files**

Run:

```bash
git add content/site.json content/pages content/privacy assets/cms/.gitkeep
git commit -m "feat: extract site content to json"
```

Expected:

- Commit succeeds.
- No incoming original image files are staged.

---

### Task 3: Refactor Frontend To Load JSON Content

**Files:**
- Modify: `script.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes:
  - `content/site.json`
  - `content/pages/{vi,en,zh}.json`
  - `content/privacy/{vi,en,zh}.json`
- Produces:
  - Runtime variables `siteConfig`, `company`, `copy`, `privacyPolicies` populated from JSON.
  - Function `loadContent(): Promise<void>`.
  - Function `init(): Promise<void>`.

- [ ] **Step 1: Add loading and error state styles**

Append to `styles.css` before media queries if possible:

```css
.loading-state,
.error-state {
  display: grid;
  min-height: calc(100dvh - 160px);
  place-items: center;
  padding: clamp(40px, 8vw, 90px) clamp(18px, 4vw, 56px);
  background: linear-gradient(180deg, #f8fbfd, #eef6f8);
  color: var(--ink);
  text-align: center;
}

.loading-state div,
.error-state div {
  max-width: 680px;
  padding: clamp(22px, 4vw, 36px);
  border: 1px solid rgba(96, 198, 220, 0.24);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--shadow-soft);
}

.error-state p,
.loading-state p {
  margin: 8px 0 0;
  color: var(--muted);
}
```

- [ ] **Step 2: Replace hardcoded data declarations with runtime variables**

At the top of `script.js`, replace `const company = ...`, image arrays, `copy`, and `privacyPolicies` declarations with:

```js
let siteConfig = null;
let company = null;
let copy = null;
let privacyPolicies = null;

const routes = ["home", "products", "manufacturing", "oem", "about", "contact", "privacy"];
const languages = ["vi", "en", "zh"];
```

Keep all render functions below, but remove old duplicated constants.

- [ ] **Step 3: Add content loading helpers**

Add after `normalizeRoute()`:

```js
async function loadJson(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function loadContent() {
  const [site, vi, en, zh, privacyVi, privacyEn, privacyZh] = await Promise.all([
    loadJson("./content/site.json"),
    loadJson("./content/pages/vi.json"),
    loadJson("./content/pages/en.json"),
    loadJson("./content/pages/zh.json"),
    loadJson("./content/privacy/vi.json"),
    loadJson("./content/privacy/en.json"),
    loadJson("./content/privacy/zh.json"),
  ]);

  siteConfig = site;
  company = site.company;
  copy = { vi, en, zh };
  privacyPolicies = { vi: privacyVi, en: privacyEn, zh: privacyZh };
}

function getImages(key) {
  return siteConfig?.assets?.[key] || [];
}

function getAsset(key) {
  return siteConfig?.assets?.[key] || "";
}
```

- [ ] **Step 4: Update image consumers**

Change `card()` default and image use:

```js
function card(item, index, images = getImages("productImages")) {
  const imageSet = Array.isArray(images) && typeof images[0] === "string" ? images : getImages("productImages");
  const image = imageSet[index % imageSet.length];
```

Change render calls:

```js
card(item, index, getImages("homeImages"))
card(item, index, getImages("manufacturingImages"))
card(item, index, getImages("oemImages"))
```

Keep product page as `.map(card)` only if `card()` default reads `getImages("productImages")`.

- [ ] **Step 5: Update background image consumers**

Replace hardcoded split/background image strings in render functions:

```js
<div class="split-media" style="background-image:url('${getAsset("manufacturingSplit")}')"></div>
<div class="split-media" style="background-image:url('${getAsset("oemSplit")}')"></div>
<div class="split-media" style="background-image:url('${getAsset("aboutMain")}')"></div>
```

Update `renderContactBand()` opening `.contact-band` div:

```js
<div class="contact-band" style="background-image:linear-gradient(135deg, rgba(6, 31, 47, 0.94), rgba(17, 107, 126, 0.82), rgba(48, 166, 121, 0.76)), url('${getAsset("contactBand")}')">
```

Do not remove the CSS default background; inline style simply allows CMS replacement.

- [ ] **Step 6: Update header logo and hero background**

In `index.html`, keep the existing logo `img` element.

In `render()`, after setting document title, add:

```js
const logo = document.querySelector(".brand-mark img");
if (logo && getAsset("logo")) {
  logo.src = getAsset("logo");
}
```

In `renderHome(data)`, update `<section class="hero">` to:

```js
<section class="hero" style="--hero-bg:url('${getAsset("heroBackground")}')">
```

In `styles.css`, change the hero background image layer from:

```css
url("./assets/brand/hero-logo-bg.png") center / cover;
```

to:

```css
var(--hero-bg, url("./assets/brand/hero-logo-bg.png")) center / cover;
```

- [ ] **Step 7: Add startup flow and error rendering**

Replace bottom startup logic with:

```js
function renderLoading() {
  document.querySelector("#app").innerHTML = `
    <section class="loading-state">
      <div>
        <h1>Loading website content</h1>
        <p>Please wait while the site content is loaded.</p>
      </div>
    </section>
  `;
}

function renderError(error) {
  document.querySelector("#app").innerHTML = `
    <section class="error-state">
      <div>
        <h1>Website content could not be loaded</h1>
        <p>${error.message}</p>
      </div>
    </section>
  `;
}

async function init() {
  renderLoading();
  try {
    await loadContent();
    if (!window.location.hash) {
      window.location.hash = "home";
      return;
    }
    render();
  } catch (error) {
    console.error(error);
    renderError(error);
  }
}

init();
```

Keep event listeners, but ensure no listener calls `render()` before `loadContent()` completes. If needed, guard language and hash handlers:

```js
if (!copy) return;
```

- [ ] **Step 8: Verify JS syntax and JSON loading**

Run:

```bash
/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check script.js
git diff --check
```

Expected:

- Both exit `0`.

- [ ] **Step 9: Run browser regression test**

Run local server and Playwright:

```bash
python3 -m http.server 4188
```

```bash
/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node - <<'NODE'
const { chromium } = require('/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const routes = ['home', 'products', 'manufacturing', 'oem', 'about', 'contact', 'privacy'];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  const results = [];
  for (const route of routes) {
    await page.goto(`http://localhost:4188/index.html#${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    results.push(await page.evaluate(() => ({
      route: document.body.dataset.currentRoute,
      title: document.title,
      failedImages: [...document.images].filter(img => !img.complete || !img.naturalWidth).length,
      noOverflow: document.documentElement.scrollWidth === document.documentElement.clientWidth,
      hasHeader: Boolean(document.querySelector('.site-header')),
      hasFooter: Boolean(document.querySelector('#site-footer')),
      hasCards: document.querySelectorAll('.card').length,
    })));
  }
  await page.goto('http://localhost:4188/index.html#home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.click('.menu-toggle');
  await page.click('[data-lang="zh"]');
  const lang = await page.evaluate(() => ({ lang: document.documentElement.lang, nav: [...document.querySelectorAll('.main-nav a')].map(a => a.textContent) }));
  console.log(JSON.stringify({ results, lang, errors }, null, 2));
  await browser.close();
})();
NODE
```

Expected:

- All `failedImages` are `0`.
- All `noOverflow` are `true`.
- `lang.lang` is `zh-CN`.
- `errors` is empty or only contains intentionally tested network failures. For normal success, it should be empty.

- [ ] **Step 10: Commit frontend JSON loader**

Run:

```bash
git add script.js styles.css
git commit -m "feat: load site content from json"
```

Expected:

- Commit succeeds.

---

### Task 4: Add Decap CMS Admin

**Files:**
- Create: `admin/index.html`
- Create: `admin/config.yml`

**Interfaces:**
- Consumes:
  - `content/site.json`
  - `content/pages/*.json`
  - `content/privacy/*.json`
  - `assets/cms/` media folder
- Produces:
  - `/admin/` Decap CMS entrypoint.
  - CMS collections for site settings, page content, privacy policy.

- [ ] **Step 1: Create `admin/index.html`**

Create:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>DJ ELECTRONICS Admin</title>
  </head>
  <body>
    <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
    <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Create base `admin/config.yml`**

Create:

```yaml
backend:
  name: git-gateway
  branch: main

local_backend: true

media_folder: "assets/cms"
public_folder: "/assets/cms"

publish_mode: simple

collections:
  - name: "settings"
    label: "Site Settings"
    files:
      - label: "Company and Assets"
        name: "site"
        file: "content/site.json"
        format: "json"
        fields:
          - label: "Company"
            name: "company"
            widget: "object"
            fields:
              - { label: "Vietnamese Legal Name", name: "legalNameVi", widget: "string" }
              - { label: "English Legal Name", name: "legalNameEn", widget: "string" }
              - { label: "Short Name", name: "shortName", widget: "string" }
              - { label: "Founded Year", name: "foundedYear", widget: "string" }
              - { label: "Address", name: "address", widget: "text" }
              - { label: "Phone Display", name: "phone", widget: "string" }
              - { label: "Phone Link", name: "phoneHref", widget: "string" }
              - { label: "Email", name: "email", widget: "string" }
          - label: "Assets"
            name: "assets"
            widget: "object"
            fields:
              - { label: "Logo", name: "logo", widget: "image" }
              - { label: "Hero Background", name: "heroBackground", widget: "image" }
              - { label: "Home Solutions Background", name: "homeSolutionsBackground", widget: "image" }
              - { label: "About Main Image", name: "aboutMain", widget: "image" }
              - { label: "Manufacturing Split Image", name: "manufacturingSplit", widget: "string" }
              - { label: "OEM Split Image", name: "oemSplit", widget: "string" }
              - { label: "Contact Band Image", name: "contactBand", widget: "string" }
              - label: "Home Images"
                name: "homeImages"
                widget: "list"
                fields:
                  - { label: "Image", name: "image", widget: "image" }
              - label: "Product Images"
                name: "productImages"
                widget: "list"
                fields:
                  - { label: "Image", name: "image", widget: "image" }
              - label: "Manufacturing Images"
                name: "manufacturingImages"
                widget: "list"
                fields:
                  - { label: "Image", name: "image", widget: "image" }
              - label: "OEM Images"
                name: "oemImages"
                widget: "list"
                fields:
                  - { label: "Image", name: "image", widget: "image" }
```

Then adjust either the JSON or CMS fields so list image arrays are represented consistently. Recommended implementation: keep JSON arrays as strings and use a Decap list field with `field: { label: "Image", name: "", widget: "image" }` only if Decap supports scalar lists in the tested version. If scalar list editing is unreliable, use object arrays and update `getImages()` to normalize both strings and `{ image }` objects:

```js
function getImages(key) {
  const images = siteConfig?.assets?.[key] || [];
  return images.map((item) => (typeof item === "string" ? item : item.image)).filter(Boolean);
}
```

- [ ] **Step 3: Add page collections**

Append to `collections`:

```yaml
  - name: "pages"
    label: "Page Content"
    files:
      - label: "Vietnamese Pages"
        name: "vi"
        file: "content/pages/vi.json"
        format: "json"
        fields: &page_fields
          - { label: "Meta Title", name: "metaTitle", widget: "string" }
          - label: "Navigation"
            name: "nav"
            widget: "object"
            fields:
              - { label: "Home", name: "home", widget: "string" }
              - { label: "Products", name: "products", widget: "string" }
              - { label: "Manufacturing", name: "manufacturing", widget: "string" }
              - { label: "OEM/ODM", name: "oem", widget: "string" }
              - { label: "About", name: "about", widget: "string" }
              - { label: "Contact", name: "contact", widget: "string" }
          - label: "CTA"
            name: "cta"
            widget: "object"
            fields:
              - { label: "Contact", name: "contact", widget: "string" }
              - { label: "Email", name: "email", widget: "string" }
              - { label: "Call", name: "call", widget: "string" }
              - { label: "Products", name: "products", widget: "string" }
          - { label: "Home", name: "home", widget: "object", collapsed: true, fields: [{ label: "Raw JSON", name: "raw", widget: "hidden", required: false }] }
          - { label: "Products", name: "products", widget: "object", collapsed: true, fields: [{ label: "Raw JSON", name: "raw", widget: "hidden", required: false }] }
          - { label: "Manufacturing", name: "manufacturing", widget: "object", collapsed: true, fields: [{ label: "Raw JSON", name: "raw", widget: "hidden", required: false }] }
          - { label: "OEM/ODM", name: "oem", widget: "object", collapsed: true, fields: [{ label: "Raw JSON", name: "raw", widget: "hidden", required: false }] }
          - { label: "About", name: "about", widget: "object", collapsed: true, fields: [{ label: "Raw JSON", name: "raw", widget: "hidden", required: false }] }
          - { label: "Contact", name: "contact", widget: "object", collapsed: true, fields: [{ label: "Raw JSON", name: "raw", widget: "hidden", required: false }] }
      - label: "English Pages"
        name: "en"
        file: "content/pages/en.json"
        format: "json"
        fields: *page_fields
      - label: "Chinese Pages"
        name: "zh"
        file: "content/pages/zh.json"
        format: "json"
        fields: *page_fields
```

Important implementation note: the hidden raw JSON object fields above are a planning shortcut and must be replaced during implementation with real nested Decap fields for `home`, `products`, `manufacturing`, `oem`, `about`, and `contact`. Use the JSON shapes from `content/pages/vi.json` as the source of truth. Do not ship hidden placeholders that prevent editing.

- [ ] **Step 4: Add real nested fields for page content**

Replace the placeholder page object fields with explicit fields:

- `home`: `eyebrow`, `title`, `intro`, `panelTitle`, `metrics` list of `label/text`, `sectionsTitle`, `sectionsIntro`, `highlights` list of `title/text/tags`, `bandTitle`, `bandText`.
- `products`: `eyebrow`, `title`, `intro`, `items` list of `title/description/applications/capabilities`.
- `manufacturing`: `eyebrow`, `title`, `intro`, `splitTitle`, `splitText`, `capabilities` list of `name/description/customerValue`.
- `oem`: `eyebrow`, `title`, `intro`, `modes` list of `mode/description/bestFor`, `processTitle`, `process` list of `title/text`.
- `about`: `eyebrow`, `title`, `intro`, `body`, `facts` list of `label/value`.
- `contact`: `eyebrow`, `title`, `intro`, `details.phone`, `details.email`, `details.address`, `privacyLabel`, `privacyText`.

- [ ] **Step 5: Add privacy collections**

Append:

```yaml
  - name: "privacy"
    label: "Privacy Policy"
    files:
      - label: "Vietnamese Privacy"
        name: "privacy_vi"
        file: "content/privacy/vi.json"
        format: "json"
        fields: &privacy_fields
          - { label: "Title", name: "title", widget: "string" }
          - { label: "Subtitle", name: "subtitle", widget: "text" }
          - { label: "Updated", name: "updated", widget: "string" }
          - label: "Sections"
            name: "sections"
            widget: "list"
            fields:
              - { label: "Title", name: "title", widget: "string" }
              - { label: "Text", name: "text", widget: "text" }
      - label: "English Privacy"
        name: "privacy_en"
        file: "content/privacy/en.json"
        format: "json"
        fields: *privacy_fields
      - label: "Chinese Privacy"
        name: "privacy_zh"
        file: "content/privacy/zh.json"
        format: "json"
        fields: *privacy_fields
```

If current privacy JSON uses arrays like `[title, text]`, either convert privacy sections to object shape `{ "title": "...", "text": "..." }` and update `renderPrivacy()`, or configure Decap to preserve list item objects. Recommended: convert to object shape for CMS readability.

- [ ] **Step 6: Verify CMS files parse**

Run:

```bash
ruby -e "require 'yaml'; YAML.load_file('admin/config.yml'); puts 'config ok'"
```

Expected:

- Prints `config ok`.

If Ruby is unavailable, use Python:

```bash
python3 - <<'PY'
import yaml
with open('admin/config.yml', 'r', encoding='utf-8') as f:
    yaml.safe_load(f)
print('config ok')
PY
```

- [ ] **Step 7: Verify `/admin/` loads basic shell**

Run local server and check:

```bash
python3 -m http.server 4188
```

```bash
/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node - <<'NODE'
const { chromium } = require('/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('http://localhost:4188/admin/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  console.log(JSON.stringify({ title: await page.title(), errors }, null, 2));
  await browser.close();
})();
NODE
```

Expected:

- Title is `DJ ELECTRONICS Admin`.
- No local HTML parse errors. Network errors from external CDN may occur if offline; note them but do not treat them as project syntax failures.

- [ ] **Step 8: Commit CMS admin**

Run:

```bash
git add admin/index.html admin/config.yml
git commit -m "feat: add decap cms admin"
```

Expected:

- Commit succeeds.

---

### Task 5: Add Deployment Documentation And Final Verification

**Files:**
- Create: `docs/部署说明.md`
- Modify: `docs/恢复节点.md`

**Interfaces:**
- Consumes: completed CMS files and JSON loader.
- Produces: deployment instructions the site owner can follow.

- [ ] **Step 1: Create `docs/部署说明.md`**

Create a Simplified Chinese deployment document with these sections:

```markdown
# 部署说明

## 部署目标

- 官网：`https://你的域名/`
- 后台：`https://你的域名/admin/`
- 隐私政策：`https://你的域名/#privacy`

## GitHub 准备

1. 创建 GitHub 仓库。
2. 推送当前项目代码。
3. 不提交 `.DS_Store` 和 `assets/incoming-*` 原图。

## Netlify 部署

1. 登录 Netlify。
2. Add new site -> Import an existing project。
3. 选择 GitHub 仓库。
4. Build command 留空。
5. Publish directory 填项目根目录或留空使用根目录。
6. Deploy site。

## Netlify Identity 和 Git Gateway

1. Site configuration -> Identity -> Enable Identity。
2. Registration 设为 Invite only。
3. Services -> Git Gateway -> Enable Git Gateway。
4. 邀请管理员邮箱。
5. 管理员接受邀请并设置密码。
6. 打开 `/admin/` 登录后台。

## 后台使用

- Company and Assets：修改公司信息、联系方式、logo 和图片。
- Page Content：修改越南文、英文、中文页面文案。
- Privacy Policy：修改三语隐私政策。

## 上线后检查

- 首页能打开。
- `/admin/` 能打开。
- 后台能登录。
- 修改电话或邮箱后，保存并等待 Netlify 重新部署。
- `/#privacy` 能打开并显示隐私政策。
```

- [ ] **Step 2: Update recovery node**

Append to `docs/恢复节点.md`:

```markdown
## CMS 后台与部署状态

- 已选择 `Decap CMS + Netlify` 方案。
- 后台入口：`/admin/`。
- 内容文件位于 `content/`。
- 后台媒体目录：`assets/cms/`。
- 部署说明位于 `docs/部署说明.md`。
- 后台版需要通过本地服务器或线上域名预览，不建议继续使用 `file://`。
```

- [ ] **Step 3: Run final static checks**

Run:

```bash
git diff --check
/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check script.js
/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node - <<'NODE'
const fs = require('fs');
const files = [
  'content/site.json',
  'content/pages/vi.json',
  'content/pages/en.json',
  'content/pages/zh.json',
  'content/privacy/vi.json',
  'content/privacy/en.json',
  'content/privacy/zh.json',
];
for (const file of files) JSON.parse(fs.readFileSync(file, 'utf8'));
console.log('json ok');
NODE
```

Expected:

- All commands exit `0`.
- JSON command prints `json ok`.

- [ ] **Step 4: Run final browser verification**

Run:

```bash
python3 -m http.server 4188
```

Then:

```bash
/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node - <<'NODE'
const { chromium } = require('/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const routes = ['home', 'products', 'manufacturing', 'oem', 'about', 'contact', 'privacy'];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  for (const viewport of [{ width: 1280, height: 820 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));
    for (const route of routes) {
      await page.goto(`http://localhost:4188/index.html#${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      report.push(await page.evaluate(() => ({
        route: document.body.dataset.currentRoute,
        failedImages: [...document.images].filter(img => !img.complete || !img.naturalWidth).length,
        noOverflow: document.documentElement.scrollWidth === document.documentElement.clientWidth,
        hasHeader: Boolean(document.querySelector('.site-header')),
        hasFooter: Boolean(document.querySelector('#site-footer')),
      })));
    }
    if (errors.length) report.push({ errors });
    await page.close();
  }
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})();
NODE
```

Expected:

- All routes render.
- All `failedImages` are `0`.
- All `noOverflow` are `true`.
- No console or page errors.

- [ ] **Step 5: Commit docs and recovery updates**

Run:

```bash
git add docs/部署说明.md docs/恢复节点.md
git commit -m "docs: add netlify deployment guide"
```

Expected:

- Commit succeeds.

- [ ] **Step 6: Final status report**

Run:

```bash
git status --short --branch
git log --oneline -5
```

Expected:

- Only ignored/untracked incoming raw images and `.DS_Store` remain, unless they have been intentionally cleaned or ignored.
- Recent commits include CMS design, UI baseline, content extraction, JSON loader, Decap admin, and deployment guide.

---

## Self-Review

Spec coverage:

- Decap CMS admin: Task 4.
- Netlify deployment path: Task 5.
- JSON content extraction: Task 2.
- Frontend JSON loading: Task 3.
- Company info, logo, images, page text, privacy content: Task 2 data files plus Task 4 CMS collections.
- Do not submit incoming raw images: Global Constraints and every commit task.
- Local/online preview instead of `file://`: Task 3 and deployment docs.

Known implementation caution:

- `admin/config.yml` page field definitions are lengthy. During implementation, do not ship placeholder hidden fields; replace them with explicit nested fields as required by Task 4 Step 4.
- If Decap scalar image lists are unreliable, normalize image arrays in `getImages()` to support both strings and `{ image }` objects.
- Current UI baseline must be committed before CMS migration to keep rollback clean.
