# fs实现递归删除
 实现同步、异步、async版本

## 深度先序 

- 同步版本

利用next函数保存一个指针来记录 当前目录文件是否删除
 
``` js
const syncMrdir = (dir,cb) => {
    let stat = fs.statSync(dir)
    if (stat.isDirectory()) {
        let files =  fs.readdirSync(dir)
        const next = (index=0)=>{
            if(index == files.length){
                fs.rmdir(dir,cb)
                return 
            }
            let newPath = path.join(dir, files[index])
            let stat = fs.statSync(newPath)
            if (stat.isDirectory()) {
                syncMrdir(newPath,()=>{
                    next(index+1)
                })
            }else{
                fs.unlink(newPath, () => next(index+1))
            }
        }
        next(0)
    }else{
        fs.unlink(dir,cb)
    }    
}
asyncMrdir('test')
```

- 异步版本

利用promise.all简化代码

``` js
const asyncMrdir = (dir) => {
    return new Promise((resolve,reject)=>{
        let stat = fs.statSync(dir)
        if (stat.isDirectory()) {
            fs.readdir(dir,{},(err,list)=>{
               if(err){
                   reject(err)
               }else{
                    let dirs = list.map(e=> path.join(dir, e))
                    let queue = dirs.map(e=>asyncMrdir(e))
                    Promise.all(queue).then(()=>{
                      fs.rmdir(dir, resolve);
                   })
               }
            })
        }else{
            fs.unlink(dir,resolve)
        }  
    })
}

```

- async版本


``` js

        const fs = require('fs').promises
        const path = require('path')

        async function rmdirAsync(filePath) {
                let stat = await fs.stat(filePath)
                if(stat.isFile()) {
                    await fs.unlink(filePath)
                }else {
                    let dirs = await fs.readdir(filePath)
                    dirs = dirs.map(dir => rmdirAsync(path.join(filePath, dir)))
                    await Promise.all(dirs)
                    await fs.rmdir(filePath)
                }
         }
        
        rmdirAsync('a').then(() => {
          console.log('删除成功')
        })

```


## 广度先序


``` js

function removeDir(p){
    let arr=[p];
    let index=0;
   //首先循环  将a目录拿到， 然后在拿到a目录下的所有文件列表，如果是目录，继续将该目录下的所有文件列表放在数组最尾部
    while(current = arr[index++]){
         let statObj = fs.statSync(current);
         if (statObj.isDirectory()) {
            let dirs = fs.readdirSync(current);
            arr = [...arr, ...dirs.map(d => path.resolve(current, d))];
          }
      }
      console.log(arr)
      for (let i = arr.length - 1; i >= 0; i--) {
          let statObj = fs.statSync(arr[i]);
          if (statObj.isDirectory()) {
              fs.rmdirSync(arr[i])
          } else {
              fs.unlinkSync(arr[i])
          }
      }
}

```





