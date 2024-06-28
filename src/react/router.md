# 实现react-route简易版


## 路由模式

用过react-router的会比较熟悉react路由模式，一般有两种，分别是`hashHistory`和`history`

使用hashHistory模式,url后面会带有#号不太美观,而使用history模式，就是正常的url，但是如果匹配不到这个路由就会出现404请求。这种情况需要在服务器配置,如果URL匹配不到任何静态资源，就跳转到默认的index.html。

这里将会实现这两种路由模式


## 实现原理

* hashHistory路由

hash值变化不会导致浏览器向服务器发出请求，而且 hash 改变会触发 hashchange 事件，浏览器的进后退也能对其进行控制,
如`http://localhost:3000/detail#/home`这段url的#号后面的就为hash值,window.location.hash 取到的就是#home



```
 window.addEventListener ('hashchange',  (e)=> {
        this.setState({
            location:{
               hash:window.location.hash
               pathname:window.location.hash
            },
      })
 });
```
<br>

* history路由

window.history 对象表示窗口的浏览历史,它只有back()、forward() 和 go() 方法可以让用户调用,
而h5规范中又新增了几个关于操作history记录的APi,分别是replaceState,pushState,popstate

在点击浏览器前进和后退的时候，都会触发popstate事件，而采用pushState和replaceState不会触发此事件





```
代码示例
/*
  state   要跳转到的URL对应的状态信息，可以存一些需要想保存的值，也可以直接传{}
  title   该条记录的title,现在大多数浏览器不支持或者忽略这个参数
  url     这个参数提供了新历史纪录的地址,可以是相对路径，不可跨域
*/

window.history.pushState(state, title, url) 
//replaceState和pushState的不同之处在与，replace是替换栈顶上的那个元素，不会影响栈的长度
window.history.replaceState(state, title, url) 

//例子
 window.addEventListener('popstate',(e)=>{
      this.setState({
        ...this.state,
        location:{
          ...location,
          pathname:e.state.path,
        },
      })
 })
```



<br>

## 设计路由组件

有了以上的知识点，就可以动手写组件了，在动手写组件之前，先来看看官方路由的具体用法，才能知道如何去设计这些组件 


react-router-dom中引出了很多的组件，模块中向外部导出接口，常见的做法是文件夹中有一个index.js向外暴露出这个模块的所有接口，

所以可以设计为react-router-dom文件夹会下放置一堆组件，通过一个index.js，向外部导出接口对接



```
├─ react-router-dom/
│  ├─ index.js
│  ├─ HashRouter.js
│  └─ Route.js
   ├─ Link.js
   └─ ...

//使用

import {  HashRouter as Router, Route,Link, Redirect,Switch,} from './react-router-dom';

```


### 路由中的组件使用


想要写一个通用组件，首先先设想好该组件的使用方式，官方的路由使用方式如下



```
//router.js  配置路由
export default const BasicRouter = () => {
    return (
        <div>
          <Router>
            <div>
            <div>
              <Link to="/home">首页</Link>
              <Link to="/detail">详情</Link>
            </div>
              <Switch>
                <Route  path="/home" component={Home} />
                <Route  path="/detail" component={Detail} />
                <Redirect to="/home" />
              </Switch>
            </div>
          </Router>
        </div>
    )
}
```



可以看到 Router组件div里面的最外层的组件，而里面的route、Switch组件等，它里面的每个子组件都可以从props中拿到Router组件中的所有数据


router可以看作是顶级组件用于提供数据,父子组件通信一般做法是采用porps向下级传递的方法，但如父子组件中间跨了多个子组件，采用props传值就很麻烦，所以采用组件的context来传递共享数据，

而每个包裹在Router下的组件都能从props中获取到一些共用数据,这里展示了router组件中的部分state状态


```
//使用路由后，在所有子组件中打印this.props    这些数据为Router中的state
{
    history:{
      replace:e=>{},  
      push:e=>{},  
    },
    match:{
        params:'',
        isExact:false
    },
    location:{
        pathname:'',
        hash:'',
    }
}
```



