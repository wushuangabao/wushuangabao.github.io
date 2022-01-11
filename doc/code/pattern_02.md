# 【设计模式】代理模式

```
tags:
  - 学习
  - 设计模式
categories:
  - 编程艺术
toc: false
date: 2020-06-18 14:41:49
```

摘要：剖析代理模式的原理，介绍如何使用组合、继承两种方式实现静态代理；介绍动态代理的原理；举例说明代理模式的使用场景；分析代理、装饰器、适配器、桥接4种模式的区别。


## 代理模式的原理

代理模式（Proxy Design Pattern）的定义：
> 在**不改变原始类**（或叫被代理类）的情况下，通过引入代理类来**给原始类附加功能**。

举个例子，我们开发了一个性能计数器 MetricsCollector 类，用来收集接口请求的原始数据，比如访问时间、处理时长等。
在业务系统中，采用如下方式使用这个 MetricsCollector 类：
```
public class UserController {
  //...省略其他属性和方法...
  private MetricsCollector metricsCollector; // 依赖注入

  public UserVo login(String telephone, String password) {
    long startTimestamp = System.currentTimeMillis();

    // ... 省略login逻辑...

    long endTimeStamp = System.currentTimeMillis();
    long responseTime = endTimeStamp - startTimestamp;
    RequestInfo requestInfo = new RequestInfo("login", responseTime, startTimestamp);
    metricsCollector.recordRequest(requestInfo);

    //...返回UserVo数据...
  }

  public UserVo register(String telephone, String password) {
    long startTimestamp = System.currentTimeMillis();

    // ... 省略register逻辑...

    long endTimeStamp = System.currentTimeMillis();
    long responseTime = endTimeStamp - startTimestamp;
    RequestInfo requestInfo = new RequestInfo("register", responseTime, startTimestamp);
    metricsCollector.recordRequest(requestInfo);

    //...返回UserVo数据...
  }
}
```

这种写法存在两个问题：
1. <label style="color:red">性能计数器**框架代码**侵入到**业务代码**中</label>，跟业务代码高度耦合。如果未来需要替换这个框架，那替换的成本会比较大。
2. 收集接口请求的代码跟业务代码无关，本就不应该放到一个类中。<label style="color:red">业务类最好职责更加单一</label>，只聚焦业务处理。

为解决这些问题，可以这样使用代理模式：
- 代理类 UserControllerProxy 和原始类 UserController 实现相同的接口 IUserController。
- 原始类 UserController 类只负责业务功能。
- 代理类 UserControllerProxy 负责**在业务代码执行前后附加其他逻辑代码**，并通过委托的方式**调用原始类来执行业务代码**。

## 代理模式的实现

具体的代码实现如下所示：
```
public interface IUserController {
  UserVo login(String telephone, String password);
  UserVo register(String telephone, String password);
}

public class UserController implements IUserController {
  //...省略其他属性和方法...

  @Override
  public UserVo login(String telephone, String password) {
    //...省略login逻辑...返回UserVo数据...
  }

  @Override
  public UserVo register(String telephone, String password) {
    //...省略register逻辑...返回UserVo数据...
  }
}

public class UserControllerProxy implements IUserController {
  private MetricsCollector metricsCollector;
  private UserController userController;

  public UserControllerProxy(UserController userController) {
    this.userController = userController;
    this.metricsCollector = new MetricsCollector();
  }

  @Override
  public UserVo login(String telephone, String password) {
    long startTimestamp = System.currentTimeMillis();

    // 委托
    UserVo userVo = userController.login(telephone, password);

    long endTimeStamp = System.currentTimeMillis();
    long responseTime = endTimeStamp - startTimestamp;
    RequestInfo requestInfo = new RequestInfo("login", responseTime, startTimestamp);
    metricsCollector.recordRequest(requestInfo);

    return userVo;
  }

  @Override
  public UserVo register(String telephone, String password) {
    // 省略
  }
}

//UserControllerProxy使用举例
//因为原始类和代理类实现相同的接口，是基于接口而非实现编程
//将UserController类对象替换为UserControllerProxy类对象，不需要改动太多代码
IUserController userController = new UserControllerProxy(new UserController());
```

