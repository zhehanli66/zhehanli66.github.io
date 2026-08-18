# zhehanli66.github.io

个人主页。主页使用 [al-folio](https://github.com/alshedivat/al-folio) 主题，
每个项目有自己的独立页面（`/NeuRIO/`、`/CREPES-X/` …），使用
[Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template)（nerfies 风格）。

---

## 1. 目录结构

```
_config.yml              al-folio 全站配置（姓名、URL、开关等）
_pages/about.md          主页正文（About / Research Interests）
_pages/projects.md       /projects/ 项目墙，按 research / engineering 分类
_projects/*.md           项目卡片（标题、一句话描述、配图、跳转链接）
_news/*.md               主页 News 列表，一条一个文件
_data/socials.yml        邮箱、Google Scholar、GitHub 等社交链接
_bibliography/papers.bib 论文库（目前是空的，见第 5 节）
assets/img/prof_pic.png  头像
assets/img/projects/     项目卡片配图（现在是自动生成的占位图）

NeuRIO/index.html            ┐
CREPES-X/index.html          │
CT-RIO/index.html            │  7 个独立项目页，纯静态 HTML，
AIOG/index.html              ├─ Jekyll 原样拷贝，不走模板系统，
ColAG/index.html             │  想怎么改就怎么改
IROS-2025-EXPO/index.html    │
Xunjian/index.html           ┘
assets/project-page/     项目页共用的 CSS / JS（bulma + 模板样式 + 双语切换）
```

项目页链接与简历里的 URL 一一对应，注意 **大小写敏感**：`/ColAG/` 不等于 `/colag/`。

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
> 如果 Source 还停在 `main`，GitHub 会用原生 Jekyll 构建这个仓库并失败。
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
**加一条 News** → 在 `_news/` 里新建一个 md 文件，照抄已有文件的 front matter，改日期和正文。
**改项目卡片** → `_projects/*.md`（`title` / `description` / `img` / `importance` 排序 / `category`）。
**改项目页内容** → 直接编辑 `NeuRIO/index.html` 等，中英文分别写在
`<span class="lang-en">` 和 `<span class="lang-zh">` 里。

**换视频**：每个项目页的 `<!-- ==================== video ==================== -->` 段落里
已经写好了三种方式（本地 mp4 / Bilibili / YouTube）的注释代码，
取消其中一段的注释、删掉下面的 `<div class="video-placeholder">…</div>` 占位块即可。
本地视频放在 `assets/project-page/videos/` 下。

**换配图**：`assets/img/projects/*.png` 现在是自动生成的占位图，
换成真实的 teaser 图（建议 1200×800 左右）即可，文件名保持不变。

**语言切换**：项目页右上角按钮，选择会记在 localStorage 里；
也可以直接用 `?lang=zh` / `?lang=en` 分享指定语言的链接。

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
  7 个项目页的页脚都保留了这段署名和许可声明，改版式可以，别把这段删掉。
  `assets/project-page/css/index.css` 就是模板自带的样式表。
- **Bulma**：`assets/project-page/css/bulma.min.css`，MIT License，文件头自带声明。
- 模板原本还打包了 FontAwesome（1.2 MB 的 JS）和 bulma-carousel / bulma-slider，
  本站没有用到，已经全部删掉：图标改成了内联 SVG，页面不再请求任何第三方资源
  （没有 Google Fonts、没有 CDN），在国内打开也不会卡。
- 页面上的**文字、图片和视频内容**版权归本人所有，不在上面这些开源许可的范围内。
