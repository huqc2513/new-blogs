笔者在使用react框架近一年的过程中，总结了一些组件开发的实用技巧



### 组件跨多层级数据共享

如组件内需要共享一些数据，可以使用 `react.createContext` 配合 `react.useContext` 进行组件跨层级数据透传。
像`Ant Design`中，内部所有的组件实现都经过了一层包裹，用于共享 ConfigProvider 组件中的数据，其内部实现也是如此

```tsx
export const useGlobalProps = () => {
  return react.useContext(PropsCtx);
};

export const StoreCtx = createContext({});

// 在共同的顶级组件中使用Provider注入数据
const app = (props) => {
  const [name, setName] = react.useState("小明");

  const store = react.useMemo(
    () => ({
      name,
      setName,
    }),
    [name, setName]
  );
  return (
    <StoreCtx.Provider value={store}>
      <Child />
    </StoreCtx.Provider>
  );
};

const Child = (props) => {
  const { name = "" } = useGlobalProps();
  return <div>{name}</div>;
};
```

需要注意的是，provider 中如果数据会频繁变化，某些所关联的子组件即使没有用到该变化的数据，也会触发无必要的 render,此时要
用到`react.useMemo`,`react.Memo`,`react.useCallback`等函数进行手动优化

### 使用 react.forwardRef 对 ref 进行透传

在二次封装组件时，需要用到组件内的元素 ref 或内部子组件的 ref，可借助`react.forwardRef`进行透传

```tsx
import { Input } from 'antd'

const CustomInput = React.forwardRef((props, ref) => {
  return (<div>
    <Input ref={ref}/>
  </div>)
})

// 使用
const Test = (props) => {
  const ref = react.useRef()
  return <CustomInput ref={ref}>;
}

```

### 父组件调用子组件的内部方法

在函数式组件开发中，在子组件中借助`react.useImperativeHandle`配合`react.forwardRef`，可向外层组件暴露出方法

```tsx

// ShareModal.tsx
import { Modal, Button, Input, message } from 'antd'
const ShareModal =  (props, ref) => {
  const [show, setShow] = react.useState(false)

  react.useImperativeHandle(ref, () => {
    return {
      open() {
        setShow(true)
      }
    }
  })

  return (
    <Modal
      maskClosable
      visible={show}
      footer={null}
      onCancel={()=>{
        setShow(false)
      }}
    >
      <div>
        body
      </div>
    </Modal>
  )
}

export default react.forwardRef(ShareModal)


// 使用
const Test = (props) => {
  const ref = react.useRef())

  const open= ()=>{
    ref.current.open()
  }

  return <div>
    <button onclick={open}>click me </button>
    <ShareModal ref={ref}>
  </div>

}

```

### React.cloneElement 的使用

使用场景通常是在需要统一处理子组件的一些逻辑，其实常用的方案有 HOC,props Render 等，使用`React.cloneElement`也可以做到
例如`Ant Design`中的`Form`表单组件,被`Form.Item`包裹住的表单组件，其 `props` 上都会被传入`onChange` 和 `value`

```tsx
const Test = (props) => {
  const onChange = () => {};

  const renderChildren = () => {
    return React.Children.map(props.children, (child) => {
      if (child) {
        return React.cloneElement(child, {
          onChange,
          value: "123",
        });
      }
    });
  };

  return <div>{renderChildren()}</div>;
};
```

### api调用式组件

借助`ReactDOM.render React.createElement ReactDOM.unmountComponentAtNode`这三个 api，我们可以将普通组件封装为 api 式调用,一般使用场景像弹窗，toast 等组件，相比与使用 ref 调用组件中的方法，api 式使用起来更为方便

```tsx
//使用demo
import Confirm from "./Confirm";

const Test = (props) => {
  react.useEffect(() => {
    Confirm.show({
      title: "标题",
      content: "弹窗内容",
      onConfirm: () => {},
      onCancel: () => {},
    });
  }, []);

  return <div>test</div>;
};
```

实现

```tsx
//Confirm.tsx
interface ConfirmModal{
  show:( opt: any)=> void
}
interface ConfirmModalProps{
	title?: React.ReactNode | string
	confirmText?: string
	content?: React.ReactNode
	head?: React.ReactNode
	renderFoot?: (onConfirm: Function, onCancel: Function) => React.ReactNode
	onCancel?: () => void
  onConfirm?: () => void
}

const Confirm = Object.create(null, {}) as ConfirmModal

let singleContainer: HTMLDivElement | null = null

const destroyComponent = (div: HTMLDivElement) => {
  if (!div) return
	try {
		let flag = ReactDOM.unmountComponentAtNode(div)
		flag && document.body.removeChild(div)
  } catch(err) console.error(err)
}

//渲染弹窗
Confirm.show = (opt: any) => {
  const { content ,onCancel ,onConfirm} = opt
  const createContainer = ()=>{
    let container = document.createElement('div')
    document.body.appendChild(container)
    if (!singleContainer) {
      singleContainer = container
    } else {
      singleContainer && destroyComponent(singleContainer)
    }
    singleContainer = container
  }

  createContainer()

	const props:ConfirmModalProps = {
		content: content,
		confirmText,
		title,
		onCancel: function () {
			onCancel && onCancel()
			destroyComponent(singleContainer)
		},
		onConfirm: function () {
				onConfirm && onConfirm()
			destroyComponent(singleContainer)
		},
  }

  ReactDOM.render(React.createElement(ConfirmModal, props), singleContainer)
}


// 弹窗组件的具体实现，只需要接受props进行处理即可
import { Modal } from 'antd'
const ConfirmModal = (props)=> {
  const { onConfirm , content,title, onCancel} = props
  const [visible, setVisible] = useState(true)

	const onClose = () => {
		setVisible(false)
		onCancel && onCancel()
  }

  const onConfirm = ()=>{
    setVisible(false)
		onConfirm && onConfirm()
  }

  return(
     <Modal
      maskClosable
      title={title}
      visible={visible}
      footer={null}
      onCancel={onClose}
      onOk={onConfirm}
    >
      <div>
          {props.content}
      </div>
    </Modal>
    )
}

```
