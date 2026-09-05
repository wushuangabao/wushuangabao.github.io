# 游戏设计模式图书馆（独立模块）

访问地址：<https://wushuangabao.github.io/game-pattern-library/>

这是个人站点中的独立静态模块，保留原有 Docsify 文档与游戏项目。入口已加入根导航、文档导航、封面、侧边目录和网站导航页。模块内可返回个人站点。

## 目录与发布

- 当前目录：可维护的 React / TypeScript 源码与锁定依赖。
- `src/app/patterns.ts`：12 篇中文模式、分类和游戏案例。
- `src/app/page.tsx`：检索、分类、案例索引和详情面板。
- `src/app/globals.css`：样式与响应式适配。
- 仓库根目录 `game-pattern-library/`：GitHub Pages 直接提供的构建产物。

模块使用 Vite 构建，无需 Node 服务、Cloudflare Worker 或 Sites 登录。资源采用相对路径，可直接刷新 `/game-pattern-library/`。原站保留 `.nojekyll`。

## 修改与构建

需要 Node.js 22.13 或更高版本。在本目录执行：

```sh
npm ci
npm run dev
npm run build
```

`npm run build` 会先运行 TypeScript 检查，再生成静态页面到 `../../game-pattern-library/`。为保护已有发布内容，构建不会清空输出目录。提交时同时包含源码与新生成的发布文件；后续可按新 HTML 的资源引用清理不再使用的旧哈希文件。

GitHub Pages 沿用仓库现有发布方式，无需修改整个站点的工作流。

## 内容说明

中文条目是独立编写的入门内容，游戏案例是设计解读，不是英文参考站的官方译文。信息组织参考 Pattern Language for Game Design；来源说明保留在阅读指南中。
