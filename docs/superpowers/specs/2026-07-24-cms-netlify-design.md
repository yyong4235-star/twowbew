# 官网后台与部署设计

日期：2026-07-24
项目：DJ ELECTRONICS 三语公司官网
路径：`/Users/a1-6/Documents/公司网站`

## 目标

为当前静态官网增加一个可登录的内容管理后台，并准备部署到互联网。

首版后台只做官网内容和图片管理，不做客户询盘数据库、不做订单系统、不做复杂权限系统。网站前台保持静态化，便于部署、访问速度快，也方便后续扩展。

## 选定方案

采用 `Decap CMS + Netlify`。

- 前台：继续作为静态官网部署。
- 后台：通过 `https://你的域名/admin/` 登录 Decap CMS。
- 登录：使用 Netlify Identity 或 Git Gateway。
- 数据：把当前硬编码在 `script.js` 里的公司信息、三语文案、图片路径拆成可编辑的数据文件。
- 图片：后台上传或替换图片，保存到站内媒体目录。
- 部署：Netlify 连接 Git 仓库，后台保存后触发重新部署。

## 范围

后台首版可管理以下内容。

### 公司与品牌信息

- 公司越南文全称
- 英文全称
- 英文简称
- 成立年份
- 地址
- 电话显示文本
- 电话链接
- 邮箱
- 头部 logo
- 首页首屏背景图
- 关于我们大图

### 首页内容

- 三语首页 eyebrow、标题、简介
- 首页按钮文字
- 核心能力 3 项
- 首页中段标题、说明
- 首页 3 个核心业务卡片：标题、描述、标签、图片
- 首页 CTA 横幅标题和说明

### 产品页

管理现有 6 个产品卡片：

- 标题
- 描述
- 应用场景
- 能力标签
- 图片

首版固定 6 个卡片，不做任意新增/删除。这样可以降低后台结构复杂度，并保证页面排版稳定。

### 制造能力页

管理现有 6 个制造能力卡片：

- 名称
- 描述
- 客户价值
- 图片

同时管理制造能力页上方 split 区块的标题、说明和图片。

### OEM/ODM 页

管理现有 3 个合作模式卡片：

- 模式名称
- 描述
- 适合客户
- 图片

同时管理合作流程 4 步的标题和说明。

### 关于我们页

- 页面标题、简介、公司说明
- 公司事实列表
- 关于我们大图

### 联系页

- 联系页标题、说明
- 电话、邮箱、地址展示标签
- 隐私政策入口文案

### 隐私政策

三语隐私政策内容可编辑：

- 标题
- 副标题
- 更新时间/生效时间
- 条款列表

## 不做范围

首版明确不做：

- 客户留言数据库
- 在线询盘表单管理
- 订单、支付、会员系统
- 多管理员权限分级
- 产品无限新增/删除
- 图片自动裁剪服务
- APP 版本发布后台
- 后端 API 服务

这些功能可以在网站上线稳定后作为第二阶段单独设计。

## 文件结构设计

建议新增：

```text
admin/
  index.html
  config.yml
content/
  site.json
  pages/
    vi.json
    en.json
    zh.json
  privacy/
    vi.json
    en.json
    zh.json
assets/
  cms/
    brand/
    home/
    products/
    manufacturing/
    oem/
```

### `admin/index.html`

加载 Decap CMS。

### `admin/config.yml`

定义后台登录方式、媒体目录、可编辑字段和三语内容集合。

### `content/site.json`

保存全站共享配置和品牌信息，包括公司信息、联系方式、logo、首页背景、关于我们大图，以及各页面图片路径。

### `content/pages/*.json`

保存三语页面文案。文件结构应尽量贴近当前 `copy.vi`、`copy.en`、`copy.zh` 对象，降低迁移风险。

### `content/privacy/*.json`

保存三语隐私政策内容。文件结构贴近当前 `privacyPolicies` 对象。

### `assets/cms/`

保存后台上传的图片。原有 `assets/brand/`、`assets/products/` 等站内稳定图片可以保留，但后续后台上传的新图进入 `assets/cms/`。

## 前台数据加载设计

当前网站直接在 `script.js` 中声明 `company`、`copy`、`privacyPolicies` 和图片数组。

改造后：

1. `script.js` 启动时异步读取：
   - `content/site.json`
   - `content/pages/vi.json`
   - `content/pages/en.json`
   - `content/pages/zh.json`
   - `content/privacy/vi.json`
   - `content/privacy/en.json`
   - `content/privacy/zh.json`
