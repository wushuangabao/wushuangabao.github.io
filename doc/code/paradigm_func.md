# 【编程范式】函数式编程

```
tags:
  - 编程范式
categories:
  - 编程艺术
toc: false
date: 2019-07-25 16:15:44
```

Functional Programming
**核心思想**：将运算过程尽量写成一系列嵌套的函数调用，关注的是做什么而不是怎么做（声明式）。


λ 演算是一套用于研究函数定义、函数应用和递归的形式系统。

Alonzo 说，像 boolean、intergers 或者其他的数据结构都可以被函数取代掉。

## 特性

对于函数式编程来说，它只关心**定义输入数据和输出数据相关的关系**，数学表达式里面其实是在做一种映射（mapping），输入的数据和输出的数据关系是什么样的，是用函数来定义的。

函数式编程有以下**特征**：
- **stateless**：函数不维护任何状态。它不存在状态。
- **immutable**：输入数据是不能动（不可变）的，要返回新的数据集。

**优势**：
- 没有状态就没有伤害。
- 并行执行无伤害。
- Copy-Paste 重构代码无伤害。
- 函数的执行没有顺序上的问题。

有以下好处：
- **惰性求值**。这需要编译器的支持，表达式不在它被绑定到变量之后就立即求值，而是在该值被取用的时候求值。
- **确定性**。同一个参数，在不同的场景下会计算出相同的结果。所谓不同的场景，就是我们的函数会根据运行中的状态信息的不同而发生变化。

我们知道，因为状态，在并行执行和 copy-paste 时引发 bug 的概率是非常高的，所以没有状态就没有伤害，就像没有依赖就没有伤害一样，并行执行无伤害，copy 代码无伤害，因为没有状态，代码怎样拷都行。

**劣势**：数据复制比较严重。（不见得会导致性能不好，因为没有状态，代码可以拼命地并发，反而让性能很不错，Erlang 就是其中的代表。）

```
int cnt;
void increment(){
    cnt++;
}
```

这个函数调用了全局变量，这个函数就是有外部状态的。如果是多线程，这个代码不安全。
如果写成纯 pure function函数，应该是下面这样：

```
int increment(int cnt){
    return cnt++;
}
```

代码随便拷，而且与线程无关。并行的时候不用锁，因为是复制了原有的数据并返回了新的数据。

各个语言对**纯函数式**（即完全没有状态的函数）的支持程度如下：
- 完全纯函数式 Haskell
- 容易写纯函数 F#, Ocaml, Clojure, Scala
- 纯函数需要花点精力 C#, Java, JavaScript

函数式编程和过程式编程的思维方式完全不一样。函数式编程的抽象度更大，在实现方式上，有函数套函数、函数返回函数、函数里定义函数……

## 用到的技术

- **first class function**（头等函数）：让函数像变量一样来使用。
- **tail recursion optimization**（尾递归优化）：递归太深会导致 stack 受不了，并导致性能大幅度下降。支持尾递归优化就是每次递归都会重用 stack，这样能够提升性能。有的语言或编译器不支持，如 Python。
- **map & reduce**：函数式编程最常见的技术就是对一个集合做 Map 和 Reduce 操作。很像 C++ STL 中 foreach、find_if、count_if 等函数的玩法。
- **pipline**（管道）：将函数实例成一个个 action，然后组成一个 action list，再传入数据。数据就像一个 pipline 一样顺序地被各个函数所操作。
- **recursing**（递归）：递归最大的好处是简化代码。精髓在于描述问题，这也正是函数式编程的精髓。
- **currying**（柯里化）：将一个函数的多个参数分解成多个函数，这样可以简化函数的多个参数。很像 C++ STL 中的 bind1st 或 bind2nd。
- **higher order function**（高阶函数）：就是把函数当参数，把传入的函数做一个封装，然会返回封装后的函数。现象上就是函数传入传出。用来做 Decorator 很不错。

体会函数式编程的理念：

```
def inc(x):
    def incx(y):
        return x+y
    return incx
 
inc2 = inc(2)
inc5 = inc(5)
 
print inc2(5)  # 输出 7
print inc5(5)  # 输出 10
```

我们可以看到，`inc()`函数返回了另一个函数`incx()`，于是可以用`inc()`函数来构造各种版本的 inc 函数，比如：`inc2()`和`inc5()`。这个技术其实就是上面所说的 **currying** 技术。

理念：把函数当成变量来用，**关注描述问题**而不是怎么实现。（Describe what to do, rather than how to do it.）

典型代表：Lisp 语言，它的数据和函数都是采用符号表达式定义的。

## 函数式编程的思维方式

以前的过程式编程范式，被称作 Imperative Programming——指令式编程；
函数式编程范式，被称作 Declarative Programming——声明式编程。

