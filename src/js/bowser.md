# js的加载过程和文档解析过程

  关于浏览器对于html与js文件的加载和解析过程的知识点整理

## 浏览器对于html的解析过程

  当浏览器获得一个html文件时，会自上而下加载解析

#### 解析过程

  1. 浏览器会将HTML解析成一个DOM树，DOM 树的构建过程是一个深度遍历过程：当前节点的所有子节点都构建好后才会去构建当前节点的下一个兄弟节点。 
  2. 将CSS解析成 CSS Rule Tree 。 
  3. 根据DOM树和CSSTree合并为 Render Tree。(RenderTree记载着各个节点的CSS定义以及他们的从属关系)
  4. 浏览器已经能知道网页中有哪些节点、可以计算出每个节点在屏幕中的位置，然后遍历render树，并使用UI线层绘制每个节点(渲染步骤还会分为三个小步骤)
     - layout ：将渲染树上的节点，根据它的高度，宽度，位置，为节点生成盒子
     - paint：确定渲染树上的节点的大小和位置后，便可以对节点进行涂鸦
     - composite layer：合成层；当渲染树上的节点涂鸦完毕后，便生成位图（bitmap），浏览器把此位图从CPU传输到GPU


#### 重绘与回流

 - reflow(回流)

  dom节点被Javascript改变，导致Chrome重新计算页面的layout，称之为回流
 -  repaint(重绘)

  改变visibility、边框颜色、背景色等属性。浏览器会根据元素的新属性重新绘制，使元素呈现新的外观。
  重绘不会带来重新布局，并不一定伴随回流，但回流操作一定会进行重绘

#### 哪些操作会触发回流？

  1. dom节点增加，删除，位置移动，展示与否，以及修改dom的宽高，边距等

  2. 计算 offsetWidth 和 offsetHeight 属性
    offsetxxx，scrollxxx，clientxxx跟元素的位置相关，会触发浏览器重新计算RenderTree上dom的信息，获取dom相应的宽高

#### 如何减少回流和重绘？

  1. 避免操作DOM，创建一个documentFragment或div，在它上面应用所有DOM操作，最后再把它添加到window.document。也可以在一个display:none的元素上进行操作，最终把它显示出来。因为display:none上的DOM操作不会引发回流和重绘

  2. 将需要多次回流的元素position属性设为absolute或fixed，这样该元素就会脱离文档流，它的变化不会影响其他元素变化。比如动画效果应用到position属性为absolute或fixed的元素上

  3. 避免使用table布局

#### 开启GPU硬件加速

  CSS的 animations, transforms 以及 transitions 不会自动开启GPU加速， 而是由浏览器的缓慢的软件渲染引擎来执行。大部分的浏览器提供了触发GPU加速的CSS规则， 浏览器检测到页面中某个DOM元素应用了这些CSS规则时就会开启GPU硬件加速。

  transformZ(0); transform3d(0,0,0) ，他们可以让拥有这个属性的元素生成单独的composite layer。 这样，不管这个元素的大小，位置等变换，都不会触发layout和paint阶段，直接执行composite layers (合成图层)阶段，浏览器会把这个合成图层layer当做位图上传到GPU。 GPU硬件加速后节省的时间

  >注意：增加以上属性可以虽然开启GPU硬件加速，但也不能滥用，因为创建layer也同样会增加内存开销


## js同步加载与异步加载


  #### 同步加载

  平时我们使用js都是这样写的
  ``` js
    <script src="tool.js"></script> 
  ```

  这种就是最常使用的同步加载形式，js加载方式默认是同步执行，他会阻止浏览器的后续处理，停止后续的解析，只有js脚本加载完成，才能进行下一步操作。
  平常我们写的js文件可能有输出 document 内容（docment.write）、修改dom样式等行为， 所以默认同步执行才是安全的。

  >这也是为什么为什么一般把script标签放在body结尾处，因为这样尽可能减少页面阻塞

  #### 异步加载

  异步加载也叫非阻塞加载，浏览器在下载js的同时，还会继续进行后续页面的处理

  #### 异步加载的好处
  
  像一些工具库等辅助开发类的js，它没有操作dom的行为，我们并不想它的阻塞后续的解析处理

  #### 异步加载的三种方案

  - defer
    ``` js
    <script src="tool.js" defer="defer"></script> 
    ```

    它会等到dom文档全部解析完才会执行，所有的defer 脚本保证是按顺序依次执行的，此属性只有ie才能用
  
  - async

    async属性是HTML5新增的,IE9以上都能执行,比较普遍。但是它将在下载后立马执行，不能保证脚本会按顺序执行。它们将在onload 事件之前完成
    
    注意：这个在script标签里面不能写代码,只能引入外部文件

    ``` js
      <script type="text/javascript" src="demo.js" async="async"></script>
    ```

  - 企业级开发常用的异步加载形式

    我们常用的是使用js来封装一个加载方法,而不是设置async或者设置defer

    ``` js
      <script type="text/javascript" >
        function loadJs(url,callback) {
          var script=document.createElement("script");
          script.type="text/javascript";
          //兼容ie
          if(script.readyState){
            script.onreadystatechange=function(){
                if(script.readyState=="complete"||script.readyState=="loaded")
                    callback();
            }
          }else{
            script.onload=function(){
                callback();
            }
          }
          //设置了src后，浏览器已立马会去进行异步加载
          script.src=url;
          document.head.appendChild(script);
        }
      </script>
    ```



## 时间线

   浏览器对于js从加载到执行的整个过程变化

#### 加载和执行过程
1. 创建document对象，开始解析web页面。创建HTMLHtmlElement对象，添加到document中。这个阶段document.readyState = 'loading'。
2. 遇到link外部css，创建线程加载，并继续解析文档。并发
3. 遇到script外部js，并且没有设置async、defer，浏览器创建线程加载，并阻塞，等待js加载完成并执行该脚本，然后继续解析文档。
4. 遇到script外部js，并且设置有async、defer，浏览器创建线程加载，并继续解析文档。

    async属性的脚本，脚本加载完成后立即执行。
    defer==丢置尾部。
    document.createElement('script')的方式动态插入script元素来模拟async属性，实现脚本异步加载和执行。

5. 遇到img等，浏览器创建线程加载，并继续解析文档。并发
6. 当文档解析完成，document.readyState = 'interactive'。
7. 文档解析完成后，所有设置有defer的脚本会按照顺序执行。（注意与async的不同）
8. document对象触发DOMContentLoaded事件，这也标志着程序执行从同步脚本执行阶段，转化为事件驱动阶段。
9. 当所有async的脚本加载完成并执行后、img等加载完成后，document.readyState = 'complete'，window对象触发load事件。
10. 从此，以异步响应方式处理用户输入、网络事件等。