## context实现（Provider组件）

熟悉redux的人应该都知道，store中的共享状态需要通过一个顶层组件作为父组件，一般将顶级组件叫做Provider组件，由它内部创建context来作为数据的提供者
<br>例如redux中的connect方法，它就是一个HOC组件，connext方法的参数在函数中通过解构拿到store中的数据，再通过props的方式给到connext传入的组件中，而在react 16.3版本中新增createContext方法，它返回了Provider, Consumer组件等，


```
//context.js

import React from 'react';
let { Provider,Consumer } = React.createContext()
export  { Provider, Consumer}

//顶级组件

import { Provider } from './context'
<Provider value={this.state}>
    {this.props.children}  
</Provider>

//所有的子级组件 Consumer里面的childer是一个函数，由函数来返回渲染的块，state就是provider传入的value

import { Consumer} from './context'
render(){
      <Consumer>
            {state => {
              //这里的state就是provider传入的value
              if(state.pathname===path){
               return  this.props.component
              }
              return null
            }}
       </Consumer>
}
```

在hashRouter顶级组件中使用Provider组件,里面每个子组件中外层采用Consumer包裹，这样每个组件都能拿到provider的数据


## hashRouter.js 实现
 
 hashRouter用于提供hisotry的数据以及方法给到子组件，以及监听hashchange事件，提供push,go等方法等

```
//react-router-dom文件夹下hashRouter.js

import React, {Component} from 'react';
import {Provider} from './context';

export default class HashRouter extends Component {
  constructor () {
    super (...arguments);
    this.state = {
      location: {
        pathname: window.location.hash.slice(1), //去除#号
        hash: window.location.hash,
      },
      history:{
        push(to){
            window.location.hash = to
        }
      }
    };
  }

  componentDidMount () {
    let location  = this.state
    window.addEventListener ('hashchange',  (e)=> {
      this.setState ({
        location: {
          ...location,
          hash:window.location.hash,
          pathname: window.location.hash.slice (1) || '',  //去除#号
        },
      });
    });
  }
  render () {
    return (
      <Provider value={this.state}>
        {this.props.children}
      </Provider>
    );
  }
}
```

hashRouter组件state中的的push方法，直接将 window.location.hash值改变，会触发haschange事件，而在componentDidMount钩子函数中，监听hashchange事件中，在变化后将hash值存入state中



## Route.js实现

>该组件用来接受component和path，以及渲染传入的组件

```
import React, {Component} from 'react';
import { Consumer} from './context'
const pathToRegexp = require('path-to-regexp');

export default class Route extends Component {
  constructor () {
    super (...arguments)
  }
  render () {
    let { path, component: Component, exact=false } = this.props;
    return (
      <Consumer>
        {state => { 
        //pathToRegexp 方法，第一个参数，
          let reg= pathToRegexp(path,[],{end:exact })
          let pathname = state.location.pathname
          if (reg.test(pathname)) {
            return <Component {...state} />;
          }
          return null;
        }}
      </Consumer>
    );
  }
}
```


正常情况下,url可能会有这几种情况，如/foo/bar,  或者/foo:123，

这种url如果不处理，默认是匹配不到的，而exact参数就是控制是否精确匹配

