# 【设计模式】观察者模式

```
tags:
  - 学习
  - 设计模式
categories:
  - 编程艺术

date: 2020-06-29 11:43:44
```

摘要：介绍了观察者模式的原理、不同应用场景，介绍了 EventBus 框架。


## 原理

观察者模式（Observer Design Pattern）也被称为发布订阅模式（Publish-Subscribe Design Pattern）。在 GoF 的《设计模式》一书中，它的定义是这样的：
> Define a one-to-many dependency between objects so that when one object changes state, all its dependents are notified and updated automatically.

翻译成中文就是：在对象之间定义一个**一对多的依赖**，当一个对象**状态改变**的时候，所有依赖的对象都会**自动收到通知**。

被依赖的对象（Observable）和依赖的对象（Observer）不管怎么称呼，只要应用场景符合刚刚给出的定义，都可以看做 观察者模式。

观察者模式是一个比较抽象的模式，根据不同的应用场景和需求，有完全不同的实现方式。最经典的一种实现方式如下：
```
public interface Subject {
  void registerObserver(Observer observer);
  void removeObserver(Observer observer);
  void notifyObservers(Message message);
}

public interface Observer {
  void update(Message message);
}

public class ConcreteSubject implements Subject {
  private List<Observer> observers = new ArrayList<Observer>();

  @Override
  public void registerObserver(Observer observer) {
    observers.add(observer);
  }

  @Override
  public void removeObserver(Observer observer) {
    observers.remove(observer);
  }

  @Override
  public void notifyObservers(Message message) {
    for (Observer observer : observers) {
      observer.update(message);
    }
  }

}

public class ConcreteObserverOne implements Observer {
  @Override
  public void update(Message message) {
    //TODO: 获取消息通知，执行自己的逻辑...
    System.out.println("ConcreteObserverOne is notified.");
  }
}

public class ConcreteObserverTwo implements Observer {
  @Override
  public void update(Message message) {
    //TODO: 获取消息通知，执行自己的逻辑...
    System.out.println("ConcreteObserverTwo is notified.");
  }
}

public class Demo {
  public static void main(String[] args) {
    ConcreteSubject subject = new ConcreteSubject();
    subject.registerObserver(new ConcreteObserverOne());
    subject.registerObserver(new ConcreteObserverTwo());
    subject.notifyObservers(new Message());
  }
}
```

设计模式要干的事情就是解耦：
- 创建型模式是将创建和使用代码解耦
- 结构型模式是将不同功能代码解耦
- 行为型模式是将不同的行为代码解耦

具体到观察者模式，它是将观察者和被观察者代码解耦。

借助设计模式，我们利用更好的代码结构，将一大坨代码拆分成职责更单一的小类，让其满足开闭原则、高内聚松耦合等特性，以此来控制和应对代码的复杂性，提高代码的可扩展性。

### 实际案例

假设我们在开发一个 P2P 投资理财系统，用户注册成功之后，我们会给用户发放投资体验金。代码实现大致是：
```
public class UserController {
  private UserService userService; //依赖注入
  private PromotionService promotionService; //依赖注入

  public Long register(String telephone, String password) {
    // 省略输入参数的校验代码
    // 省略userService.register()异常的try-catch代码
    long userId = userService.register(telephone, password);
    promotionService.issueNewUserExperienceCash(userId);
    return userId;
  }
}
```

虽然注册接口做了两件事情，注册和发放体验金，违反单一职责原则，但是，如果没有扩展和修改的需求，现在的代码实现是可以接受的。如果非得用观察者模式，就需要引入更多的类和更加复杂的代码结构，反倒是一种过度设计。

有两个问题是观察者模式的用武之地：
- 如果需求频繁变动，比如，用户注册成功之后，不再发放体验金，而是改为发放优惠券，并且还要给用户发送一封“欢迎注册成功”的站内信。这种情况下，我们就需要频繁地修改 register() 函数中的代码，违反开闭原则。
- 如果注册成功之后需要执行的后续操作越来越多，那 register() 函数的逻辑会变得越来越复杂，也就影响到代码的可读性和可维护性。

