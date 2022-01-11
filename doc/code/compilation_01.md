# 【编译原理之美】面向对象的实现

```
tags:
  - 编译原理
originContent: ''
categories:
  - 编程艺术
toc: false
date: 2019-09-02 13:59:14
```

- 从（编译原理的）语义设计和运行时机制的角度，剖析面向对象的特性。
- 理解面向对象的实现机制。


## 面向对象的语义特征

**从类型角度：**
类型处理是语义分析时的重要工作。我们要扩展语言的类型机制，让程序员可以在基础数据类型之上扩展自己的类型。

**从作用域角度：**
- 类的可见性。
- 对象的成员的作用域。它们可以在整个对象的内部访问，无论在哪个位置声明（这点，和函数或块中的本地变量不一样）。

**从生存期的角度：**
- 对象的成员变量的生存期，一般跟对象的生存期是一样的。当然，如果某个成员引用了从堆中申请的内存，这些内存需要手动释放或者由垃圾收集机制释放。
- 还有一些成员，不是与对象绑定的，而是与类型绑定的，比如静态成员。静态成员的作用域和生存期都与普通成员不同。

以上三个语义概念，解释清楚了面向对象的封装特性（在底层的实现）。

## 类的语法（设计与解析）

### 设计

语法规则如下：

```
classDeclaration
    : CLASS IDENTIFIER
      (EXTENDS typeType)?
      (IMPLEMENTS typeList)?
      classBody
    ;

classBody
    : '{' classBodyDeclaration* '}'
    ;

classBodyDeclaration
    : ';'
    | memberDeclaration
    ;

memberDeclaration
    : functionDeclaration
    | fieldDeclaration
    ;

functionDeclaration
    : typeTypeOrVoid IDENTIFIER formalParameters ('[' ']')*
      (THROWS qualifiedNameList)?
      functionBody
    ;
```

- 类声明以 class 关键字开头，有一个标识符是类型名称，后面跟着类的主体。
- 类的主体里要声明类的成员。在简化的情况下，可以只关注类的属性和方法两种成员。我们故意把类的方法也叫做 function，而不是 method，是想把对象方法和函数做一些统一的设计。
- 函数声明现在的角色是类的方法。
- 类的成员变量的声明和普通变量声明在语法上没什么区别。

之前形成的一些基础的语法模块都可以复用，比如变量声明、代码块（block）等。

可以运行它：

```
/*
ClassTest.play 简单的面向对象特性。
*/
class Mammal{
  // 类属性
  string name = "";

  // 构造方法
  Mammal(string str){
    name = str;
  }

  // 方法
  void speak(){
    println("mammal " + name +" speaking...");
  }
}

Mammal mammal = Mammal("dog"); //playscript 特别的构造方法，不需要 new 关键字
mammal.speak();                          // 访问对象方法
println("mammal.name = " + mammal.name); // 访问对象的属性

// 没有构造方法，创建的时候用缺省构造方法
class Bird{
  int speed = 50;    // 在缺省构造方法里初始化

  void fly(){
    println("bird flying...");
  }
}

Bird bird = Bird();              // 采用缺省构造方法
println("bird.speed : " + bird.speed + "km/h");
bird.fly();
```

### 解析

做完词法分析和语法分析之后，playscript 会在语义分析阶段扫描 AST，识别出所有自定义的类型，以便在其他地方引用这些类型来声明变量。
因为类型的声明可以在代码中的任何位置，所以最好用单独的一次遍历来识别和记录类型。
（类型扫描的代码在 TypeAndScopeScanner.java 里。）

语义分析的工作之一，就是做变量类型的消解。当我们声明 `Bird bird = Bird();` 时，需要知道 Bird 对象的定义在哪里。
（变量类型消解的代码在 TypeResolver.java 里。）

语义分析时，把类型的定义保存在一个数据结构中，实现如下：
```
public class Class extends Scope implements Type{
    ...
}

public abstract class Scope extends Symbol{
    // 该 Scope 中的成员，包括变量、方法、类等。
    protected List<Symbol> symbols = new LinkedList<Symbol>(
}

public interface Type {
    public String getName();    // 类型名称

    public Scope getEnclosingScope();
}
```

其中，Class 就是一个 Scope。Scope 里原来就能保存各种成员，现在可以直接复用。

类图如下：