这里引入了 [pathToRegexp](https://www.npmjs.com/package/path-to-regexp)库来生成正则表达式，来处理 url 中地址查询参数


```
//示例代码


//如果需要精确匹配,将pathToRegexp的第三个参数end传为true,pathToRegexp第二个参数是匹配到的值
let ret = []
var re = pathToRegexp('/detail',ret,{
    end:true 
})
re.test('/foo/1')  // true

//生成的正则
/^\/detail(?:\/)?$/i                
/^\/detail(?:\/(?=$))?(?=\/|$)/i     

```




## Switch.js实现

>用于匹配只渲染一个route组件



```
import React, {Component} from 'react';
import { Consumer} from './context'
const pathToRegexp = require('path-to-regexp');

export default class Switch extends Component {
  constructor () {
    super (...arguments);
  }

  render () {
    return (
      <Consumer>
        {state => {
          let pathname =state.location.pathname;
          let children = this.props.children
          for(let i=0;i<children.length;i++){
            let child = children[i]
            let path = child.props.path || ''
            let reg =  pathToRegexp(path,[],{end:false})
            if(reg.test(pathname)){
              return child
            }
          }
          return null
        }}
      </Consumer>
    );
  }
}


 //使用Switchs
 
 <Switch>
        <Route  path="/home" component={Home} />
        <Route  path="/detail" component={Detail} />
        <Redirect to="/home"/>
</Switch>


```
Switch组件将传入的children，遍历拿到每一个组件传入的path，并生成正则，如果正则能够匹配的上，则直接渲染child,否则return null,确保switch中包裹的子组件，只能渲染其中一个，switch组件是用于配合redirect组件来使用的

## redirect.js实现

>用于重定向


```
import React, {Component} from 'react';
import { Consumer} from './context'

export default class Redirect extends Component {
  constructor () {
    super (...arguments);
  }

  render () {
    return (
      <Consumer>
        {state => {
          let { history }= state;
          history.push(this.props.to)
          return null
        }}
      </Consumer>
    );
  }
}
```

redirect组件实现非常简单，如果该组件渲染，直接将window.location.hash = to





## browserRouter.js的实现

>browserRouter与hashRouter的实现不同点是，在state的push方法中调用window.history.pushState，压入后，浏览器的url会直接变化页面不会刷新，另外popstate监听事件，也需要同步一次state里面的pathname


```
import React, {Component} from 'react';
import {Provider} from './context';

class browserRouter extends Component {
  constructor () {
    super (...arguments);
    this.state = {
      location: {
        pathname: window.location.pathname ,
        hash: window.location.hash,
      },
      history:{
        push :(to)=>{
          this.pushState(null,null,to)  
        }
      },
      queue:[]      
    };
    this.pushState = this.pushState.bind(this)
  }


  pushState = (state="",title="",path="")=>{
       let queue  = this.state.queue
       let {location}  = this.state 
       let historyInfo ={state,title,path}
       queue.push( historyInfo)
       this.setState({
        ...this.state,
        location:{
          ...location,
          pathname:path,
        },
        queue,
      })
      window.history.pushState(historyInfo,title,path)
  }

  componentDidMount () {
    let {location}  = this.state 
    window.addEventListener('popstate',(e)=>{
      this.setState({
        ...this.state,
        location:{
          ...location,
          pathname:e.state.path,
        },
        queue:this.state.queue,
      })
    })
  }

  render () {
    return (
      <Provider value={this.state}>
        {this.props.children}
      </Provider>
    );
  }
}

export default browserRouter;
```








## 示例代码

1.新建一个router.js，用于管理route组件<br>
2.在index.js中导入使用

```

import React from 'react';
import {
   HashRouter as Router,
  //  BrowserRouter as Router,
  Route,
  Link,
  Redirect,
  Switch,
} from './react-router-dom';

import Home from './pages/home';
import Detail from './pages/detail';  

const BasicRoute = () => {
  return (
    <div>
      <Router>
        <div>
        <div>
          <Link to="/home">首页</Link>
          <Link to="/detail">详情</Link>
        </div>
          <Switch>
            <Route  path="/home" component={Home} />
            <Route  path="/detail" component={Detail} />
            <Redirect to="/home" />
          </Switch>
        </div>

      </Router>
    </div>
  );
};
export default BasicRoute;


// index.js中 使用

import Router from './router'
ReactDOM.render(<Router/>, document.getElementById('root'));

```


<br>

### 结尾
 
 简易版的router组件到这里就实现的差不多了，但是还是有很多功能没实现，比如query参数处理，link组件等

 代码地址 : [https://github.com/huqc2513/react-note.git](https://github.com/huqc2513/react-note.git)
















 








