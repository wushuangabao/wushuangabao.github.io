# 【设计模式】模板模式

```
tags:
  - 学习
  - 设计模式
categories:
  - 编程艺术
toc: false
date: 2020-06-30 15:41:22
```

摘要：介绍模板模式的原理、实现、作用，并将其与“回调”比较。


## 原理与实现

模板模式英文全称 Template Method Design Pattern。在 GoF 的《设计模式》一书中，它是这么定义的：
> Define the skeleton of an algorithm in an operation, deferring some steps to subclasses. Template Method lets subclasses redefine certain steps of an algorithm without changing the algorithm’s structure.

翻译成中文就是：模板方法模式在一个方法中定义一个算法骨架，并将某些步骤推迟到子类中实现。模板方法模式可以让子类在不改变算法整体结构的情况下，重新定义算法中的某些步骤。

这里的“算法”，我们可以理解为广义上的“业务逻辑”，并不特指数据结构和算法中的“算法”。**算法骨架就是“模板”**，包含算法骨架的方法就是“模板方法”，这也是模板方法模式名字的由来。

一个简单的代码实现示例：
```
public abstract class AbstractClass {
  public final void templateMethod() { //定义为 final，是为了避免子类重写它。
    //...
    method1();
    //...
    method2();
    //...
  }
  
  protected abstract void method1(); //定义为 abstract，是为了强迫子类去实现。
  protected abstract void method2();
}

public class ConcreteClass1 extends AbstractClass {
  @Override
  protected void method1() {
    //...
  }
  
  @Override
  protected void method2() {
    //...
  }
}

public class ConcreteClass2 extends AbstractClass {
  @Override
  protected void method1() {
    //...
  }
  
  @Override
  protected void method2() {
    //...
  }
}

AbstractClass demo = ConcreteClass1();
demo.templateMethod();
```

## 模板模式的作用

### 复用

模板模式把一个算法中**不变的流程**抽象到父类的模板方法 templateMethod() 中，将可变的部分 method1()、method2() 留给子类 ContreteClass1 和 ContreteClass2 来实现。

所有的子类都可以复用父类中模板方法定义的流程代码。

### 扩展

这里所说的扩展，并不是指代码的扩展性，而是指**框架**的扩展性，有点类似**控制反转**（可以在本站搜索关键词“控制反转”）。

基于这个作用，模板模式常用在框架的开发中，让框架用户可以在不修改框架源码的情况下，定制化框架的功能。

> 控制反转就是：在没有使用框架之前，程序员自己控制整个程序的执行；在使用框架之后，整个程序的执行流程通过框架来控制，流程的控制权从程序员“反转”给了框架。

#### 以Java Servlet为例

Java Web 项目常用的开发框架是 SpringMVC。利用它，我们只需要关注业务代码的编写，底层的原理几乎不会涉及。

如果抛开这些高级框架来开发 Web 项目，必然会用到 Servlet。实际上，使用比较底层的 Servlet 来开发 Web 项目也不难。只需要定义一个继承 HttpServlet 的类，并且重写其中的 doGet() 或 doPost() 方法，来分别处理 get 和 post 请求。
具体的代码示例如下所示：
```
public class HelloServlet extends HttpServlet {
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    this.doPost(req, resp);
  }
  
  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    resp.getWriter().write("Hello World.");
  }
}
```

还需要在配置文件 web.xml 中做如下配置（Tomcat、Jetty 等 Servlet 容器在启动的时候，会自动加载这个配置文件中的 URL 和 Servlet 之间的映射关系）：
```
<servlet>
    <servlet-name>HelloServlet</servlet-name>
    <servlet-class>com.xzg.cd.HelloServlet</servlet-class>
</servlet>

<servlet-mapping>
    <servlet-name>HelloServlet</servlet-name>
    <url-pattern>/hello</url-pattern>
</servlet-mapping>
```