![](http://a4.qpic.cn/psb?/V11Tp57c2B9kPO/BkzZUdSSmBXV0IJQWJBElhcGRaSGZV*n.k4NT1ceFv8!/b/dKMAAAAAAAAA&ek=1&kp=1&pt=0&bo=dgTdAQAAAAARF44!&tl=3&vuin=445395697&tm=1567400400&sce=60-2-2&rf=viewer_4)

图中的几个类是符号体系的主要成员。在做词法分析时，我们会解析出很多**标识符**，这些标识符出现在不同的语法规则里，包括变量声明、表达式，以及作为类名、方法名等出现。
在语义分析阶段，我们要把这些标识符一一识别：这个是一个变量，指的是一个本地变量；那个是一个方法名等。

变量、类和函数的名称，我们都叫做符号，比如示例程序中的 Mammal、Bird、mammal、bird、name、speed 等。
编译过程中的一项重要工作就是**建立符号表**，它帮助我们进一步地编译或执行程序，而符号表就用上面几个类来保存信息。
在符号表里，我们保存它的名称、类型、作用域等信息。对于类和函数，我们也有相应的地方来保存类变量、方法、参数、返回值等信息。你可以看一看示例代码里面是如何解析和记录这些符号的。

## 面向对象程序的运行机制

### 实例化对象

我们的语法中没有使用 new 关键字，而是直接调用一个跟类名相同的函数，示例代码如下：

```
Mammal mammal = Mammal("dog"); //playscript 特别的构造方法，不需要 new 关键字
Bird bird = Bird();            // 采用缺省构造方法
```

语义检查时，无法在当前作用域找到这样的函数。我们需要检查 Mammal 和 Bird 是不是类名。
在 RefResolver.java 中做语义分析的时候，下面的代码能够检测出某个函数调用其实是类的构造方法，或者是缺省构造方法：

```
// 看看是不是类的构建函数，用相同的名称查找一个 class
Class theClass = at.lookupClass(scope, idName);
if (theClass != null) {
    function = theClass.findConstructor(paramTypes);
    if (function != null) {
        at.symbolOfNode.put(ctx, function);
    }
    // 如果是与类名相同的方法，并且没有参数，那么就是缺省构造方法
    else if (ctx.expressionList() == null){
        at.symbolOfNode.put(ctx, theClass); // TODO 直接赋予 class
    }
    else{
        at.log("unknown class constructor: " + ctx.getText(), ctx);
    }

    at.typeOfNode.put(ctx, theClass); // 这次函数调用是返回一个对象
}
```

类的构造方法跟普通函数有所不同，比如我们不允许构造方法定义返回值，因为它的返回值一定是这个类的一个实例对象。

### 对象数据的内存管理

我们可以把对象的数据和其他数据一样，保存在栈里。C 语言的结构体 struct 和 C++ 语言的对象，都可以保存在栈里（直接声明并实例化，而不是用 new 关键字创建的）。如果用 new 关键字来创建，实际上是在堆里申请一块内存，赋值给一个指针变量。

当对象保存在堆里的时候，可以有多个变量都引用同一个对象，对象的生存期可以超越创建它的栈桢的生存期。

分析完对象的内存管理方式之后，回到 playscript 的实现。在 playscrip 的 Java 版本里，我们用一个 ClassObject 对象来保存对象数据，而 ClassObject 是 PlayObject 的子类。我们已经讲过 PlayObject，它被栈桢用来保存本地变量，可以通过传入 Variable 来访问对象的属性值：

```
// 类的实例
public class ClassObject extends PlayObject{
     // 类型
    protected Class type = null;
    ... 
}

// 保存对象数据
public class PlayObject {
    // 成员变量
    protected Map<Variable, Object> fields = new HashMap<Variable, Object>();

    public Object getValue(Variable variable){
        Object rtn = fields.get(variable);
        return rtn;
    }

    public void setValue(Variable variable, Object value){
        fields.put(variable, value);
    }
}
```

### 访问对象的属性和方法

在示例代码中，我们用点操作符来访问对象的属性和方法，比如：

```
mammal.speak();                          // 访问对象方法
println("mammal.name = " + mammal.name); // 访问对象的属性
```

属性和方法的引用也是一种表达式，语法定义如下：

```
expression
    : ...
    | expression bop='.'
      ( IDENTIFIER       // 对象属性
      | functionCall     // 对象方法
      )
     ...
     ;
```

注意，点符号的操作可以是级联的，比如：

```
obj1.obj2.field1;
obj1.getObject2().field1;
```

所以，对表达式的求值，要能够获得正确的对象引用。可以参考 [GitHub 项目](https://github.com/RichardGong/PlayWithCompiler)中的实现。

另外，对象成员还可以设置可见性。这是个语义问题，在编译阶段做语义检查的时候，不允许私有的成员被外部访问，报编译错误就可以了，其他方面没有不同。