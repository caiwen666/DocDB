# 依赖

| 依赖             | 参考                                                      | 说明                                               |
|----------------|---------------------------------------------------------|--------------------------------------------------|
| Electron Forge | https://www.electronforge.io/                           | 一个electron的框架，看他有ts+webpack+react的项目模板就用了        |
| React          | https://react.dev/reference/react                       |                                                  |
| Material UI    | https://mui.com/material-ui/getting-started/            | 使用的UI库                                           |
| Tailwindcss    | https://tailwindcss.com/docs/installation/              | 本项目使用 tailwindcss 来进行样式设计                        |
| Day.js         | https://day.js.org/docs/zh-CN/installation/installation | 日期处理                                             |
| Node Fetch     | https://github.com/node-fetch/node-fetch                | 用来后端发 htpp 请求，试过了 axios，但是出现神秘 bug，故选用node-fetch |
| pdf-lib        | https://pdf-lib.js.org/                                 | 处理 pdf                                           |
| Lodash         | https://www.lodashjs.com/                               | 提供防抖、节流等工具                                       |
| Zustand        | https://github.com/pmndrs/zustand                       | 全局状态管理                                           |
| Classnames     | https://github.com/JedWatson/classnames                 | 处理类名的库                                           |
| uuid           | https://github.com/uuidjs/uuid                          | 生成唯一标识符                                          |

# 基本思路

考虑到数据库并不会频繁更新，所以把数据都放到本地来检索

本地的数据有更新之后，可以进行同步：客户端先把本地的数据推送到服务器，服务器把数据合并，得到新的版本的数据库，然后客户端再从服务器拉取合并后的最新数据，一切以服务器的数据为准

# 开发

请使用 typescript + eslint + prettier

```bash
# 安装依赖，由于 React 19.0 版本的问题，需要使用 --force 参数
npm install --force
```

```bash
npm run start
```

# 结构

```
server: 服务端代码
 - src
   - app.ts: 服务端路由
   - database.ts: 合并数据的代码
   - type.ts: 一些类型声明
 - config.json: 配置文件
src: 客户端代码
 - shared: 主进程和渲染进程可以共享的代码
   - types: 一些类型声明
     - api.ts: 约定了主进程提供的 api 的函数签名类型，callback的类型，以及调用主进程接口时的返回值类型
     - database.ts: 和数据库有关的类型
     - document.ts: 和试卷有关的类型
     - record.ts: 和操作记录有关的类型
   - utils: 一些工具函数
     - index.ts: 一些工具函数
     - result.ts: 提供了一个类似rust的Result类，用来处理渲染进程调用主进程时的异常
     - type.ts: 一些工具作用的泛型
   - api.ts: 定义了主进程的接口和callback
 - backend: 主进程
   - api.ts: 主进程和渲染进程间相互通信的接口
   - config.ts: 配置信息和全局变量
   - database.ts: 数据库相关操作接口
   - document.ts: 试卷相关操作接口
   - utils.ts: 一些工具函数
   - window.ts: 窗口相关操作接口
 - ui: 渲染进程
   - components: 可复用的组件
     - dialog: 对话框相关
       - DialogBarProgressTemplate.tsx: 一个带条形进度条的对话框内容模板
       - DialogCircleProgressTemplate.tsx: 一个带圆形进度条的对话框内容模板
       - DialogErrorTemplate.tsx: 一个带错误信息的对话框内容模板
       - DialogBase.tsx: 用来把队列中的对话框都渲染出来
     - DocumentForm.tsx: 试卷信息表单
     - DocumentItem.tsx: 用来展示试卷信息
   - pages: 页面
     - Add.tsx: 添加试卷页面
     - Checked.tsx: 查看已选中试卷页面
     - Home.tsx: 主页
     - Push.tsx: 同步页面
     - Search.tsx: 搜索页面
   - stores: 全局状态管理
     - dialog.ts: 我们封装了一个对话框队列，用于把对话框统一放到一个位置渲染
     - page.ts: 管理页面
     - select.ts: 管理已经选中的试卷
   - utils
     - index.ts: 一些工具函数
   - api.ts: 定义了渲染进程和主进程通信相关的接口
   - global.d.ts: 把preload中在window中暴露的接口添加类型声明
 - app.tsx: 窗口
 - global.css: 全局样式
 - index.html
 - index.ts: 整个程序的入口
 - preload.ts
 - render.ts
- config.json: 配置文件
- font.ttf: 宋体字体，用来给pdf打水印
```

# 注意

## 主进程与渲染进程通信

electron 自带的通信方式太麻烦了，而且也没有类型安全。我把原有的通信方式封装了一下

主进程暴露的接口，或者是一些callback，都现在shared的api.ts中写一下类型定义

然后把具体的接口函数写在backend的api.ts中

渲染进程使用ui/api.ts中的invoke来调用主进程的接口

主进程如果要给渲染进程发消息，可以调用backend/api.ts中的send

渲染进程如果要订阅主进程的消息，可以调用ui/api.ts中的subscribe