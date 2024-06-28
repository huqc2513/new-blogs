
# linkedList
```js 
class LinkedList {
  
  constructor() {
    this.head = null
    this.length = 0
    this.lastNode = null
  }

  append(node) {
    let newNode = new LinkedList.Node(node)
    if (this.length === 0) {
      this.head = newNode
    } else {
      let current = this.head
      while (current.next) {
        current = current.next
      }
      current.next = newNode
    }
    this.lastNode = newNode
    this.length += 1
  }

  insert(position, node) {
    if (position < 0) {
      return false
    }
    let newNode = new LinkedList.Node(node)

    if(position >= this.length){
      this.lastNode.next = newNode
      this.lastNode = newNode
      this.length += 1
      return 
    }

    if (position == 0) {
      newNode.next = this.head
      this.head = newNode
    } else {
      let index = 0,
        previous = null
      let current = this.head
      while (index++ < position) {
        previous = current
        current = current.next
      }

      newNode.next = current
      previous.next = newNode
    }
    this.length += 1
  }

  toString() {
    let str = 'list: '
    let current = this.head

    while (current) {
      str += `${current.data} `
      current = current.next
    }
    return str
  }



}

LinkedList.Node = class {
  constructor({data, next = null}) {
    this.data = data
    this.next = next
  }
}

let list = new LinkedList()

list.append({data: '123'})
list.append({data: '456'})
list.append({data: '789'})
list.insert(1, {data: '我是插入的node 2'})
list.insert(2, {data: '我是插入的node last'})

console.log(list.toString())

```