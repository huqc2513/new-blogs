import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  {
    text: '技术杂谈',
    prefix: "/blogs/",
    children: [
      { text: "从0到1搭建一个UI组件库", link: "lib" },
      { text: "基于EMP技术实现页面可视化搭建平台", link: "lowCode" },
      { text: "Monorepo+ Turborepo工程化实践", link: "monorepo" },

    ],
  },
  {
    text: 'React系列',
    prefix: "/react/",
    children: [

      { text: "use-context-selector实现原理解读", link: "use-context-selector" },
      { text: "react组件开发进阶实用技巧", link: "hooks" },
      { text: "实现一个react-route简易版", link: "router" },
    ],
  },
  {
    text: "Vue系列",
    prefix: "/vue/",
    children: [
      { text: "vue组件通信方式", link: "notice" },
      { text: "使用extend封装API式组件", link: "extend" },
      { text: "手写一个datePicker组件", link: "datePicker" },
    ],
  },
  {
    text: 'Javascript系列',
    prefix: "/js/",
    children: [
      { text: "手写Promise", link: "promise" },
      { text: "Promisify与co的实现", link: "co" },
      { text: "浏览器对于html的解析过程", link: "browser" },
    ],
  },
  {
    text: 'NodeJs系列',
    prefix: "/node/",
    children: [
      { text: "浅析 commonjs 中的模块化实现原理 ", link: "require" },
      { text: "fs实现递归删除文件", link: "fs" },
      { text: "理解http协议中的缓存", link: "http" },
    ],
  },
  {
    text: '数据结构与算法',
    prefix: "/algorithm/",
    children: [
      { text: "hashMap的简单实现", link: "hashMap" },
    ],
  },
]);