2. 数据加载成功后渲染页面。
3. 如果数据加载失败，页面展示一条简洁错误提示，避免空白页。
4. 页面结构继续使用当前 hash 路由：`#home`、`#products`、`#manufacturing`、`#oem`、`#about`、`#contact`、`#privacy`。

注意：如果用户直接用 `file://` 打开页面，浏览器可能限制 `fetch()` 读取本地 JSON。后台版建议以后用本地服务预览：

```bash
python3 -m http.server 4173
```

并通过 `http://localhost:4173/` 查看。

## Decap CMS 字段设计原则

- 所有长文本使用 `text` 或 `markdown` 字段。
- 图片字段使用 `image`。
- 固定数量卡片使用 `list`，设置为可编辑但不鼓励随意删减。
- 三语分别编辑，避免一个后台表单过长导致维护困难。
- 公司信息集中在 `site.json`，避免三语内容重复维护。
- 电话链接字段和电话显示字段分开，避免格式改变后链接不可用。

## 部署设计

### 推荐部署流程

1. 把项目推送到 GitHub 仓库。
2. Netlify 连接该仓库。
3. Netlify 构建设置：
   - Build command：空或不填。
   - Publish directory：项目根目录。
4. 配置 Netlify Identity。
5. 开启 Git Gateway。
6. 邀请管理员账号。
7. 访问 `https://你的域名/admin/` 登录后台。
8. 后台保存内容后，Netlify 自动提交内容改动并重新部署。

### 域名与隐私政策 URL

- 官网：`https://你的域名/`
- 后台：`https://你的域名/admin/`
- 隐私政策：`https://你的域名/#privacy`

后续 APP 上架时，隐私政策地址可以使用正式域名下的 `#privacy` 页面。

## 安全与维护

- 管理后台依赖 Netlify Identity/Git Gateway，不在项目中硬编码后台密码。
- 不提交 `.DS_Store`。
- 不把 `assets/incoming-*` 原始大图作为后台媒体目录。
- 后台上传图片统一进入 `assets/cms/`。
- 当前 incoming 原图仍按恢复节点里的图片安全流程处理，不直接打开大图。

## 测试计划

### 本地功能测试

- 通过本地服务打开首页。
- 确认 7 个路由都能渲染。
- 确认默认越南文。
- 切换 EN、中文后页面文案正常。
- 确认 logo、首页背景、产品图、制造图、OEM 图、关于图加载正常。
- 确认移动端无横向溢出。

### 后台测试

- 打开 `/admin/`。
- 确认 CMS 能加载配置。
- 修改公司电话或邮箱，保存后前台显示更新。
- 替换一张产品图，保存后前台显示更新。
- 修改中文 OEM 文案，保存后中文页面显示更新。

### 部署测试

- Netlify 部署成功。
- 线上首页可访问。
- 线上 `/admin/` 可打开。
- 管理员账号可登录。
- 后台保存内容后触发重新部署。
- 线上 `/#privacy` 可作为 APP 隐私政策 URL。

## 风险与处理

### `file://` 不能读取 JSON

改造后前台会使用 `fetch()` 读取内容文件。直接双击 HTML 或用 `file://` 打开可能失败。后续统一使用本地服务器或线上域名预览。

### 后台字段过多

三语内容较多，如果放在一个表单里会很长。因此设计为 `site.json`、三语页面内容、三语隐私政策分开编辑。

### 图片比例不统一

后台允许替换图片，但不做自动裁剪。前台继续通过 CSS 的 `object-fit: cover` 和固定比例保证卡片视觉稳定。上传图片前仍建议压缩到适合网页的尺寸。

### 当前工作区未提交改动

当前 `script.js`、`styles.css` 和 `docs/恢复节点.md` 仍有未提交改动。实施后台前应先确认这些优化效果是否保留，并建议提交一个基线，避免后台改造和 UI 优化混在一起难以回滚。

## 实施顺序建议

1. 先提交当前已确认的 UI 优化基线。
2. 新增内容 JSON 文件，把当前 `script.js` 数据迁移进去。
3. 改造前台读取 JSON 数据。
4. 新增 `admin/` 和 Decap CMS 配置。
5. 本地验证所有页面和后台配置。
6. 准备 GitHub/Netlify 部署说明。
7. 部署到 Netlify 并配置登录。
