# Promisify与co的实现


 
 ## Promisify

 Node.js中的回调函数，根据约定具有统一形式
 `(err, value)=>{}`

 **util.promisify**函数，将接受这种回调函数作为参数的函数，转换为返回promise的函数


  ``` js
  // 以readFile方法为例子
    let readFile = require('fs').readFile
    let path = require('path')
    let promisify = require('util').promisify

    //文件绝对地址
    let resolve = function(fileName){
      return path.resolve(__dirname,fileName)
    }


    //原来的readFileApi风格   回调函数
    readFile(resolve('1.txt'),'utf-8',(err,data)=>{
        if(err){
          console.log(err)
        }else{
          console.log(data)
        }
    })

    readFile = promisify(readFile)

    //经过 promisify转化为promise风格
    readFile(resolve('1.txt'),'utf-8').then(e=>{
      console.log(e) //text
    })

   //promisify实现
  function Newpromisify(fn) {
    return function (...args){
        return new Promise(function(resolve,reject){
            fn.apply(null,[...args,function(err,data){
                err ? reject(err) : resolve(data)
            }])
        })
    }
  }

  ```
  
## co

co 用于 Generator 函数的自动执行

Generator是一个生成器，生成出一个迭代器，主要是用来控制异步流程的


### co用法
```js
  let readFile = require('fs').readFile
  readFile = promisify(readFile)

  function* r(){
    let arr = []
    let r1 = yield readFile(resolve('./1.txt'),'utf-8')
    arr = [r1] 
    return arr
  }

  //使用co
  co(r()).then(data=>{
    if(data){
      console.log(data)
    }
  })


```


### co实现
``` js 
const co = function co_(gen) {
    const ctx = this;
    const slice = Array.prototype.slice;
    const args = slice.call(arguments, 1);
    return new Promise(function _(resolve, reject) {
        // 把传入的方法执行一下并存下返回值
        if (typeof gen === "function") {
            gen = gen.apply(ctx, args);
        }
        // 1. 传入的是一个方法通过上面的执行获得的返回值，
        // 如果不是一个有next方法的对象直接resolve出去
        // 2. 传入的不是一个方法且不是一个next方法的对象直接resolve出去
        if (!gen || typeof gen.next !== "function") {
            return resolve(gen);
        }
        // 执行,第一次next不需要值
        onFulfilled();
        /**
            * @param {Mixed} res
            * @return {null}
            */
        function onFulfilled(res) {
            let ret;
            try {
                // 获取next方法获得的对象，并把上一次的数据传递过去
                ret = gen.next(res);
            } catch (e) {
                // generator 获取下一个yield值发生异常
                return reject(e);
            }
            // 处理yield的值把它转换成promise并执行
            next(ret);
            return null;
        }
        /**
            * @param {Error} err
            * @return {undefined}
            */
        function onRejected(err) {
            let ret;
            try {
                // 把错误抛到generator里，并且接收下次的yield
                ret = gen.throw(err);
            } catch (e) {
                // generator 获取下一个yield值发生异常
                return reject(e);
            }
            // 处理yield的值
            next(ret);
        }
        function next(ret) {
            // generator执行完并把返回值resolve出去
            if (ret.done) {
                return resolve(ret.value);
            }
            // 把value转换成Promise
            const value = toPromise(ctx, ret.value);
            if (value && isPromise(value)) {
                // 等待Promise执行
                return value.then(onFulfilled, onRejected);
            }
            // yield的值不支持
            return onRejected(new TypeError("You may only yield a function, promise,"
                + " generator, array, or object, "



                + 'but the following object was passed: "' + String(ret.value) + '"'));
        }
    });
};


```

### 工具函数

``` js
  function toPromise(ctx,obj) {
    if (!obj) { return obj; }
    if (isPromise(obj)) { return obj; }
    // 判断是 Generator 对象|方法 直接通过 co 转换为Promise
    if (isGeneratorFunction(obj) || isGenerator(obj)) {
        return co.call(ctx, obj);
    }
    // 判断是个回调方法
    if ("function" === typeof obj) {
        return thunkToPromise(ctx, obj);
    }
    // 判断是个数组
    if (Array.isArray(obj)) {
        return arrayToPromise(ctx, obj);
    }
    // 根据对象属性把所有属性转为一个Promise
    if (isObject(obj)) {
        return objectToPromise(ctx, obj);
    }
    // 基础数据类 1 , true
    return obj;
  }

  function isPromise(object) {
    return "function" === typeof object.then;
  }
  function isGenerator(obj) {
    return "function" === typeof obj.next &&
        "function" === typeof obj.throw;
  }
  function isGeneratorFunction(obj) {
    const constructor = obj.constructor;
    if (!constructor) { return false; }
    if ("GeneratorFunction" === constructor.name ||
        "GeneratorFunction" === constructor.displayName) {
        return true;
    }
    return isGenerator(constructor.prototype);
  }
  function isObject(val) {
    return Object === val.constructor;
  }

```






