# 【编译原理之美】作用域和生存期

```
tags:
  - 编译原理
categories:
  - 编程艺术

date: 2019-08-30 13:45:30
```

使用 Antlr 工具，我们实现了简单的脚本解释器。
当然，还有一些更高级的功能也能实现，比如函数功能、面向对象功能。
只是我们还要克服一些挑战，如：
- 如果要实现函数功能，要升级变量管理机制；
- 引入作用域机制，来保证变量的引用指向正确的变量定义；
- 变量存储，不能再把变量和它的值简单的存储到一个 HashMap 里。要管理它的生存期，减少对内存的占用。

本文将借实现**块级作用域**和**函数功能**，带你讨论作用域和生存期及其实现机制，并升级变量管理机制。

深入理解作用域和生存期，了解它们在编译期和运行期的机制之后，可以回答一些实际问题：
- 闭包的机理到底是什么？
- 为什么需要栈和堆两种机制来管理内存？
- 一个静态的内部类和普通的内部类有什么区别？


## 作用域（Scope）

作用域是指计算机语言中变量、函数、类等起作用的范围。

以 C 语言为例，它的作用域包括这些规律：
- 变量的作用域有大有小，外部变量可以在函数内访问，而函数中的本地变量，只有在本地才可以访问。
- 变量的作用域，从声明以后开始。
- 在函数中，可以声明与外部变量同名的变量，它会覆盖外部变量。
- 块级作用域（用花括号包围的语句）的特征和函数作用域的特征相似。

即使是**相同的**块级作用域（花括号）**语法**，不同语言（C, Java, JS）的作用域特征都不尽相同。这种不同是**语义差别**的一个例子。

对作用域的分析就是语义分析的任务之一。
Antlr 能够完成很多词法分析和语法分析的工作，但语义分析工作需要我们自己做。

## 生存期（Extent）

生存期是指变量可以被访问的时间段，也就是从“分配内存给它”到“收回它的内存”之间的时间。

**本地变量**的特征：变量的生存期和作用域是一致的。本地变量用栈来管理。

有些情况，变量的生存期跟语法上的作用域不一致，比如在堆中申请的内存，退出作用域后仍然存在。
在 C 语言中，通过 free() 回收堆中的内存；在 Java 和 JS 中，通过垃圾回收机制。

虽然各门语言设计上的特性是不同的，但在**运行期**的机制都很相似，比如都会用到栈和堆来做**内存管理**。

## 实现作用域

之前处理变量赋值时，我们简单地把变量存在一个哈希表里，用变量名去引用，就像下面这样：

```
public class SimpleScript {
    private HashMap<String, Integer> variables = new HashMap<String, Integer>();
    ...
}
```

但如果变量存在多个作用域，这样做就不行了。

我们需要一个数据结构来区分不同的作用域。我们可以看到，C 语言中的作用域是一个树状的结构，比如：

* 全局
	- fun()
		* ……块（如果有的话）
	- main()
		* if 块
		* else 块

面向对象的语言不太相同，它不是一棵树，而是一片森林。每个类对应一棵树，而且没有全局变量。

我们创建了下面的对象结构来表示 Scope：

```
// 编译过程中产生的变量、函数、类、块，都被称作符号
public abstract class Symbol {
    // 符号的名称
    protected String name = null;

    // 所属作用域
    protected Scope enclosingScope = null;

    // 可见性，比如 public 还是 private
    protected int visibility = 0;

    //Symbol 关联的 AST 节点
    protected ParserRuleContext ctx = null;
}

// 作用域
public abstract class Scope extends Symbol{
    // 该 Scope 中的成员，包括变量、方法、类等。
    protected List<Symbol> symbols = new LinkedList<Symbol>();
}

// 块作用域
public class BlockScope extends Scope{
    ...
}

// 函数作用域
public class Function extends Scope implements FunctionType{
    ...  
}

// 类作用域
public class Class extends Scope implements Type{
    ...
}
```

我们在解释执代码的 AST（抽象语法树）的时候，需要建立起作用域的树结构。对作用域的分析过程是语义分析的一部分。
（在运行 AST 之前，我们还要做语义分析，比如对作用域做分析，让每个变量都能做正确的引用，这样才能正确地执行这个程序。）

## 实现生命期（栈）

随着代码的执行，各个变量的生存期表现如下：
- 进入程序，全局变量逐一生效；
- 进入 main 函数，main 函数里的变量顺序生效；
- 进入 fun 函数，fun 函数里的变量顺序生效；
- 退出 fun 函数，fun 函数里的变量失效；
- 进入 if 语句块，if 语句块里的变量顺序生效；
- 退出 if 语句块，if 语句块里的变量失效；
- 退出 main 函数，main 函数里的变量失效；
- 退出程序，全局变量失效。

代码执行时进入和退出一个个作用域的过程，可以用栈来实现。
每进入一个作用域，就往栈里压入一个数据结构，这个数据结构叫做栈桢（Stack Frame）。
栈桢能够保存当前作用域的所有本地变量的值，当退出这个作用域的时候，这个栈桢就被弹出，里面的变量也就失效了。
栈的机制可以有效地使用内存。

