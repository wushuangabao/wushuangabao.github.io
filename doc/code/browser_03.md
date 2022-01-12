# 【浏览器工作原理】页面性能：如何系统地优化页面？

```
tags:
  - JavaScript
  - 浏览器工作原理
categories:
  - 编程艺术

date: 2019-10-25 10:35:55
```

这里我们所谈论的页面优化，其实就是要让页面更快地显示和响应。由于一个页面在它不同的生命周期，侧重的关注点是不一样的，所以我们就要分析一个页面生存周期的不同阶段。


通常一个页面有三个阶段：**加载阶段、交互阶段和关闭阶段**。
- 加载阶段，是指从发出请求到渲染出完整页面的过程，影响到这个阶段的主要因素有网络和 JavaScript 脚本。
- 交互阶段，主要是从页面加载完成到用户交互的整合过程，影响到这个阶段的主要因素是 JavaScript 脚本。
- 关闭阶段，主要是用户发出指令后页面所做的一些清理操作。

这里我们要**重点关注加载阶段和交互阶段**，因为影响到我们体验到主要因素都在这两个阶段。下面我们来逐个分析一下。

## 加载阶段

![加载阶段渲染流水线](http://a4.qpic.cn/psb?/V11Tp57c2B9kPO/ZAH8T7KCb95FoiUatjUClxAU1UBxE8zvGXpNupdpfeo!/b/dJ8AAAAAAAAA&ek=1&kp=1&pt=0&bo=dgTLAQAAAAARF5g!&tl=1&vuin=445395697&tm=1572829200&sce=60-4-3&rf=viewer_4)

并非所有的资源都会阻塞页面的首次绘制，比如图片、音频、视频等文件；而 JavaScript、首次请求的 HTML 资源文件、CSS 文件是会阻塞首次渲染的，因为在构建 DOM 的过程中需要 HTML 和 JavaScript 文件，在构造渲染树的过程中需要 CSS 文件。

这些能阻塞页面首次渲染的资源被称为关键资源。基于关键资源，我们可以继续细化出三个影响页面首次渲染的核心因素。

1. 关键资源个数。
2. 关键资源大小。
3. 请求关键资源需要多少个 RTT（Round Trip Time）。

什么是 RTT 呢？当使用 TCP 协议传输一个文件时，由于 TCP 的特性，这个数据并不是一次传输到服务端的，而是需要拆分成一个个数据包来回多次进行传输的。RTT 就是这里的往返时延。它是网络中一个重要的性能指标，表示从发送端发送数据开始，到发送端收到来自接收的确认，总共经历的时延。通常一个 HTTP 数据包在 14KB 左右，所以一个 0.1M 的页面数据就需要拆分成 8 个包来传输，也就是说需要 8 个 RTT。

我们可以结合上图来看看它的关键资源请求需要多少个 RTT。首先是请求 HTML 资源，大小是 6KB，小于 14KB，所以 1 个 RTT 就可以解决了。至于 JavaScript 和 CSS 文件，这里需要注意一点，由于渲染引擎有一个预解析的线程，在接收到 HTML 数据之后，预解析线程会快速扫描 HTML 数据中的关键资源，一旦扫描到了，会立马发起请求，你可以认为 JavaScript 和 CSS 是同时发起请求的，所以它们的请求是重叠的，那么计算它们的 RTT 时，只需要计算体积最大的那个数据就可以了。这里最大的是 CSS 文件（9KB），所以我们就按照 9KB 来计算，同样由于 9KB 小于 14KB，所以 JavaScript 和 CSS 资源也就可以算成 1 个 RTT。也就是说，上图中关键资源请求共花费了 2 个 RTT。

所以总的优化原则是：**减少关键资源个数，降低关键资源大小、降低关键资源的 RTT 次数。**

- 可以将 JavaScript 和 CSS 改成内联的形式，比如上图中的 JavaScript 和 CSS 若都改成内联模式，那么关键资源的个数就从 3 个减少到了 1 个。
- 如果 JavaScript 代码没有 DOM 或者 CSSOM 的操作，则可以改成 async 或者 defer 属性；同样对于 CSS， 如果不是在构建页面之前加载的，则可以 CSSLink 属性之前添加取消阻止显现的标志。这时它们就变成了非关键资源。
- 减少关键资源的大小，可以压缩 CSS 和 JavaScript 资源，移除 HTML、CSS、JavaScript 文件中的一些注释内容。
- 可以使用 CDN 来减少每次 RTT 时长。

在优化实际页面的加载速度时，可以画出优化之前的关键资源的图表，然后按照上面的原则去优化，优化之后再画出优化之后的关键资源图表。

## 交互阶段

在交互阶段，帧的渲染速度决定了交互的流畅程度。因此讨论页面优化实际上就是讨论渲染引擎是如何渲染帧的。

先看交互阶段的渲染流水线（如下图）。和加载阶段的渲染流水线不同的地方是，交互阶段没有加载关键资源和构建 DOM、CCSOM 流程，通常是由 JavaScript 触发交互动画的。

![交互阶段渲染流水线](http://a2.qpic.cn/psb?/V11Tp57c2B9kPO/qpzSeXvvYfyMPCSHy0gGWocypDVBWZ*YwS1HUSCwMzI!/b/dBkBAAAAAAAA&ek=1&kp=1&pt=0&bo=dgTRAQAAAAARF4I!&tl=1&vuin=445395697&tm=1572854400&sce=60-4-3&rf=viewer_4)

综合上图，在大部分情况下，交互阶段生成一个新的帧都是由 JavaScript 通过修改 DOM 或 CCSOM 来触发的。还有另外一部分是由 CSS 来触发的。

如果在计算样式阶段发现有布局信息的修改，那么就会触发**重排**操作，然后触发后续一系列操作，这个代价是非常大的。

如果在计算样式阶段没有发现有布局信息的修改，只是修改了颜色一类的信息，那么就不会涉及到布局相关的调整，所以可以直接跳过布局阶段，直接进入绘制阶段，这个过程叫做**重绘**。不过重绘的代价也不小。

另外一种情况是通过 CSS 实现一些变形、渐变、动画等特效，这是由 CSS 触发的，并且是在合成线程上执行的，这个过程称为**合成**。因为不会触发重排或重绘，而且合成造作本身速度就非常快，所以执行合成是效率最高的方式。

知道了在交互阶段的帧是如何合成的，就可以讨论优化方案了。一个大的原则是**让单个帧的生成速度变快**。以下介绍影响帧生成速度的因素，以及优化手段。

### 减少 JavaScript 脚本执行时间

有时 JavaScript 函数的一次执行时间可能有几百毫秒，严重霸占了主线程执行其他渲染任务的时间。针对这种情况我们可以采取以下两种策略：
- 将一次执行的函数分解为多个任务，使得每次执行的时间不要过久。
- 采用 Web Workers。把 Web Workers 当作主线程之外的另一个线程，在 Web Worker 中是可以执行 JavaScript 脚本的，不过 Web Workers 中没有 DOM、CSSOM 环境，我们可以把一些和 DOM 操作无关且耗时的任务放到 Web Workers 中去执行。

总之，在交互阶段，对 JavaScript 脚本总的原则是不要一次霸占太久主线程。

### 避免强制同步布局

通过 DOM 接口执行添加元素或者删除元素等操作后，是需要重新计算样式和布局的。正常情况下这些操作都是在另外的任务中异步完成的，这样做是为了避免当前的任务占用太长的主线程时间。

```
<html>
<body>
    <div id="mian_div">
        <li id="time_li">time</li>
        <li>geekbang</li>
    </div>

    <p id="demo"> 强制布局 demo</p>
    <button onclick="foo()"> 添加新元素 </button>

    <script>
        function foo() {
            let main_div = document.getElementById("mian_div")      
            let new_node = document.createElement("li")
            let textnode = document.createTextNode("time.geekbang")
            new_node.appendChild(textnode);
            document.getElementById("mian_div").appendChild(new_node);
        }
    </script>
</body>
</html>
```

对于上面这段代码，可以使用 Performance 工具来记录添加元素的过程，如下图所示：

![Performance 记录添加元素的执行过程](http://m.qpic.cn/psb?/V11Tp57c2B9kPO/HxLMwhc55LJVRZ2Gm0ms67RYJYw*QLQgrmVg0oms15o!/b/dFwAAAAAAAAA&bo=dgTjAAAAAAARF7E!&rf=viewer_4)

从图中看，执行 JavaScript 添加元素是在一个任务中执行的，重新计算布局是在另一个任务中执行，这就是正常情况下的布局操作。

所谓强制同步布局，是指 JavaScript 强制将计算样式和布局操作提前到当前的任务中。为直观理解，对上述代码做一点修改，让它变成强制同步布局：

```
function foo() {
    let main_div = document.getElementById("mian_div")
    let new_node = document.createElement("li")
    let textnode = document.createTextNode("time.geekbang")
    new_node.appendChild(textnode);
    document.getElementById("mian_div").appendChild(new_node);
    // 由于要获取到 offsetHeight，
    // 但是此时的 offsetHeight 还是老的数据，
    // 所以需要立即执行布局操作
    console.log(main_div.offsetHeight)
}
```

这里在获取到 main_div 的高度之前，JavaScript 还需要强制让渲染引擎默认执行一次布局操作。我们把这个操作称为强制同步布局。

![触发强制同步布局的 Performance 记录的任务状态](http://m.qpic.cn/psb?/V11Tp57c2B9kPO/Q5jt4zbOR4qxuBdbYHoZn20p1fpqbZI9XauDi9n6iK4!/b/dM8AAAAAAAAA&bo=dgSZAQAAAAARF8o!&rf=viewer_4)

上图中可以看到，计算样式和布局都是在当前脚本执行过程中触发的，这就是强制同步布局。

为了避免强制同步布局，我们可调整策略，在修改 DOM 信息之前查询相关值。代码如下：

```
function foo() {
    let main_div = document.getElementById("mian_div")
    // 为了避免强制同步布局，在修改 DOM 之前查询相关值
    console.log(main_div.offsetHeight)
    let new_node = document.createElement("li")
    let textnode = document.createTextNode("time.geekbang")
    new_node.appendChild(textnode);
    document.getElementById("mian_div").appendChild(new_node);
    
}
```

### 避免布局抖动

布局抖动是比强制同步布局更坏的情况。所谓布局抖动，是指在一次 JavaScript 执行过程中，多次执行强制布局和抖动操作。

```
function foo() {
    let time_li = document.getElementById("time_li")
    for (let i = 0; i < 100; i++) {
        let main_div = document.getElementById("mian_div")
        let new_node = document.createElement("li")
        let textnode = document.createTextNode("time.geekbang")
        new_node.appendChild(textnode);
        new_node.offsetHeight = time_li.offsetHeight;
        document.getElementById("mian_div").appendChild(new_node);
    }
}
```

上述代码在一个 for 循环语句里不断读取属性值，每次读取属性值之前都要进行计算样式和布局。执行代码之后，使用 Performance 记录的状态如下所示：

![Performance 中关于布局抖动的表现](http://m.qpic.cn/psb?/V11Tp57c2B9kPO/JjCER6qP0w2U0iZ1Gr10NI1teXVQT*FtDQB2As1*M*E!/b/dEAAAAAAAAAA&bo=dgSVAQAAAAARF8Y!&rf=viewer_4)

避免这种情况的方式也是尽量不要在修改 DOM 结构时再去查询一些相关值。

### 合理利用 CSS 合成动画

合成动画是在合成线程上执行的，这和布局、绘制等在主线程上执行的操作不同，如果主线程被 JavaScript 或者一些布局任务占用，CSS 动画依然能继续执行。所以如果能让 CSS 处理动画，就尽量让 CSS 来操作。

另外，如果能提前知道对哪个元素执行动画操作，那就最好将其标记为 will-change，这是告诉渲染引擎需要将该元素单独生成一个图层。

### 避免垃圾的频繁回收

如果在一些函数中频繁创建临时对象，那么垃圾回收也会频繁地去执行垃圾回收策略。当垃圾回收时会占用主线程，影响其他任务的执行，严重的话还会产生掉帧、不流畅的感觉。

所以要尽量避免产生那些临时垃圾数据——尽可能优化存储结构，避免小颗粒对象的产生。

## 总结

我们主要讲解了如何系统优化加载阶段和交互阶段的页面。

在加载阶段，核心的优化原则是：优化关键资源的加载速度，减少关键资源的个数，降低关键资源的 RTT 次数。

在交互阶段，核心的优化原则是：尽量减少一帧的生成时间。可以通过减少单次 JavaScript 的执行时间、避免强制同步布局、避免布局抖动、尽量采用 CSS 的合成动画、避免频繁的垃圾回收等方式。