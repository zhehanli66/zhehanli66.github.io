# zhehanli66.github.io

个人主页。主页使用 [al-folio](https://github.com/alshedivat/al-folio) 主题，
每个项目有自己的独立页面（`/NeuRIO/`、`/CREPES-X/` …），使用
[Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template)（nerfies 风格）。

---

## 1. 目录结构

```
_config.yml              al-folio 全站配置（姓名、URL、开关等）
_pages/about.md          唯一的一页：自我介绍 + 项目列表（分区配置也写在它的 front matter 里）
_projects/*.md           项目条目（标题、论文名、作者、发表/状态、简介、配图、链接）
_news/*.md               旧的 News 条目，已关掉不显示（见第 4 节）
_data/socials.yml        邮箱、Google Scholar、GitHub —— 图标现在手写在 about.md 的 more_info 里
assets/lang/             主页侧的 EN / 中文 切换（lang.css + lang.js）
assets/site/site.css     项目列表的横栏样式、头像下的社交图标
_bibliography/papers.bib 论文库（目前是空的，见第 5 节）
assets/img/prof_pic.png  头像
assets/img/projects/     项目配图（现在是自动生成的占位图）

NeuRIO/index.html            ┐
CREPES-X/index.html          │  5 个独立项目页，纯静态 HTML，
CT-RIO/index.html            ├─ Jekyll 原样拷贝，不走模板系统，
AIOG/index.html              │  想怎么改就怎么改
ColAG/index.html             ┘
assets/project-page/     项目页共用的 CSS / JS（bulma + 模板样式 + 双语切换）
assets/project-page/demo/neurio/   NeuRIO 页里那个可交互回放（见第 4 节）
```

项目页链接与简历里的 URL 一一对应，注意 **大小写敏感**：`/ColAG/` 不等于 `/colag/`。

项目页只给「研究」分区（一作 / 共一）的工作做；「参与研究」和「工程实践」的卡片一律点不进去，
外部链接走卡片下方的按钮。

---

## 2. 部署（第一次上线要做的事）

al-folio 用到了 GitHub Pages 原生构建不支持的插件（jekyll-scholar 等），
因此**必须用 GitHub Actions 构建**，不能再用「Deploy from a branch: main」的老方式。

1. 把这个分支合并/推送到 `main`。
2. 等待 Actions 里的 **Deploy site** 跑完（它会把构建结果推到 `gh-pages` 分支）。
3. 打开仓库 **Settings → Pages**，把 **Source** 改成 **Deploy from a branch**，
   分支选 **`gh-pages`**，目录 `/ (root)`，保存。
4. 之后每次 push 到 `main`，Actions 会自动重新构建并更新 `gh-pages`。

> 顺序很重要：**先让 Actions 成功跑一次，再把 Pages 的 Source 切到 `gh-pages`**。
> 如果 Source 还停在 `main`，GitHub 会用原生 Jekyll（`pages build and deployment`）构建这个仓库，
> 报 `The al_folio_core theme could not be found`，站点也不会更新 —— 这时候不是缓存问题，是根本没发布。
>
> 想在合并前先验证构建，可以先开一个 PR —— `deploy.yml` 对 PR 只构建、不部署。

---

## 3. 本地预览（可选）

```bash
bundle install
bundle exec jekyll serve
```

需要 Ruby 开发环境（`sudo apt install ruby-dev build-essential imagemagick`），
或者直接用 al-folio 官方的 Docker 镜像。

单独看某个项目页不需要 Jekyll，起个静态服务器就行（注意页面里用的是根路径 `/assets/...`）：

```bash
python3 -m http.server 8787      # 然后访问 http://127.0.0.1:8787/NeuRIO/
```

---

## 4. 日常维护

**改主页简介** → `_pages/about.md` 正文。
**News**（当前关闭）→ 想重新打开，把 `_pages/about.md` 的 `announcements.enabled` 和 `_config.yml` 的 `collections.news.output` 改回 `true`；加一条就在 `_news/` 里新建一个 md 文件，照抄已有文件的 front matter。
**改主页项目列表** → `_projects/*.md`，一条一个文件，字段都是可选的（没写就不显示）：

| 字段 | 作用 |
| --- | --- |
| `title` | 列表里的短名（NeuRIO、CREPES-X …） |
| `paper_en` / `paper_zh` | 论文全名，显示在短名下面 |
| `authors` | 作者名单，自己的名字用 `<strong>` 加粗，共一用 `<sup>*</sup>` |
| `authors_note_en` / `_zh` | 作者名单下的小字（共一说明、在投未公开等） |
| `venue_en` / `_zh` | 主题色高亮的那个框：会议 / 期刊，或者还不能写会议名时写「在投」；二审、口头报告这类补充写在括号里 |
| `meta_en` / `_zh` | 框后面的灰色小字（单位、起止时间），工程项目才用 |
| `role_en` / `_zh` | 灰色框：作者身份 / 项目角色 |
| `description` | 一段研究简介，双语写在 `lang-en` / `lang-zh` 两个 span 里 |
| `img` | 左边的配图，`assets/img/projects/*.png` |
| `redirect` | 独立项目页地址，有的话标题和图片会链过去；只给自己维护项目页的工作写，其余的留空、只用 `links` 按钮 |
| `links` | 链接按钮列表，每项 `label_en` / `label_zh`（可选）/ `url` |
| `category` | `research`（一作 / 共一）、`contributed`（非一作）、`engineering`（工程项目） |
| `importance` | 分区内的排序，小的在前 |

分区标题和说明文字写在 [_pages/about.md](_pages/about.md) front matter 的 `display_categories` 里，
列表本身（Liquid 循环）在同一个文件的正文末尾。

**几个已经关掉的主题功能**：`_config.yml` 里 `search_enabled: false`（去掉导航栏的 ctrl k 搜索）、
`enable_masonry: false`（不再有卡片墙）、`collections.news.output: false`，以及 `_pages/about.md` 里
`announcements.enabled: false`（不显示 News）和 `social: false`（社交图标改到头像下面，见 `more_info`）。
`_news/*.md` 没有删，把这两个开关改回 `true` 就能恢复。
**改项目页内容** → 直接编辑 `NeuRIO/index.html` 等，中英文分别写在
`<span class="lang-en">` 和 `<span class="lang-zh">` 里。

**换视频**：每个项目页的 `<!-- ==================== video ==================== -->` 段落里
已经写好了三种方式（本地 mp4 / Bilibili / YouTube）的注释代码，
取消其中一段的注释、删掉下面的 `<div class="video-placeholder">…</div>` 占位块即可。
本地视频放在 `assets/project-page/videos/` 下。
ColAG 用的是 B 站嵌入，NeuRIO 用的不是视频而是下面这个可交互回放。

**NeuRIO 的可交互回放**：`NeuRIO/index.html` 的 video 段里放的是
`assets/project-page/demo/neurio/`（`demo.css` + `demo.js` + `data/`，约 4.2 MB），
从模型仓库里那个内部回放器移植而来，几何与坐标系约定原样保留，
去掉了结果表、页头统计和主题切换，加上了双语与站内配色。

- **公开页面上不出现任何内部命名**：数据用 `scripts/export_demo.py --out <dir>`
  重新导出后，要过一遍精简再拷进来 —— 序列一律重命名成
  `sequence1.bin` … `sequenceN.bin`（键名同理），`scenario`、`sequence` 这类字段删掉，
  checkpoint 路径 / run 名 / epoch 和全部 bag 的误差表也不要，只留
  `model`（参数量 / canonical_frame / reference_agent）和每段的
  `stats` / `cam_rate` / `uwb_rate` / `layout`。页面上的标签就是「序列 1、序列 2…」，
  加上机器人台数和时长。
- 默认播 `sequence1`，改 `demo.js` 里的 `DEFAULT_BAG` 就能换；标签序号按
  `index.json` 里的键顺序生成，想调展示顺序就调导出时的顺序。
- **重新导出数据后，记得把 `NeuRIO/index.html` 里 `data-version` 的数字 +1**。
  文件名会复用（`sequence3.bin` 还是那个名字，内容却换了），不改版本号的话
  已经访问过的浏览器会拿着缓存里的旧 `index.json` 去读新的 `.bin`，
  偏移对不上，那一段就点不开。加载失败时页面会在画面下方给出提示，不会一声不响。
- 几 MB 的数据只在这一段滚进视口时才开始下载（IntersectionObserver），
  切换序列时再按需拉对应的 `.bin`。
- 页面右上角那个 EN / 中文 开关只改 `<html>` 上的 class，
  canvas 里的文字靠 `MutationObserver` 监听重绘，改文案时两处都要给。

**换配图**：`assets/img/projects/*.png` 现在是自动生成的占位图，
换成真实的 teaser 图（建议 1200×800 左右）即可，文件名保持不变。
其中 `conippo` / `mr-virgil` / `cost-effective-swarm` / `coni-mpc` / `crepes` 五张是后补的，
`aiog.png` 里写的还是论文名 To See All。

**语言切换**：全站中英双语，导航栏（主题切换按钮左边）和项目页右上角各有一个切换按钮，
选择记在 localStorage 里、两边共用，所以在主页选了中文，点进项目页也还是中文；
也可以直接用 `?lang=zh` / `?lang=en` 分享指定语言的链接。

写双语内容的方式：把两种语言分别放进 `lang-en` / `lang-zh` 两个块，只有被隐藏的那个会被
`display:none`，显示的那个保持原有排版：

```html
<div class="lang-en" markdown="1">English text, **markdown 照常可用**</div>
<div class="lang-zh" markdown="1">中文内容，**markdown 照常可用**</div>
```

行内的用 `<span class="lang-en">…</span><span class="lang-zh">…</span>`（news 和项目卡片就是这么写的）。
主题自己生成的字（about / projects / news 等）不在页面源码里，
由 [assets/lang/lang.js](assets/lang/lang.js) 顶部的 `LABELS` 表翻译，想加词条直接往里加。

> 主页是通过在正文顶部引入 `assets/lang/lang.css` + `lang.js` 生效的（见页面开头几行），
> 没有覆盖主题的任何模板文件，所以 al-folio 升级不会冲突。
> `assets/lang/` 和 `assets/site/` 特意放在 `assets/css/` 外面：purgecss 只处理
> `_site/assets/css/*.css`，而 `.lang-mode-zh` 这个类不出现在静态 HTML 里，放进去会被当成无用样式清掉。

---

## 5. 还没打开的两个开关

仓库里**没有 CV 文件，也没有任何论文文件**（PDF 和 bib 条目都没有）。

**CV**：把 PDF 放到 `assets/pdf/` 下，再取消 `_data/socials.yml` 里 `cv_pdf` 那行的注释，
头像下面就会出现 CV 图标。

**Publications 页**：先把论文条目写进 `_bibliography/papers.bib`（al-folio 的 bib 格式支持
`abbr` / `arxiv` / `code` / `website` / `selected` 等字段），再从
[al-folio 仓库](https://github.com/alshedivat/al-folio/blob/master/_pages/publications.md)
拷一份 `publications.md` 到 `_pages/`，`nav_order` 设成 3；
`_pages/about.md` 里的 `selected_papers` 改成 `true` 就能在主页显示标了 `selected={true}` 的论文。

---

## 6. 许可与署名

- **主页主题**：[al-folio](https://github.com/alshedivat/al-folio)，MIT License。
  根目录的 `LICENSE` 是上游的 MIT 许可（© Maruan Al-Shedivat），MIT 要求保留，别删；
  页脚的 “Powered by Jekyll with al-folio theme” 也是上游要求保留的署名。
- **项目页**：[Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template)
  （源自 [Nerfies](https://nerfies.github.io)），CC BY-SA 4.0，要求在页脚链接回模板 ——
  5 个项目页的页脚都保留了这段署名和许可声明，改版式可以，别把这段删掉。
  `assets/project-page/css/index.css` 就是模板自带的样式表。
- **Bulma**：`assets/project-page/css/bulma.min.css`，MIT License，文件头自带声明。
- 模板原本还打包了 FontAwesome（1.2 MB 的 JS）和 bulma-carousel / bulma-slider，
  本站没有用到，已经全部删掉：图标改成了内联 SVG，页面不再请求任何第三方资源
  （没有 Google Fonts、没有 CDN），在国内打开也不会卡。
- 页面上的**文字、图片和视频内容**版权归本人所有，不在上面这些开源许可的范围内。