用 Python 解决一个问题：

> 有 3 辆车比赛，简单起见，这 3 辆车分别有 70% 的概率和  5 次机会往前走一步。打出每一次这 3 辆车的前行状态。

### 指令式的写法

```
from random import random
 
time = 5
car_positions = [1, 1, 1]
 
while time:
    # decrease time
    time -= 1
 
    print ''
    for i in range(len(car_positions)):
        # move car
        if random() > 0.3:
            car_positions[i] += 1
 
        # draw car
        print '-' * car_positions[i]
```

我们可以把这两重循环变成一些函数模块，这样更容易阅读代码：

```
from random import random
 
def move_cars():
    for i, _ in enumerate(car_positions):
        if random() > 0.3:
            car_positions[i] += 1
 
def draw_car(car_position):
    print '-' * car_position
 
def run_step_of_race():
    global time
    time -= 1
    move_cars()
 
def draw():
    print ''
    for car_position in car_positions:
        draw_car(car_position)
 
time = 5
car_positions = [1, 1, 1]
 
while time:
    run_step_of_race()
    draw()
```

对于指令式编程来说，我们把一个问题的解决逻辑拆分成一些函数模块，这样有利于更容易地阅读代码——将代码逻辑封装成了函数之后，相当于给每个相对独立的逻辑取了个名字，于是代码成了自解释的。

但是，**封装成函数后，这些代码都会依赖于共享的变量来同步其状态**。在读代码时，我们在函数里读到访问了一个外部变量的时候，就要马上去查看这个变量的上下文，然后在大脑里推演这个变量的状态，才能知道程序的真正逻辑。也就是说，这些函数必须知道其它函数是怎么修改它们之间的共享变量的。所以，这些函数是有状态的。

### 函数式的写法

有状态，对于代码重用、代码并行，都有副作用。函数式编程范式可以把这些状态搞掉。

```
from random import random
 
def move_cars(car_positions):
    return map(lambda x: x + 1 if random() > 0.3 else x,
               car_positions)
 
def output_car(car_position):
    return '-' * car_position
 
def run_step_of_race(state):
    return {'time': state['time'] - 1,
            'car_positions': move_cars(state['car_positions'])}
 
def draw(state):
    print ''
    print '\n'.join(map(output_car, state['car_positions']))
 
def race(state):
    draw(state)
    if state['time']:
        race(run_step_of_race(state))
 
race({'time': 5,
      'car_positions': [1, 1, 1]})
```

依然是把程序的逻辑分成了函数，不过这些函数都是函数式的。**它们之间没有共享的变量；函数间通过参数和返回值来传递数据；在函数里没有临时变量**。并且，for 循环被递归取代了，而递归的本质就是描述问题是什么。

## 函数式语言的三件套

Map, Reduce, Filter：**它们不关心输入数据，它们只是控制，并不是业务**。控制是描述怎么干，而业务是描述要干什么。

需求示例：把一个字符串数组中的字符串都转成小写（Python）。

```
# 传统的非函数式
upname =['HAO', 'CHEN', 'COOLSHELL']
lowname =[] 
for i in range(len(upname)):
    lowname.append( upname[i].lower() )
```

```
# 函数式
def toUpper(item):
      return item.upper()
 
upper_name = map(toUpper, ["hao", "chen", "coolshell"])
print upper_name  # 输出 ['HAO', 'CHEN', 'COOLSHELL']
```

再看一个对比示例：

```
# 计算数组中正数的平均值
num =  [2, -5, 9, 7, -2, 5, 3, 1, 0, -3, 8]
positive_num_cnt = 0
positive_num_sum = 0
for i in range(len(num)):
    if num[i] > 0:
        positive_num_cnt += 1
        positive_num_sum += num[i]
 
if positive_num_cnt > 0:
    average = positive_num_sum / positive_num_cnt
 
print average
```

```
# 计算数组中正数的平均值
positive_num = filter(lambda x: x>0, num)
average = reduce(lambda x,y: x+y, positive_num) / len( positive_num )
```

隐藏了数组遍历并过滤数组控制流程的 filter 和 reduce，不仅让代码更为简洁，因为代码里只有业务逻辑了，而且让我们能更容易地理解代码。

- 数据集、对数据的操作和返回值都放在了一起。
- 没有了循环体，就可以少了些临时用来控制程序执行逻辑的变量，也少了把数据倒来倒去的控制逻辑。
- 代码变成了在描述你要干什么，而不是怎么干。

## 函数式的 pipline 模式

设计哲学：让每个功能就做一件事，并把这件事做到极致，软件或程序的拼装就会变得更为简单和直观。它影响深远，包括今天的 Web Service、云计算、大数据的流式计算等。

