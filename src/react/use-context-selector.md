## React Context所带来的性能问题
React Context是 React日常开发中常用的一个API，它解决了父子组件以及孙子组件之间的状态共享问题. 如果你对React Context使用上较为熟练的话，你可能会遇到 React Context 中任意属性发生变化时，会引起所有使用到该 Context 的组件发生 re-render，但是我们希望当只有组件关心的值（或者说实际使用到的值）发生变化才会导致组件发生 re-render，解决这个问题，通常来说有以下几种方案

- 拆分context（根据数据变更的频率按需拆分context）
- 借助memo和useMemo对组件props进行浅层比较和缓存，控制re-render频率
- 使用一些社区的方案
> 以 [use-context-selector](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fdai-shi%2Fuse-context-selector "https://github.com/dai-shi/use-context-selector") 为首的直接基于 Context 之上进行的优化

前面两种方案都是需要手写业务代码去进行优化，对开发者来说带来了一定的心智负担，本文主要是抛析第三种方案[use-context-selector](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fdai-shi%2Fuse-context-selector "https://github.com/dai-shi/use-context-selector")其实现原理



下面是一段不进行手动优化的demo，Count1组件和Count2组件都会出现re-render现象

``` jsx
import { createContext, useContext, useState } from "react";

const context = createContext(null);

const Count1 = () => {
  const { count1, setCount1 } = useContext(context);
  console.log("Count1 render");
  return <div onClick={() => setCount1(count1 + 1)}>count1: {count1}</div>;
};

const Count2 = () => {
  const { count2 } = useContext(context);
  console.log("Count2 render");
  return <div>count2: {count2}</div>;
};

const Provider = ({ children }) => {
  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useState(0);
  return (
    <context.Provider
      value={{
        count1,
        count2,
        setCount1,
        setCount2
      }}
    >
      {children}
    </context.Provider>
  );
};

const App = () => (
  <Provider>
    <Count1 />
    <Count2 />
  </Provider>
);

export default App;

```
经过[use-context-selector](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fdai-shi%2Fuse-context-selector "https://github.com/dai-shi/use-context-selector")优化后的代码

``` jsx
import { useState } from "react";
import { createContext, useContextSelector } from "use-context-selector";

const context = createContext(null);

const Count1 = () => {
  const { count1, setCount1 } = useContext(context);
  console.log("Count1 render");
  return <div onClick={() => setCount1(count1 + 1)}>count1: {count1}</div>;
};

const Count2 = () => {
  const { count2 } = useContext(context);
  console.log("Count2 render");
  return <div>count2: {count2}</div>;
};

const Provider = ({ children }) => {
  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useState(0);
  return (
    <context.Provider
      value={{
        count1,
        count2,
        setCount1,
        setCount2
      }}
    >
      {children}
    </context.Provider>
  );
};

const App = () => (
  <Provider>
    <Count1 />
    <Count2 />
  </Provider>
);

export default App;

```

use-context-selector是如何做到的呢？接下来笔者将从源码角度分析其实现


## use-context-selector实现原理解读

### 核心原理
在以上的demo中，可以看出use-context-selector是对createContext, useContextSelector这两个API进行了重写，其核心原理就是包裹了Provider组件传入value,并采用发布订阅的方式，在value变化时，触发订阅组件的更新


###  createProvider实现

 从源码可以看出，它重写的Provider组件，做了有几件事情
1.  对用户传入的value值进行了包裹，并用useRef进行存储
2.  在组件初始化时，实现了一个发布订阅模式，使用了useIsomorphicLayoutEffect监听用户传入的value值的变化，一但有变化，则会进行触发listener数组中的订阅函数
3. 使用react原生的Provider组件进行数据共享，便于后续的useContextSelector共享这些数据 
 