利用观察者模式重构后的代码：
```
public interface RegObserver {
  void handleRegSuccess(long userId);
}

public class RegPromotionObserver implements RegObserver {
  private PromotionService promotionService; // 依赖注入

  @Override
  public void handleRegSuccess(long userId) {
    promotionService.issueNewUserExperienceCash(userId);
  }
}

public class RegNotificationObserver implements RegObserver {
  private NotificationService notificationService;

  @Override
  public void handleRegSuccess(long userId) {
    notificationService.sendInboxMessage(userId, "Welcome...");
  }
}

public class UserController {
  private UserService userService; // 依赖注入
  private List<RegObserver> regObservers = new ArrayList<>();

  // 一次性设置好，之后也不可能动态的修改
  public void setRegObservers(List<RegObserver> observers) {
    regObservers.addAll(observers);
  }

  public Long register(String telephone, String password) {
    //省略输入参数的校验代码
    //省略userService.register()异常的try-catch代码
    long userId = userService.register(telephone, password);

    for (RegObserver observer : regObservers) {
      observer.handleRegSuccess(userId);
    }

    return userId;
  }
}
```

当我们需要添加新的观察者的时候，UserController 类的 register() 函数完全不需要修改，只需要再添加一个实现了 RegObserver 接口的类，并且通过 setRegObservers() 函数将它注册到 UserController 类中即可。

当我们把发送体验金替换为发送优惠券的时候，需要修改 RegPromotionObserver 类中 handleRegSuccess() 函数的代码，这虽然还是违反开闭原则，但是相对于 register() 函数来说，handleRegSuccess() 函数的逻辑要简单很多，修改更不容易出错，引入 bug 的风险更低。

## 基于不同应用场景的不同实现方式

观察者模式的应用场景非常广泛，小到代码层面的解耦，大到架构层面的系统解耦，再或者一些产品的设计思路，都有这种模式的影子。比如，邮件订阅、RSS Feeds，本质上都是观察者模式。

<label style="color:red">不同的应用场景和需求下，这个模式也有截然不同的实现方式</label>——有**同步阻塞**的实现方式，也有**异步非阻塞**的实现方式；有**进程内**的实现方式，也有**跨进程**的实现方式。

### 案例改进：异步非阻塞实现

前面的案例是一种同步阻塞的实现方式。如果注册接口是一个调用比较频繁的接口，对性能非常敏感，希望接口的响应时间尽可能短，那我们可以将同步阻塞的实现方式改为异步非阻塞的实现方式，减少响应时间。

具体来讲，就是启动新的线程来执行观察者的 handleRegSuccess() 函数。这样 userController.register() 函数就不需要等到所有的 handleRegSuccess() 函数都执行完成之后才返回结果给客户端，从执行 3 个 SQL 语句减少到只需要执行 1 个 SQL 语句，响应时间粗略来讲减少为原来的 1/3。

有两种实现方式：
1. 在每个 handleRegSuccess() 函数中创建一个新的线程执行代码逻辑；
2. 在 UserController 的 register() 函数中使用线程池来执行每个观察者的 handleRegSuccess() 函数。

两种方式各自的缺点：
1. 频繁地创建和销毁线程比较耗时，并且并发线程数无法控制，创建过多的线程会导致堆栈溢出。
2. 尽管利用了线程池解决了第一种实现方式的问题，但线程池、异步执行逻辑都耦合在了 register() 函数中，增加了这部分业务代码的维护成本。

## EventBus框架

框架的作用有：隐藏实现细节，降低开发难度，做到代码复用，解耦业务与非业务代码，让程序员聚焦业务开发。针对异步非阻塞观察者模式，我们也可以将它抽象成框架来达到这样的效果，这个框架就是 EventBus。