当我们在浏览器中输入网址（比如，http://127.0.0.1:8080/hello ）的时候，Servlet 容器会接收到相应的请求，并且根据 URL 和 Servlet 之间的映射关系，找到相应的 Servlet（HelloServlet），然后执行它的 service() 方法。service() 方法定义在父类 HttpServlet 中：
```
public void service(ServletRequest req, ServletResponse res)
    throws ServletException, IOException
{
    HttpServletRequest  request;
    HttpServletResponse response;
    if (!(req instanceof HttpServletRequest &&
            res instanceof HttpServletResponse)) {
        throw new ServletException("non-HTTP request or response");
    }
    request = (HttpServletRequest) req;
    response = (HttpServletResponse) res;
    service(request, response);
}

protected void service(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
{
    String method = req.getMethod();
    if (method.equals(METHOD_GET)) {
        long lastModified = getLastModified(req);
        if (lastModified == -1) {
            // servlet doesn't support if-modified-since, no reason
            // to go through further expensive logic
            doGet(req, resp);
        } else {
            long ifModifiedSince = req.getDateHeader(HEADER_IFMODSINCE);
            if (ifModifiedSince < lastModified) {
                // If the servlet mod time is later, call doGet()
                // Round down to the nearest second for a proper compare
                // A ifModifiedSince of -1 will always be less
                maybeSetLastModified(resp, lastModified);
                doGet(req, resp);
            } else {
                resp.setStatus(HttpServletResponse.SC_NOT_MODIFIED);
            }
        }
    } else if (method.equals(METHOD_HEAD)) {
        long lastModified = getLastModified(req);
        maybeSetLastModified(resp, lastModified);
        doHead(req, resp);
    } else if (method.equals(METHOD_POST)) {
        doPost(req, resp);
    } else if (method.equals(METHOD_PUT)) {
        doPut(req, resp);
    } else if (method.equals(METHOD_DELETE)) {
        doDelete(req, resp);
    } else if (method.equals(METHOD_OPTIONS)) {
        doOptions(req,resp);
    } else if (method.equals(METHOD_TRACE)) {
        doTrace(req,resp);
    } else {
        String errMsg = lStrings.getString("http.method_not_implemented");
        Object[] errArgs = new Object[1];
        errArgs[0] = method;
        errMsg = MessageFormat.format(errMsg, errArgs);
        resp.sendError(HttpServletResponse.SC_NOT_IMPLEMENTED, errMsg);
    }
}
```

我们可以看出，HttpServlet 的 service() 方法就是一个模板方法，它实现了整个 HTTP 请求的执行流程，doGet()、doPost() 是模板中可以由子类来定制的部分。实际上，这就相当于 Servlet 框架提供了一个扩展点（doGet()、doPost() 方法），让框架用户在不修改 Servlet 框架源码的情况下，将业务代码通过扩展点镶嵌到框架中执行。

## 模板模式 VS 回调

相对于普通的函数调用来说，回调（Callback）是一种双向调用关系。A 类事先**注册**某个“回调函数” F 到 B 类（C语言中就是传递函数指针）。A 类在调用 B 类的 P 函数的时候，B 类反过来调用 A 类注册给它的 F 函数。**A 调用 B，B 反过来又调用 A，这种调用机制就叫作“回调”。**

> Hook 就是 Callback 的一种应用。Callback 更侧重语法机制的描述，Hook 更加侧重应用场景的描述。

回调可以分为同步回调和异步回调（或者延迟回调）。同步回调指在函数返回之前执行回调函数；异步回调指的是在函数返回之后执行回调函数。

从应用场景上来看，**同步回调看起来更像模板模式**（都是在一个大的算法骨架中，自由替换其中的某个步骤，起到代码复用和扩展的目的），**异步回调看起来更像观察者模式**。

从代码实现上来看，回调和模板模式完全不同。回调基于**组合关系**来实现，把一个对象传递给另一个对象，是一种对象之间的关系；模板模式基于**继承关系**来实现，子类重写父类的抽象方法，是一种类之间的关系。

组合优于继承，这里也不例外。在代码实现上，回调相对于模板模式更加灵活，主要体现在下面几点：
- 像 Java 这种只支持单继承的语言，基于模板模式编写的子类，已经继承了一个父类，不再具有继承的能力。
- 回调可以使用匿名类来创建回调对象，可以不用事先定义类；而模板模式针对不同的实现都要定义不同的子类。
- 如果某个模板类中定义了多个模板方法（抽象方法），那即便我们只用到其中的一个模板方法，子类也必须实现所有的抽象方法。而回调就更加灵活，我们只需要往用到的模板方法中注入回调对象即可。

> 但是滥用回调，会使代码难以阅读（“回调地狱”）。所以复杂的场景还是适合用模板模式。
