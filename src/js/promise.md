# 实现一个Promise

  自己虽然之前也一直有使用promise,但确一直没有深入研究Promise思想，闲暇之余，写下学习笔记，以用来加深印象

## Promise是什么

  Promise是异步编程的一种解决方案，比传统的回调函数处理异步事件更合理和更强大。

 * 解决了什么问题？

   在promise出现之前，处理异步请求一般是使用回调函数。当我们在异步回调里面处理的操作还是异步操作的时候，会形成了异步函数回调的嵌套。而异步操作越来越多就会形成回调地狱，而promise的出现解决了繁琐的层层回调

## Promise/A+ 规范

  社区出现多种方案规范，ES6将`Promise/a+`规范将其写进了语言标准，统一了用法。规范详细说明了`primise`应该具备哪些东西，按照[Promises/A+](https://promisesaplus.com/)规范，即可实现promise函数


#### 术语
  1. promise是一个包含了兼容promise规范then方法的对象或函数，
  2. thenable 是一个包含了then方法的对象或函数。
  3. value 是任何Javascript值。 (包括 undefined, thenable, promise等).
  4. exception 是由throw表达式抛出来的值。
  5. reason 是一个用于描述Promise被拒绝原因的值。


####  要求

 一个Promise必须处在其中之一的状态：`pending`, `fulfilled` 或 `rejected`

  * `pending`状态, 则`promise`可以转换到`fulfilled`或`rejected`状态
  * `fulfilled`状态或者`rejected`状态,不能转换成任何其它状态。必须有一个值，且这个值不能被改变。
  *  thenable 是一个包含了then方法的对象或函数。
  *  value 是任何Javascript值。 (包括 undefined, thenable, promise等).
  *  exception 是由throw表达式抛出来的值。
  *  reason 是一个用于描述Promise被拒绝原因的值。
  ...

## Promise构造函数
  
  首先先看`Promise`的使用方式,通过使用方式和规范要求，可以大致写出`Promise`构造函数的模型

  ``` js
  // 使用
    const f = new Promise (function (resolve, reject) {
      setTimeout (() => {
        resolve(230);
      }, 1000);
    });

    f.then(e=>{
      console.info('f1',e)
    })

  ```
  从使用方式中，可以提取几点

 * Promise传入一个函数，函数中有两个参数分别是resolve和reject，调用这两个函数改变Promise的状态
 * thenable 包含了then方法的对象或函数。
 * Promise的原形链上有个then方法
 * 一个Promise必须处在其中之一的状态：pending, fulfilled 或 rejected.
 
``` js
//Promise构造函数
function Promise(excutor) {
  let self = this
  self.status = 'pending'  
  self.value = null  //resolve的值
  self.reason = null  //reject的值
  self.onResolvedCallbacks = []    //所有then传入的resolve回调
  self.onRejectedCallbacks = []    //所有reject传入的resolve回调

  function resolve(value) {
    if (self.status === 'pending') {
      self.value = value
      self.status = 'fulfilled'
      self.onResolvedCallbacks.forEach(item => item())
    }
  }

  function reject(reason) {
    if (self.status === 'pending') {
      self.reason = reason
      self.status = 'rejected'
      self.onRejectedCallbacks.forEach(item => item())
    }
  }
  try {
    //执行传入的函数，resolve 和reject 作为回调
    excutor(resolve, reject)
  } catch (err) {
    reject(err)
  }
}

```

## then函数
 
 then方法是在原型链上的一个方法，由于可以链式调用then,返回的值，放入第二个then中`onFulfilled`函数的参数

 1. then 方法必须返回一个 promise 对象，用于链式调用then
 2. then 方法可以被同一个 promise 调用多次
 - 当 promise 成功执行时，所有 onFulfilled 需按照其注册顺序依次回调
 - 当 promise 被拒绝执行时，所有的 onRejected 需按照其注册顺序依次回调

 
 ``` js
//  链式调用值穿透, 加入第一个then方法加入任何东西都没传，直接将值穿透到第二个then
 f.then().then(e=>{
    console.info('e',e)  //230
 })

 //返回新的promise
  f.then(onFulfilled=>{
      return new Promise((resolve,reject)=>{
        setTimeout(()=>{
          resolve('***')
        })
      })
    },err=>{
     console.info(err)  
    }).then(e=>{
    console.info(e)  //***
 })


 ```
zhen函数在执行时需要判断当前`Promise`的状态 
 
  * 在当前promise为`pedding`状态时

    1. 兼容处理，then函数如果没有传入onFulfilled或者onRejected就默认给一个函数 
    2. 如果then函数传入的onFulfilled返回的是一个新的Promise，则调用它本身的then方法，将自身Promise的resolve和rejact传入
    3. push到回调数组中，等待resolve被执行

  * 在当前promise为`fulfilled`状态 或者 `rejected`状态
    1. 直接执行resolve或者rejected
    


``` js
Promise.prototype.then = function (onFulfilled, onRejected) {
  //处理值穿透
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled :  function (data) {return data}
  onRejected = typeof onRejected === 'function' ? onRejected : function (data) {return data}
  let self = this

  if (self.status === 'pending') {
    return new Promise((resolve, reject) => {
      self.onResolvedCallbacks.push(() => {
          try{
              let x = onFulfilled(self.value)
              //如果then中onFulfilled方法return的是promise，直接执行它的then方法取它的结果
              if (x instanceof Promise) {
                x.then(resolve, reject)
              } else {
                  resolve(x)  //将第一个then回调中return的值 放到promise中的resolve值
              }

          }catch(e){
              reject(e)
          }
     
      })
      self.onRejectedCallbacks.push(() => {
        let x = onRejected(self.reason)
        if (x instanceof Promise) {
          x.then(resolve, reject)
        } else {
          resolve(x)
        }
      })
    })
  }


//如何
  if (self.status === 'rejected') {
    return new Promise((resolve, reject) => {
      try {
        let x = onRejected(self.reason)
        if (x instanceof Promise) {
          x.then(resolve, reject)
        } else {
          resolve(x)
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  if (self.status === 'fulfilled') {
    return new Promise((resolve, reject) => {
      try {
        let x = onFulfilled(self.reason)
        if (x instanceof Promise) {
          x.then(resolve, reject)
        } else {
          resolve(x)
        }
      } catch (err) {
        reject(err)
      }
    })
  }

｝

```


## Promise.all函数

all函数用于把所有要执行的promise都放进一个数组里面，然后一个一个执行，最后将结果返回到一个新的promise实例中


``` js
// 使用
  let f1 = new Promise (function (resolve, reject) {
    setTimeout (() => { 
        resolve('100')
    }, 200);
  });

  let f2 = new Promise (function (resolve, reject) {
    setTimeout (() => { 
        resolve('200')
    }, 200);
  });

  let f3 = new Promise (function (resolve, reject) {
    setTimeout (() => { 
        resolve('300')
    }, 200);
  });



  PromiseAll([f1,f2,f3]).then(e=>{
    console.log(e)  // [100 ,200 ,300]
  })

```

### 实现
  循环调用将值push到一个数组中存放即可

``` js
  function isPromise(object) {
    return "function" === typeof object.then;
  }


 let PromiseAll = function (arr) {
    return new Promise(function(resolve,reject){
      let i = 0 
      let result = []

      try{
        next();    //开始逐次执行数组中的函数
        function next() {
          if(isPromise(arr[i])){
            arr[i].then(function (res) {
              result.push(res);    //执行后返回的结果放入数组中
              i++;
              if (i == arr.length) {    //如果函数数组中的函数都执行完，便把结果数组传给then
                resolve(result);
              } else {
                next();
              }
            })
          }else{
            result.push(null)
            i++
            if (i == arr.length) {  
              resolve(result);
            } else {
              next();
            }
          }
        }
      }catch(e){
        reject(e)
      }

    })
  }

```


## Promise.race函数

Promise.race([p1, p2, p3])里面哪个结果获得的快，就返回那个结果


``` js
// 实现
 let PromiseRace = function (arr) {
    return new Promise(function(resolve,reject){
      try{
        arr.forEach(e=>{
           e.then(resolve,reject)
        })

      }catch(e){
        reject(e)
      }
    })
  }






```



