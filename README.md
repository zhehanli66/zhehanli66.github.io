# Zhehan Li's Personal Website

Source code for [zhehanli66.github.io](https://zhehanli66.github.io), featuring a bilingual profile, selected research projects, and standalone project pages.

## Local development

The main site is built with Jekyll:

```bash
bundle install
bundle exec jekyll serve
```

Standalone project pages can also be previewed with a local static server:

```bash
python3 -m http.server 8787
```

Deployment is handled by GitHub Actions.

## Credits and licenses

- The main site uses [al-folio](https://github.com/alshedivat/al-folio), distributed under the MIT License.
- Project pages are based on the [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template), which was adapted from [Nerfies](https://nerfies.github.io), and retain the required attribution and license notices.
- [Bulma](https://bulma.io) is distributed under the MIT License.

Third-party components remain subject to their respective licenses. Unless otherwise noted, research text, figures, videos, and other project content are copyright of their respective authors.