一般情况下，我们让代理类和原始类实现同样的接口，然后使用<label style="color:red">**组合**</label>的方式（让代理类委托原始类来执行业务）。
但是，**有时候原始类并没有定义接口，并且原始类代码并不是我们开发维护的。**
在这种情况下，我们可以通过让代理类<label style="color:red">**继承**</label>原始类的方法来实现代理模式。代码如下：
```
public class UserControllerProxy extends UserController {
  private MetricsCollector metricsCollector;

  public UserControllerProxy() {
    this.metricsCollector = new MetricsCollector();
  }

  public UserVo login(String telephone, String password) {
    long startTimestamp = System.currentTimeMillis();

    UserVo userVo = super.login(telephone, password);

    long endTimeStamp = System.currentTimeMillis();
    long responseTime = endTimeStamp - startTimestamp;
    RequestInfo requestInfo = new RequestInfo("login", responseTime, startTimestamp);
    metricsCollector.recordRequest(requestInfo);

    return userVo;
  }

  public UserVo register(String telephone, String password) {
    // 省略
  }
}

//UserControllerProxy使用举例
UserController userController = new UserControllerProxy();
```

## 动态代理的原理

（上面的）静态的代理模式有个毛病：它需要针对每个原始类都创建一个代理类，并且每个代理类中的代码都有点像“重复”代码，增加了开发和维护的成本。

我们可以通过动态代理（Dynamic Proxy）来解决。
我们不事先为每个原始类编写代理类，而是在运行的时候**动态地创建**代理类，然后在系统中用代理类替换掉原始类。

Java 语言本身就提供了动态代理的语法（实际上底层依赖的是 Java 的反射语法）。

> 反射是程序可以访问、检测和修改它本身状态或行为的一种能力。例如，程序在运行过程中，可以通过类名称字符串来创建对象，并获取类中申明的成员变量和方法。

问题：**没有反射机制的 C++ 如何实现动态代理？**

## 代理模式的应用场景

代理模式常用在业务系统中开发一些非功能性需求，比如：监控、统计、鉴权、限流、事务、幂等、日志。
我们将这些附加功能与业务功能解耦，放到代理类统一处理，让程序员只需要关注业务方面的开发。

除此之外，代理模式还可以用在 RPC、缓存等应用场景中。

> RPC 框架也可以看作一种代理模式，GoF 的《设计模式》一书中把它称作**远程代理**。通过远程代理，将网络通信、数据编解码等细节隐藏起来。客户端在使用 RPC 服务的时候，就像使用本地函数一样，无需了解跟服务器交互的细节。RPC 服务的开发者也只需要开发业务逻辑，就像开发本地使用的函数一样，不需要关注跟客户端的交互细节。

> 有时要给每个查询需求都开发两个不同的接口，一个支持缓存查询，一个支持实时查询。但是，这样做显然增加了开发成本，而且会让代码看起来非常臃肿（接口个数成倍增加），也不方便缓存接口的集中管理（增加、删除缓存接口）、集中配置（比如配置每个接口缓存过期时间）。使用动态代理：从配置文件中加载需要支持缓存的接口，以及相应的缓存策略（比如过期时间）等。

## 代理、装饰器、适配器、桥接4种模式的区别

代理、桥接、装饰器、适配器，这 4 种模式是比较常用的结构型设计模式，代码结构非常相似。笼统来说，它们都可以称为 Wrapper（包装）模式，也就是通过 Wrapper 类二次封装原始类。

尽管代码结构相似，但这 4 种设计模式的用意完全不同，也就是说要解决的问题、应用场景不同，这也是它们的主要区别。
- 代理模式：代理模式在不改变原始类接口的条件下，为原始类定义一个代理类，主要目的是控制访问，而非加强功能，这是它跟装饰器模式最大的不同。
- 装饰器模式：装饰者模式在不改变原始类接口的情况下，对原始类功能进行增强，并且支持多个装饰器的嵌套使用。
- 适配器模式：适配器模式是一种事后的补救策略。适配器提供跟原始类不同的接口，而代理模式、装饰器模式提供的都是跟原始类相同的接口。
- 桥接模式：桥接模式的目的是将接口部分和实现部分分离，从而让它们可以较为容易、也相对独立地加以改变。