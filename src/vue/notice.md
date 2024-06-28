---
icon: pen-to-square
date: 2024-05-19
category:
  - vue
# tag:
#   - red
#   - small
#   - round
---

# vue组件的多种通信方式

  介绍一些vue中不常用到的组件通信方式





##  **provide / inject** 

 一般用于跨多个组件传递数据，如Form组件，FormItem,Input组件等，需要在在Input组件I中拿到Form组件的data等


``` vue
## 用法

// A.vue
export default {
  provide: {
    name: 'Aresn',  //name改变了，子组件注入的值并不会响应变化
    app:this  //这里也可注入vue实例
  }
}

// B.vue
export default {
  inject: ['name'],
  mounted () {
    console.log(this.name);  // Aresn
  }
}
```

需要注意官网中说明的一点 

> provide 和 inject 绑定并不是可响应的。这是刻意为之的。然而，如果你传入了一个可监听的对象，那么其对象的属性还是可响应的。




##  **findComponents系列（找到任意组件）** 

 该系列方法摘自iview的工具库中，原理都是通过递归、遍历，找到指定组件的 `name`选项匹配组件实例，
 每个vue组件实例中都有$options，parent,children等属性，通过parent.$options.name，就能够使用递归来匹配组件了，一般用于公用组件查找实例



- 向上找到最近的指定组件


```  js
//  由一个组件，向上找到最近的指定组件


function findComponentUpward (context, componentName) {
  let parent = context.$parent;
  let name = parent.$options.name;

  # [componentName].indexOf(name) 防止组件name为空或者传入的name为空

  while (parent && (!name || [componentName].indexOf(name) < 0)) {
    parent = parent.$parent;
    if (parent) name = parent.$options.name;
  }
  return parent;
}
export { findComponentUpward };



```

- 向下找到最近的指定组件——findComponentDownward

``` js

function findComponentDownward (context, componentName) {
  const childrens = context.$children;
  let children = null;

//childrens是一个数组，装有当前父组件下的所有一级子组件

  if (childrens.length) {
    for (const child of childrens) {
      const name = child.$options.name;
      //name === componentName 为递归的终止条件
      if (name === componentName) {
        children = child;
        break;
      } else {
        children = findComponentDownward(child, componentName);
        if (children) break;
      }
    }
  }
  return children;
}
export { findComponentDownward };



```


- 向下找到所有指定的组件——findComponentsDownward

 用reduce+递归调用来累加vue实例，此方法可用于需要相同组件所有实例，如`tab,tabs，group-checkbox,checkbox`等组件，tab组件中寻找`tabs`组件等

``` js

function findComponentsDownward (context, componentName) {
  return context.$children.reduce((components, child) => {
    if (child.$options.name === componentName) components.push(child);
    const foundChilds = findComponentsDownward(child, componentName);
    return components.concat(foundChilds);
  }, []);
}
export { findComponentsDownward };
// 使用
 this.childrens = findComponentsDownward(this, "Checkbox");

```


- 找到指定组件的兄弟组件——findBrothersComponents
  该方法用于找到当前子组件的所有同级组件，目前感觉没什么用

``` js
// 由一个组件，找到指定组件的兄弟组件
function findBrothersComponents (context, componentName, exceptMe = true) {
  let res = context.$parent.$children.filter(item => {
    return item.$options.name === componentName;
  });
  let index = res.findIndex(item => item._uid === context._uid);
  if (exceptMe) res.splice(index, 1);
  return res;
}
export { findBrothersComponents };
```



##   **emit** 

只适用于父子组件通信，不适用于跨多级组件

``` js
// child.vue，部分代码省略
export default {
  methods: {
    handleEmitEvent () {
      this.$emit('test', 'Hello Vue.js');
    }
  }
}

<!-- parent.vue，部分代码省略-->
<template>
  <child-component @test="handleEvent">
</template>
<script>
  export default {
    methods: {
      handleEvent (text) {
      	console.log(text);  // Hello Vue.js
      }
    }
  }
</script>


```



##   **bus(事件总线)** 
  
   单独利用一个vue实例作为事件总线，来进行事件的发布订阅
  
  ``` js

  //1.建立公共文件，并导出vue实例    bus.js
  
  import Vue from 'vue'
  export default new Vue;

 //2.需要传递消息的两个组件引入  
  
  import MsgBus from '@/bus/index.js';

  // 触发组件的事件：
  
  MsgBus.$emit('msg', '1');

  //接受消息通常写在钩子函数内：例如：mounted  created

  MsgBus.$on('msg', (e) => {
      this.examineNum = e;
  })


  ```

