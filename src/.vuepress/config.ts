import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  base: "/",
  lang: "zh-CN",
  title: "kendra",
  description: "kendra Personal Website",
  theme,


  // Enable it with pwa
  // shouldPrefetch: false,
});
