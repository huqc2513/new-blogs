
# Monorepo+ Turborepo工程化实践

## 背景

公司的几个内部系统项目之间经常需要抽离雨复用一些功能代码块和组件。而对于多工程之间的代码复用，通常有着几种解决方案，比如npm包机制，Module Federation , git subModule等。这些方式之前都有接触过，如Module Federation模式，通常用于应用间的代码共享，但它并不适用于基础工程，比如一些较为底层的npm包封装等，而git subModule这种模式的话，每个子包拆分为一个子仓库，相对来说代码提交还是较为繁琐。通过npm包的形式来多工程之间共享代码，npm包形式需要手动在每个工程之间手动link以及包版本管理也很麻烦，而引入monorepo工程架构，可以很好的化解以上的这些问题

## Monorepo骨架搭建
基本的骨架工程搭建还是比较简单的，按照以下流程进行搭建即可
### 1. 初始化monorepo目录结构
``` js
- packages
    fe-shared
- apps
    client
    admin
```
### 2. 创建pnpm-workspace配置文件
 在根目录创建 pnpm-workspace.yaml 文件
 ```js 
  packages:
    - packages/*
    - apps/*
 ```
### 3. 根目录中package.json 加入preinstall钩子
 限制整个项目必须统一使用包管理器pnpm
```.json
 
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  }
```
### 4. workspace下的子包引入（重点）
  比如说要在client包中引入fe-shared这个子包，需要在client包下的package.json，加入以下代码，加入之后即使fe-shared该包不需要发布到npm 源仓库上，client这个包，也可以通过npm link的形式进入加载该包，而通过workspace的方式，省去了手动执行npm link的繁琐流程
```.json
{
  "name": "client",
  "dependencies": {
      "fe-shared": "workspace:*",
  }
}

```
## 引入Turborepo 解决多包构建顺序问题
以上的monorepo架构虽然搭建好了，但是会遇到一个多包之间的构建顺序问题，比如上面的demo, client包依赖了fe-shared这个包，我需要确保client这个应用在执行npm run build的时候，先执行了fe-shared这个包的build指令，如果手动来编写打包指令，还是比较麻烦的，而Turborepo 这个工具，正是用于解决monorepo的任务编排问题，同时它还具备了任务的缓存功能

### 安装trubo和创建turbo.json
执行`pnpm install turbo -D`,在根目录下创建turbo.json配置文件，下面解释下配置文件的各个字段的含义


```json 
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build:test": {
      "dependsOn": [
        "^build:test"
      ],
      "outputs": [
        "dist/**"
      ],
      "inputs": [
        "src/**/*.css",
        "src/**/*.scss",
        "src/**/*.tsx",
        "src/**/*.ts",
        "src/*.ts",
        "index.html"
      ]
    },
    "build:prod": {
      "dependsOn": [
        "^build:prod"
      ],
      "outputs": [
        "dist/**"
      ],
      "inputs": [
        "src/**/*.css",
        "src/**/*.scss",
        "src/**/*.tsx",
        "src/**/*.ts",
        "src/*.ts",
        "index.html"
      ]
    }
  }
}

```

#### pileline中的key
pipeline字段中的key值，就是定义了某个turbo任务，在执行该任务时，会通过dependsOn中定义的规则进行编排任务，比如执行`turbo run build:test`命令时，会把所有包的build:test命令都一一执行了
#### dependsOn
 该字段是表示在执行这个任务的同时，有哪些依赖任务需要执行，比如"^build:test"，则是表示，执行该任务时，需要先把其他包的build:test任务先执行，最后在执行自身的build:test任务
 
#### 以client包配置为例

拿刚刚的client包来举例，我们在trubo.json配置文件中定义了build:test这个任务，那我们执行了`turbo run build:test --filter client`，通过了--filter参数指定只执行client这个包，trubo工具会自动分析该包的依赖关系，在上面Demo中，我们的client包引入了fe-shared包，所以它会先执行fe-shared包的build:test指令，然后在执行client包自身的build:test指令。达到了任务边排的目的

#### input
而通过input字段，则是配置该包的输入文件有哪些，trubo默认是有任务缓存的能力的，如果说fe-shared这个包的源码没有变动的话，则第二次重新执行build:test任务，会命中缓存，而inputs则是指定哪些文件有变动，从而来控制是否命中缓存，outputs则是表示文件输出的目录


### 根目录下package.json加入turbo构建指令
 我们在根目录下定义应用的构建指令,方便我们后续通过执行pnpm run buildClient来执行client和admin应用的构建

```.json
  "scripts": {
    "buildClient": "turbo run build:test --filter client",
    "buildAdmin": "turbo run build:test --filter admin"
  }

```

## 接入cicd自动化构建能力
 笔者的项目git私仓，是用的gitlab，那monorepo如何结合gitlab的pipeline去实现cicd能力呢？比如在项目git push推送时自动执行某些任务。目前monorepo工程架构，所有的包都集中在一个git仓库中，所以需要判断本次提交哪些文件有变更，从而执行对应的构建指令，比如在某次git push提交中，client目录下的文件如果有变动，则需要执行buildClient任务，我们可以借助gitlab-ci.yml中的changes字段来指定

 ```yml 
image: node:18
stages:       
  - build-client 
  - build-admin
cache: # 缓存 
  paths:    
      - node_modules  
build_client:      
  stage: build-client
  only:
    changes:  # 只有在client文件夹下的文件源码发送变化时，才会命中该pipeline 任务
      - apps/client/**/*
    refs:
      - develop # 只在develop分支触发
  script:  # 执行的脚本
    - npm install pnpm -g
    - echo "构建前台"
    - pnpm run buildClient
  tags:  # 指定runner机器
    - ytweb


build_admin:      
  stage: build-admin
  only:
    changes: # 只有在admin文件夹下的文件源码发送变化时，才会命中该pipeline 任务
      - apps/admin/**/*
    refs:
      - develop  
  script:
    - npm install pnpm -g
    - echo "构建后台"
    - pnpm run buildAdmin
  tags: 
    - ytweb
 ```

## 最后
 至此整个Monorepo架构已经搭建完毕了，但其中还少了很多非关键流程，比如ts eslint，husky，commitLint等一些繁琐的工程化工具进行集成,不过这些东西并不属于Monorpeo知识体系中

