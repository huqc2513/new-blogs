# 浅析 commonjs 中的模块化实现原理 


## module.exports 和 exports

在 nodejs 模块化中，使用 `exports` 或`module.exports` 都能够向外部模块导出对象

```js
//a.js
exports.a = {
  a: 1
};

module.exports.b = {
  b: 1
};

// 改写exports的内存指向,会导致exports的导出失效
module.exports = {
  b: 1
};

console.log(a);
// 输入  {b:1}
```

打印 `console.log(a)`可以看出 module 和 exports 其实是指向同一块内存地址
当直接给 `module.exports` 或 `exports` 赋值时，就相当于改变了内存，两者指代的就不是同一内存，这样就会导致`exports` 中的内容失效

</br>
</br>
</br>

## 剖析模块执行原理

实际上 nodejs 底层对于模块化的实现是借助了 eval 于 fs 模块来实现,将文件内容包裹在一个函数内，函数执行时传入的 exports 只是 module.exports 的引用地址
</br>
</br>

```js
var runStr = function(str) {
  return function(exports, module, req, __filename, __dirname) {
    let cont = `
          (function(exports, module, require, __filename, __dirname){
              ${str}
              return module.exports
          })(exports, module, require, __filename, __dirname)
        `;
    return eval(cont);
  };
};
let str = `
    let a= ' 我是a模块'
    exports.a = 1
    module.exports.b=3
  `;

let Module = {
  id: "a.js",
  exports: {}
};

let content = runStr(str)(Module.exports, Module, require, "", Module.id);
console.log(content); //{a:2,b:3}
```

## require 方法的简单实现

实现原理是利用 fs 获取到模块内容字符串,然后使用 eval 函数将字符串函数执行

```js
let path = require("path");
let vm = require("vm");
let fs = require("fs");

function req(filename) {
  let absPath = path.resolve(__dirname, filename);
  let extnames = Object.keys(Module._extensions);
  let old = absPath;
  if (Module._cache[absPath]) {
    return Module._cache[absPath].exports;
  }
  let index = 0;
  //运用到一个小递归来匹配 req 方法不传入文件后缀名的兼容方法
  function find(filename) {
    if (index === extnames.length) {
      return filename;
    }
    try {
      fs.accessSync(filename);
      return filename;
    } catch (ex) {
      return find(old + extnames[index++]);
    }
  }
  absPath = find(absPath);
  try {
    fs.readFileSync(absPath);
  } catch (ex) {
    throw new Error("文件不存在");
  }
  let module = new Module(absPath);
  Module._cache[module.id] = module;
  tryModuleLoad(module);
  return module.exports;
}

function Module(pathname) {
  this.id = pathname;
  this.exports = {};
}

function tryModuleLoad(module) {
  let extname = path.extname(module.id);
  Module._extensions[extname](module);
}

Module._cache = {};
Module.wrap = [
  "(function(exports, module, require, __filename, __dirname){",
  "})"
];

Module._extensions = {
  ".js"(module) {
    let content = fs.readFileSync(module.id);
    let fnStr = Module.wrap[0] + content + Module.wrap[1];
    let fn = vm.runInThisContext(fnStr);
    fn.call(module.exports, module.exports, module, req);
  },
  ".json"(module) {
    let content = fs.readFileSync(module.id);
    module.exports = JSON.parse(content);
  }
};

let a = req("./a");
console.log(a);
```
