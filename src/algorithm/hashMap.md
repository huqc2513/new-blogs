# hashMap的简单实现

## 功能点

 1. hash函数
 2. 扩容与缩容



``` js
// 哈希冲突使用使用链地址法
// 数据结构类似 [ [[key,value]], [ [key,value],[key,value] ]  ]

class HashMap {
  constructor() {
    this.init()
  }

  init() {
    this.storage = []
    this.count = 0
    this.minLimit = 5
    this.limit = 15
    this.loadFactor = 0.75
  }

  operationBucket(index, key) {
    let bucketList = this.storage[index]
    if (!bucketList) {
      bucketList = []
    }
    for (let i = 0; i < bucketList.length; i++) {
      let tuple = bucketList[i]
      if (tuple[0] === key) {
        return {bucketList, index: i}
      }
    }
    return {bucketList, index: -1}
  }

  resize(newLimit) {
    let oldStorage = this.storage

    // 重置长度
    this.storage = []
    this.count = 0
    this.limit = newLimit

    oldStorage.forEach(bucketList => {
      bucketList.forEach(bucket => {
        let [key, val] = bucket
        this.put(key, val)
      })
    })
  }

  put(key, value) {
    let hashCodeIndex = this.hashFunc(key, this.limit)
    let {bucketList, index} = this.operationBucket(hashCodeIndex, key)
    if (index > -1) {
      let bucketItem = bucketList[index]
      bucketItem[1] = value
    } else {
      bucketList.push([key, value])
    }
    this.count += 1

    this.storage[hashCodeIndex] = bucketList
    if (this.count > this.limit * this.loadFactor) {
      //扩容为初始长度的二倍，并取最近的一个质数，确保hash表数据均匀分布
      this.resize(getPrime(this.limit * 2))
    }
  }

  get(key) {
    let hashCodeIndex = this.hashFunc(key, this.limit)
    let {bucketList, index} = this.operationBucket(hashCodeIndex, key)
    if (index > -1) {
      let bucketItem = bucketList[index]
      return bucketItem[1]
    }
  }

  remove(key) {
    let hashCodeIndex = this.hashFunc(key, this.limit)
    let {bucketList, index} = this.operationBucket(hashCodeIndex, key)
    let temporary
    if (index > -1) {
      if (index === 0) {
        temporary = bucketList[0][1]
        bucketList = []
      } else {
        temporary = bucketList[0][1]
        bucketList.splice(index, 1)
      }

      this.count--
      this.storage[hashCodeIndex] = bucketList

      //小于总长度的0.25并大于最小长度则进行缩容操作
      let threshold = this.count < this.limit * 0.25
      if (this.count > this.minLimit && threshold) {
        this.resize(Math.floor(this.limit / 2))
      }

      return temporary
    }
    return false
  }

  has(key) {
    let hashCodeIndex = this.hashFunc(key, this.limit)
    let {bucketList, index} = this.operationBucket(hashCodeIndex, key)
    return index > -1
  }

  size() {
    return this.count
  }

  //哈希函数
  hashFunc(str, size) {
    let hashCode = 0
    //霍纳算法计算hashCode
    for (let i = 0; i < str.length; i++) {
      hashCode = 37 * hashCode + str.charCodeAt(i)
    }
    var index = hashCode % size
    return index
  }
}

let hashMap = new HashMap()
hashMap.put('1', {name: '1232'})
hashMap.put('2', {name: '1232'})
hashMap.put('3', {name: '1232'})
hashMap.put('4', {name: '1232'})
hashMap.put('5', {name: '1232'})
hashMap.put('6', {name: '1232'})
hashMap.put('7', {name: '1232'})
hashMap.put('8', {name: '1232'})
hashMap.put('9', {name: '1232'})
hashMap.put('10', {name: '1232'})
hashMap.put('11', {name: '1232'})
hashMap.put('12', {name: '12'})
hashMap.put('12', {name: '13'})


console.log('size', hashMap.size(), hashMap.limit)
console.log('get', hashMap.get('12'))

for (let i = 9; i > 1; i--) {
  hashMap.remove(i + '')
}
console.log('size', hashMap.size(), hashMap.limit)


function getPrime(num) {
  while (!isPrime(num)) {
    num++
  }
  return num
}

function isPrime(num) {
  if (typeof num !== 'number' || !Number.isInteger(num)) {
    return false
  }
  if (num == 2) {
    return true
  } else if (num % 2 == 0) {
    return false
  }
  //依次判断是否能被奇数整除，最大循环为数值的开方
  var squareRoot = Math.sqrt(num)
  //因为2已经验证过，所以从3开始；且已经排除偶数，所以每次加2
  for (var i = 3; i <= squareRoot; i += 2) {
    if (num % i === 0) {
      return false
    }
  }
  return true
}


```