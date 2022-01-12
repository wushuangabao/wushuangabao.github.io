# 【编程范式】编程的本质

```
tags:
  - 编程范式
categories:
  - 编程艺术

date: 2019-08-20 21:47:02
```

**Program = Logic + Control + Data Structure**


## 两篇论文

1976年，瑞士计算机科学家，Algol W，Modula，Oberon 和 Pascal 语言的设计师 Niklaus Emil Wirth写了"Algorithms + Data Structures = Programs" ，即《算法 + 数据结构 = 程序》。

1979 年，英国逻辑学家和计算机科学家 Robert Kowalski 发表论文 "Algorithm = Logic + Control"，论文里提到：

> 任何算法都会有两个部分， 一个是 Logic 部分，这是用来解决实际问题的。另一个是 Control 部分，这是用来决定用什么策略来解决问题。Logic 部分是真正意义上的解决问题的算法，而 Control 部分只是影响解决这个问题的效率。程序运行的效率问题和程序的逻辑其实是没有关系的。我们认为，**如果将 Logic 和 Control 部分有效地分开，那么代码就会变得更容易改进和维护。**

## 编程的本质

- Programs = Algorithms + Data Structures
- Algorithm = Logic + Control

第二个表达式想表达的是，数据结构不复杂，复杂的是算法。算法由两个逻辑组成，一个是真正的业务逻辑，另外一种是控制逻辑。业务逻辑是复杂的。

算法的效率往往可以通过提高控制部分的效率来实现，而无须改变逻辑部分（也就是算法的意义）。
举个阶乘的例子， `X(n)！= X(n) * X(n-1) * X(n-2) * X(n-3)* … * 3 * 2 * 1`。

**逻辑**——定义阶乘：
> 1） 1 是 0 的阶乘；
> 2）如果 v 是 x 的阶乘，且 u=v*(x+1)，那么 u 是 x+1 的阶乘。

**控制**——实现上面的逻辑：
用这个定义，既可以从上往下地将 x+1 的阶乘缩小为先计算 x 的阶乘，再将结果乘以 1（recursive，递归），也可以由下而上逐个计算一系列阶乘的结果（iteration，遍历）。

各种编程范式或程序设计的方法，比如：

- 函数式编程中的 Map/Reduce/Filter，它们都是一种控制。而传给这些控制模块的那个 Lambda 表达式才是我们要解决的问题的逻辑。它们共同组成了一个算法。
- 就像 Go 语言委托模式的那个 Undo。Undo 是我们要解决的问题，是 Logic，但是 Undo 的流程是控制。
- 就像我们面向对象中依赖于接口，而不是依赖于实现。接口是对逻辑的抽象，真正的逻辑放在不同的具象类中，通过多态或是依赖注入这样的控制来完成对数据在不同情况下的不同处理。

所有的语言或编程范式都在解决以下 3 个问题（它们体现了编程范式的本质）：

- **Control 是可以标准化的。**比如：遍历数据、查找数据、多线程、并发、异步等，都是可以标准化的。
- 因为 **Control 需要处理数据**，所以标准化 Control，需要**标准化 Data Structure**。我们可以通过泛型编程来解决这个事。
- 因为 **Control 需要处理用户的业务逻辑**，即 Logic。所以，我们通过**标准化接口 / 协议来**实现，我们的 Control 模式可以适配于任何的 Logic。

## 把逻辑和控制分离

**有效地分离 Logic、Control 和 Data 是写出好程序的关键所在！**

业务逻辑决定了程序的复杂度，业务逻辑本身就复杂。把控制逻辑和业务逻辑放在一块，代码就不可能写得简单。
Logic 是程序复杂度的下限。Logic + Control 的互相交织成为了最终的程序复杂度。

- 逻辑是你的业务逻辑：逻辑过程的抽象 + 一个由术语表示的数据结构的定义。业务逻辑跟控制逻辑是没关系的。
- 控制，即程序执行的方式：一个程序流转的方式（自顶向下、自底向上） + 执行过程的策略（并行或串行，同步或异步） + 调度不同的执行路径或模块 + 数据之间的存储关系。这些和业务逻辑没有关系。

### 以文本解析为例

前不久，我自己写了一个“服装制板语言”的解释器，代码里把 Logic 和 Control 都混在了一起，全部在一个解析函数里，这个函数十分冗长。

学习完“编译原理之美”后，我发现写“文本解析”有通用的套路：

1. 词法分析。用一个有限自动机来匹配特定的 Token；
2. 语法分析。用“递归向下”、“上下文无关”等方法构建一个“抽象语法树”。
3. 语义分析。……

这个通用的套路就属于 Control。有篇关于正则表达式的高效算法的论文，叫“Regular Expression Matching Can Be Simple And Fast”。

### 以表单检查为例

常见的检查用户表单信息的代码：
```
function check_form_x() {
    var name = $('#name').val();
    if (null == name || name.length <= 3) {
        return { status : 1, message: 'Invalid name' };
    }
 
    var password = $('#password').val();
    if (null == password || password.length <= 8) {
        return { status : 2, message: 'Invalid password' };
    }
 
    var repeat_password = $('#repeat_password').val();
    if (repeat_password != password.length) {
        return { status : 3, message: 'Password and repeat password mismatch' };
    }
 
    var email = $('#email').val();
    if (check_email_format(email)) {
        return { status : 4, message: 'Invalid email' };
    }
 
    ...
 
    return { status : 0, message: 'OK' };
 
}
```

其实，我们可以做一个 DSL + 一个 DSL 的解析器，比如：
```
var meta_create_user = {
    form_id : 'create_user',
    fields : [
        { id : 'name', type : 'text', min_length : 3 },
        { id : 'password', type : 'password', min_length : 8 },
        { id : 'repeat-password', type : 'password', min_length : 8 },
        { id : 'email', type : 'email' }
    ]
};
 
var r = check_form(meta_create_user);
```

这样，DSL 描述是“Logic”，而 `check_form` 则成了“Control”，代码就非常好看了。

## 小结

代码复杂度的原因：
- 业务逻辑的复杂度决定了代码的复杂度；
- 控制逻辑的复杂度 + 业务逻辑的复杂度 => 程序代码的混乱不堪；

绝大多数程序复杂混乱的根本原因：业务逻辑与控制逻辑的耦合。

- Logic 部分才是真正有意义的（What）
- Control 部分只是影响 Logic 部分的效率（How）

**如何分离 Control 和 Logic 呢？**我们可以使用下面的这些技术来解耦。

状态机 - State Machine
- 状态定义
- 状态变迁条件
- 状态的 action

DSL - Domain Specific Language
- HTML，SQL，Unix Shell Script，AWK，正则表达式……

编程范式
- 面向对象：委托、策略、桥接、修饰、IoC/DIP、MVC……
- 函数式编程：修饰、管道、拼装
- 逻辑推导式编程：Prolog