pipline（管道）借鉴 Unix Shell 的管道操作——把若干个命令串起来，前面命令的输出成为后面命令的输入，如此完成一个流式计算。

比如如下的 shell 命令：
```
ps auwwx | awk '{print $2}' | sort -n | xargs echo
```

抽象成函数式的样子（反过来，一层套一层）：
```
xargs(  echo, sort(n, awk('print $2', ps(auwwx)))  )
```

当然，也可以把函数放进数组里，然后顺序执行：
```
pids = for_each(result, [ps_auwwx, awk_p2, sort_n, xargs_echo])
```

如果把函数比作微服务，管道就像是在做服务的编排。

### 实现 pipline 的简单示例

一个程序的 process() 有三个步骤：
1. 找出偶数；
2. 乘以3；
3. 转成字符串返回。

传统的非函数式实现如下：

```
def process(num):
    # filter out non-evens
    if num % 2 != 0:
        return
    num = num * 3
    num = 'The Number: %s' % num
    return num
 
nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
 
for num in nums:
    print process(num)
    
# 输出：
# None
# The Number: 6
# None
# The Number: 12
# None
# The Number: 18
# None
# The Number: 24
# None
# The Number: 30
```

函数式的 pipline（第一种方式）怎么写？

先把三个“子需求”写成函数，然后再把这三个函数串起来：

```
def even_filter(nums):
    for num in nums:
        if num % 2 == 0:
            yield num
def multiply_by_three(nums):
    for num in nums:
        yield num * 3
def convert_to_string(nums):
    for num in nums:
        yield 'The Number: %s' % num

nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
pipeline = convert_to_string(multiply_by_three(even_filter(nums)))
for num in pipeline:
    print num
# 输出：
# The Number: 6
# The Number: 12
# The Number: 18
# The Number: 24
# The Number: 30
```

上面，我们动用了 Python 的关键字 yield，它是一个类似 return 的关键字，只是这个函数返回的是 Generator（生成器）。

所谓生成器，指的是 yield 返回的是一个可迭代的对象，并没有真正的执行函数。也就是说，只有其返回的迭代对象被迭代时，yield 函数才会真正运行，运行到 yield 语句时就会停住，然后等下一次的迭代。这就是 lazy evluation（懒惰加载）。

好了，根据前面的原则——“**使用 Map & Reduce，不要使用循环**”（使用循环会让我们只能使用顺序型的数据结构），那我们用比较纯朴的 Map & Reduce 吧：

```
def even_filter(nums):
    return filter(lambda x: x%2==0, nums)
 
def multiply_by_three(nums):
    return map(lambda x: x*3, nums)
 
def convert_to_string(nums):
    return map(lambda x: 'The Number: %s' % x,  nums)
 
nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
pipeline = convert_to_string(
               multiply_by_three(
                   even_filter(nums)
               )
            )
for num in pipeline:
    print num
```

上面的代码变得更易读了，但是需要嵌套使用函数。如果能向下面这样就好了（第二种方式）：

```
pipeline_func(nums, [even_filter,
                     multiply_by_three,
                     convert_to_string])

def pipeline_func(data, fns):
    return reduce(lambda a, x: x(a),   fns,   data)

```

当然，使用 Python 的 `force` 函数以及 decorator 模式可以把上面的代码写得更像管道：

```
class Pipe(object):
    def __init__(self, func):
        self.func = func
 
    def __ror__(self, other):
        def generator():
            for obj in other:
                if obj is not None:
                    yield self.func(obj)
        return generator()
 
@Pipe
def even_filter(num):
    return num if num % 2 == 0 else None
 
@Pipe
def multiply_by_three(num):
    return num*3
 
@Pipe
def convert_to_string(num):
    return 'The Number: %s' % num
 
@Pipe
def echo(item):
    print item
    return item
 
def force(sqs):
    for item in sqs: pass
 
nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
 
force(nums | even_filter | multiply_by_three | convert_to_string | echo)
```

## 小结

相对于计算机发展史，函数式编程是个非常古老的概念，它的核心思想是**将运算过程尽量写成一系列嵌套的函数调用，关注的是做什么而不是怎么做**，因而被称为声明式编程。

以 Stateless（无状态）和 Immutable（不可变）为主要特点，代码简洁，易于理解，能便于进行并行执行，易于做代码重构，函数执行没有顺序上的问题，支持惰性求值，具有函数的确定性——无论在什么场景下都会得到同样的结果。

本文结合递归、map 和 reduce，以及 pipeline 等技术，对比了非函数式编程和函数式编程在解决相同问题时的不同处理思路，让你对函数式编程范式有了清晰明确的认知。并在文末引入了 decorator（修饰器），使得将普通函数管道化成为一件轻而易举的事情。