```tjx
import {
  ComponentType,
  Context as ContextOrig,
  MutableRefObject,
  Provider,
  ReactNode,
  createElement,
  createContext as createContextOrig,
  useContext as useContextOrig,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

const useIsomorphicLayoutEffect = isSSR ? useEffect : useLayoutEffect;

const createProvider = <Value>(
  ProviderOrig: Provider<ContextValue<Value>>,
) => {
  const ContextProvider = ({ value, children }: { value: Value; children: ReactNode }) => {
    const valueRef = useRef(value);
    const versionRef = useRef(0);
    const [resolve, setResolve] = useState<((v: Value) => void) | null>(null);
    //首次触发一次更新
    if (resolve) {
      resolve(value);
      setResolve(null);
    }
    const contextValue = useRef<ContextValue<Value>>();
    if (!contextValue.current) {
      const listeners = new Set<Listener<Value>>();
      const update = (thunk: () => void, options?: { suspense: boolean }) => {
      
      //这里的batchedUpdates是react-dom 18中的unstable_batchedUpdates方法,其作用就是进行批量更新
      
        batchedUpdates(() => {
          versionRef.current += 1;
          const action: Parameters<Listener<Value>>[0] = {
            n: versionRef.current,
          };
          if (options?.suspense) {
            action.n *= -1; // this is intentional to make it temporary version
            action.p = new Promise<Value>((r) => {
              setResolve(() => (v: Value) => {
                action.v = v; 
                delete action.p;
                r(v);
              });
            });
          }
          listeners.forEach((listener) => listener(action));
          thunk();
        });
      };
      //value进行包裹一层，并压入更新函数
      contextValue.current = {
        [CONTEXT_VALUE]: {
          /* "v"alue     */ v: valueRef,
          /* versio"n"   */ n: versionRef,
          /* "l"isteners */ l: listeners,
          /* "u"pdate    */ u: update,
        },
      };
    }

    useIsomorphicLayoutEffect(() => {
      valueRef.current = value;
      versionRef.current += 1;
      runWithNormalPriority(() => {
        (contextValue.current as ContextValue<Value>)[CONTEXT_VALUE].l.forEach((listener) => {
          listener({ n: versionRef.current, v: value });
        });
      });
    }, [value]);
    return createElement(ProviderOrig, { value: contextValue.current }, children);
  };
  return ContextProvider;
};


```

###  useContextSelector 实现

useContextSelector也做了如下几件事情
1. 通过useReducer实现了更新函数，更新函数里面主要就是对比新旧value,如果不一样，那就出发自身组件的re-render
2. 组件初始化时，往listeners里面压入订阅函数，在之前的Provider组件的value值变化时，会触发该订阅函数进行执行，并传入最新的value和更新版本号

 
```jsx

import {
  ComponentType,
  Context as ContextOrig,
  MutableRefObject,
  Provider,
  ReactNode,
  createElement,
  createContext as createContextOrig,
  useContext as useContextOrig,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

const useIsomorphicLayoutEffect = isSSR ? useEffect : useLayoutEffect;


export function useContextSelector<Value, Selected>(
  context: Context<Value>,
  selector: (value: Value) => Selected,
) {
  const contextValue = useContextOrig(
    context as unknown as ContextOrig<ContextValue<Value>>,
  )[CONTEXT_VALUE];
  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    if (!contextValue) {
      throw new Error('useContextSelector requires special context');
    }
  }
  const {
    /* "v"alue     */ v: { current: value },
    /* versio"n"   */ n: { current: version },
    /* "l"isteners */ l: listeners,
  } = contextValue;
  //计算一次值
  const selected = selector(value);
  
  const [state, dispatch] = useReducer(
    
    (
    prev: readonly [Value, Selected],
    action?: Parameters<Listener<Value>>[0],
  ) => {
    if (!action) {
      // case for `dispatch()` below
      return [value, selected] as const;
    }
    if ('p' in action) {
      throw action.p;
    }
    if (action.n === version) {
      if (Object.is(prev[1], selected)) {
        return prev; // bail out
      }
      return [value, selected] as const;
    }
    try {
      if ('v' in action) {
        if (Object.is(prev[0], action.v)) {
          return prev; // do not update
        }
        const nextSelected = selector(action.v);
        if (Object.is(prev[1], nextSelected)) {
          return prev; // do not update
        }
        return [action.v, nextSelected] as const;
      }
    } catch (e) {
      // ignored (stale props or some other reason)
    }
    return [...prev] as const; // schedule update
  },   [value, selected] as const );

   //不一样时，触发一次更新
  if (!Object.is(state[1], selected)) {
    // schedule re-render
    // this is safe because it's self contained
    dispatch();
  }
 //压入订阅函数
  useIsomorphicLayoutEffect(() => {
    listeners.add(dispatch);
    return () => {
      listeners.delete(dispatch);
    };
  }, [listeners]);
  return state[1];
}

```

该库源码较为简单，整体逻辑还是很好理解的