在概念上模仿栈桢：

```
private Stack<StackFrame> stack = new Stack<StackFrame>();

public class StackFrame {
    // 该 frame 所对应的 scope
    Scope scope = null;

    // enclosingScope 所对应的 frame
    StackFrame parentFrame = null;

    // 实际存放变量的地方
    PlayObject object = null;
}

public class PlayObject {
    // 成员变量
    protected Map<Variable, Object> fields = new HashMap<Variable, Object>();
}
```

事实上，Java 中除了基础类型（比如 int）之外的所有对象都是存放在堆里的，因此上面代码中的 PlayObject 对象存放在堆里。这只是模仿。我们将在后端技术部分实现真正意义上的栈桢。

要注意的是，栈的结构和 Scope 的树状结构是不一致的。所以，栈里的上一级栈桢，不一定是 Scope 的父节点。要访问上一级 Scope 中的变量数据，要顺着栈桢的 parentFrame 去找。

## 块级作用域示例

我们已经做好了作用域和栈，下面以 for 语句为例，visit 方法首先为它实现一个栈桢，并加入到栈中。运行完毕之后，再将栈桢弹出。

```
BlockScope scope = (BlockScope) cr.node2Scope.get(ctx);  // 获得 Scope
StackFrame frame = new StackFrame(scope);  // 创建一个栈桢
pushStack(frame);    // 加入栈中

...

// 运行完毕，弹出栈
stack.pop();
```

当我们在代码中需要获取某个变量的值的时候，首先在当前桢中寻找。找不到的话，就到上一级作用域对应的桢中去找：

```
StackFrame f = stack.peek();       // 获取栈顶的桢
PlayObject valueContainer = null;
while (f != null) {
    // 看变量是否属于当前栈桢里
    if (f.scope.containsSymbol(variable)){ 
        valueContainer = f.object;
        break;
    }
    // 从上一级 scope 对应的栈桢里去找  
    f = f.parentFrame;
}
```

## 函数功能示例

与函数有关的语法：

```
// 函数声明
functionDeclaration
    : typeTypeOrVoid? IDENTIFIER formalParameters ('[' ']')*
      functionBody
    ;
// 函数体
functionBody
    : block
    | ';'
    ;
// 类型或 void
typeTypeOrVoid
    : typeType
    | VOID
    ;
// 函数所有参数
formalParameters
    : '(' formalParameterList? ')'
    ;
// 参数列表
formalParameterList
    : formalParameter (',' formalParameter)* (',' lastFormalParameter)?
    | lastFormalParameter
    ;
// 单个参数
formalParameter
    : variableModifier* typeType variableDeclaratorId
    ;
// 可变参数数量情况下，最后一个参数
lastFormalParameter
    : variableModifier* typeType '...' variableDeclaratorId
    ;
// 函数调用    
functionCall
    : IDENTIFIER '(' expressionList? ')'
    | THIS '(' expressionList? ')'
    | SUPER '(' expressionList? ')'
    ;
```

在函数里，我们还要考虑一个额外的因素：参数。在函数内部，参数变量跟普通的本地变量在使用时没什么不同，在运行期，它们也像本地变量一样，保存在栈桢里。

我们设计一个对象来代表函数的定义，它包括参数列表和返回值的类型：

```
public class Function extends Scope implements FunctionType{
    // 参数
    protected List<Variable> parameters = new LinkedList<Variable>();

    // 返回值
    protected Type returnType = null;
    
    ...
}
```

在调用函数时，实际上做了三步工作：
1. 建立一个栈桢；
2. 计算所有参数的值，并放入栈桢；
3. 执行函数声明中的函数体。

相关代码：
```
// 函数声明的 AST 节点
FunctionDeclarationContext functionCode = (FunctionDeclarationContext) function.ctx;

// 创建栈桢
functionObject = new FunctionObject(function);
StackFrame functionFrame = new StackFrame(functionObject);

// 计算实参的值
List<Object> paramValues = new LinkedList<Object>();
if (ctx.expressionList() != null) {
    for (ExpressionContext exp : ctx.expressionList().expression()) {
        Object value = visitExpression(exp);
        if (value instanceof LValue) {
            value = ((LValue) value).getValue();
        }
        paramValues.add(value);
    }
}

// 根据形参的名称，在栈桢中添加变量
if (functionCode.formalParameters().formalParameterList() != null) {
    for (int i = 0; i < functionCode.formalParameters().formalParameterList().formalParameter().size(); i++) {
        FormalParameterContext param = functionCode.formalParameters().formalParameterList().formalParameter(i);
        LValue lValue = (LValue) visitVariableDeclaratorId(param.variableDeclaratorId());
        lValue.setValue(paramValues.get(i));
    }
}

// 调用方法体
rtn = visitFunctionDeclaration(functionCode);

// 运行完毕，弹出栈
stack.pop();
```

本课程的 [GitHub 项目](https://github.com/RichardGong/PlayWithCompiler)