> EventBus 翻译为“事件总线”，它提供了实现观察者模式的骨架代码。我们可以基于此框架，非常容易地在自己的业务场景中实现观察者模式，不需要从零开始开发。其中，Google Guava EventBus 就是一个比较著名的 EventBus 框架，它不仅仅支持异步非阻塞模式，同时也支持同步阻塞模式。

前一节的案例，假如再加上更加极端的需求：
- 要在同步阻塞和异步非阻塞之间灵活切换，不要不停地修改 UserController 的代码。
- 项目中不止一个业务模块需要用到异步非阻塞观察者模式，代码实现要做到复用。

我们用 Guava EventBus 重新实现一下，代码如下：
```
public class UserController {
  private UserService userService; // 依赖注入

  private EventBus eventBus;
  private static final int DEFAULT_EVENTBUS_THREAD_POOL_SIZE = 20;

  public UserController() {
    //eventBus = new EventBus(); // 同步阻塞模式
    eventBus = new AsyncEventBus(Executors.newFixedThreadPool(DEFAULT_EVENTBUS_THREAD_POOL_SIZE)); // 异步非阻塞模式
  }

  public void setRegObservers(List<Object> observers) {
    for (Object observer : observers) {
      eventBus.register(observer);
    }
  }

  public Long register(String telephone, String password) {
    //省略输入参数的校验代码
    //省略userService.register()异常的try-catch代码
    long userId = userService.register(telephone, password);

    eventBus.post(userId);

    return userId;
  }
}

public class RegPromotionObserver {
  private PromotionService promotionService; // 依赖注入

  @Subscribe
  public void handleRegSuccess(long userId) {
    promotionService.issueNewUserExperienceCash(userId);
  }
}

public class RegNotificationObserver {
  private NotificationService notificationService;

  @Subscribe
  public void handleRegSuccess(long userId) {
    notificationService.sendInboxMessage(userId, "...");
  }
}
```

EventBus 使用 post() 函数给 Observer 发送消息（在 EventBus 中消息被称作事件 event）。基于 EventBus，我们不需要定义 Observer 接口，任意类型的对象都可以注册到 EventBus 中，通过 @Subscribe 注解来标明类中哪个函数可以接收被观察者发送的消息。

### Guava EventBus 的几个主要的类和函数

**EventBus、AsyncEventBus：**
Guava EventBus 对外暴露的所有可调用接口，都封装在 EventBus 类中。其中，EventBus 实现了同步阻塞的观察者模式，AsyncEventBus 继承自 EventBus，提供了异步非阻塞的观察者模式。

**register() 函数：**
EventBus 类提供了 register() 函数用来注册观察者。它可以接受任何类型（Object）的观察者。而在经典的观察者模式的实现中，register() 函数必须接受实现了同一 Observer 接口的类对象。

**unregister() 函数：**
相对于 register() 函数，unregister() 函数用来从 EventBus 中删除某个观察者。

**post() 函数：**
EventBus 类提供了 post() 函数，用来给观察者发送消息：
```
public void post(Object event);
```

跟经典的观察者模式的不同之处在于，当我们调用 post() 函数发送消息的时候，并非把消息发送给所有的观察者，而是发送给**可匹配**的观察者。所谓可匹配指的是，能接收的消息类型是发送消息（post 函数定义中的 event）类型的父类。

**@Subscribe 注解：**
EventBus 通过 @Subscribe 注解来标明，某个函数能接收哪种类型的消息：
```
public DObserver {
  //...省略其他属性和方法...
  
  @Subscribe
  public void f1(PMsg event) { //... }
  
  @Subscribe
  public void f2(QMsg event) { //... }
}
```

当通过 register() 函数将 DObserver 类对象注册到 EventBus 的时候，EventBus 会根据 @Subscribe 注解找到 f1() 和 f2()，并且将两个函数能接收的消息类型记录下来（PMsg->f1，QMsg->f2）。
当我们通过 post() 函数发送消息（比如 QMsg 消息）的时候，EventBus 会通过之前的记录（QMsg->f2），调用相应的函数（f2）。